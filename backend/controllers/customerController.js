// controllers/customerController.js

const Customer = require('../models/CustomerModel');
const Product = require('../models/ProductModel');
const { USER_ROLES } = require('../utils/constants');
const { createLog } = require('../utils/AuditService');
const mongoose = require('mongoose'); // Import mongoose for ID validation

// --- Customer Creation & Retrieval ---

const registerCustomer = async (req, res) => {
    const { name, phone, email } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ msg: 'Customer name is required and must be a valid string.' });
    }

    try {
        // Basic check for existing customer by phone or email to prevent duplicates
        const existingCustomer = await Customer.findOne({
            $or: [{ phone }, { email: email.toLowerCase() }]
        });

        if (existingCustomer) {
            // Return a 409 Conflict if a customer with the same phone/email exists
            return res.status(409).json({ msg: 'A customer with this phone number or email already exists.', customer: existingCustomer });
        }

        const customer = await Customer.create({ name, phone, email: email ? email.toLowerCase() : undefined });

        // Auditing (Request 1: Customer Registered)
        await createLog('CUSTOMER_REGISTERED', {
            customerName: customer.name,
            phone: customer.phone
        }, req.user, customer._id, 'Customer');

        res.status(201).json({ customer });
    } catch (error) {
        console.error('Error registering customer:', error);
        // Handle potential validation errors from the model
        if (error.name === 'ValidationError') {
            return res.status(400).json({ msg: 'Validation failed: ' + error.message });
        }
        res.status(500).json({ msg: 'Internal Server Error during registration.' });
    }
};

const getCustomerDetails = async (req, res) => {
    const { id } = req.params;

    // FIX 1: Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ msg: 'Invalid customer ID format.' });
    }

    try {
        const customer = await Customer.findById(id).populate('bottleWithdrawals.product', 'name');
        if (!customer) {
            return res.status(404).json({ msg: 'Customer not found.' });
        }

        // Calculate equivalent value for points (Example: 1 point = $0.10)
        // FIX 2: Ensure totalPoints is treated as a number
        const safeTotalPoints = Number(customer.totalPoints) || 0;
        const equivalentValue = safeTotalPoints * 0.10;

        res.status(200).json({
            customer: {
                ...customer.toObject(),
                pointsEquivalent: equivalentValue.toFixed(0)
            }
        });
    } catch (error) {
        console.error('Error fetching customer details:', error);
        res.status(500).json({ msg: 'Internal Server Error.' });
    }
};

// --- Bottle Withdrawal Management ---

const withdrawBottle = async (req, res) => {
    // CORRECTION : Récupérer customerId du corps de la requête (req.body)
    const { customerId, withdrawalItemId, quantity } = req.body; 
    const user = req.user;

    // Ajout de la vérification de customerId
    if (!customerId || !withdrawalItemId || !quantity || quantity <= 0) {
        return res.status(400).json({ msg: 'Missing customer ID, invalid withdrawal item ID, or quantity.' });
    }

    // Helper to calculate remaining quantity (must be defined in scope or imported)
    const getRemainingQuantity = (withdrawal) => withdrawal.savedQuantity - withdrawal.withdrawnQuantity;

    try {
        // Find the customer and the specific withdrawal item in one query
        const customer = await Customer.findOne({
            _id: customerId, // customerId est maintenant défini
            'bottleWithdrawals._id': withdrawalItemId
        });

        if (!customer) {
            return res.status(404).json({ msg: 'Customer or saved bottle item not found.' });
        }

        const withdrawalItem = customer.bottleWithdrawals.id(withdrawalItemId);
        const remaining = getRemainingQuantity(withdrawalItem);

        if (quantity > remaining) {
            return res.status(400).json({ msg: `Cannot withdraw ${quantity}. Only ${remaining} remaining.` });
        }

        // Determine log action
        const action = (remaining - quantity === 0) ? 'WITHDRAWN_FULL' : 'WITHDRAWN_PARTIAL';

        // Use $inc and $push to atomically update the nested document
        const updateResult = await Customer.updateOne(
            {
                _id: customerId,
                'bottleWithdrawals._id': withdrawalItemId
            },
            {
                $inc: { 'bottleWithdrawals.$.withdrawnQuantity': quantity },
                $push: {
                    'bottleWithdrawals.$.withdrawalLog': {
                        action: action,
                        quantity: quantity,
                        // Ensure required fields for the log are present
                        userId: user._id,
                        userName: user.name,
                    }
                }
            }
        );

        if (updateResult.modifiedCount === 0) {
            return res.status(500).json({ msg: 'Failed to update withdrawal record (check database state).' });
        }

        // Assurez-vous que createLog est importé ou défini
        await createLog('BOTTLE_WITHDRAWN', {
            customerId: customerId,
            productId: withdrawalItem.product,
            quantity: quantity
        }, user, customerId, 'Customer');

        res.status(200).json({ msg: `${quantity} unit(s) of ${withdrawalItem.name || 'bottle'} successfully withdrawn. Remaining: ${remaining - quantity}.` });
    } catch (error) {
        console.error('Error withdrawing bottle:', error);
        res.status(500).json({ msg: 'Internal Server Error during withdrawal.', details: error.message });
    }
};

// --- Credit Adjustment (Manager only) ---

const adjustCredit = async (req, res) => {
    // Helper function is not necessary here but kept for context if you use it in the response formatting.
    // const formatCurrency = (amount) => `$${Number(amount).toFixed(0)}`; 

    // FIX 6: Authority Check and ID Validation
    if (req.user.role !== USER_ROLES.MANAGER && req.user.role !== USER_ROLES.ADMIN) {
        return res.status(403).json({ msg: 'Unauthorized to adjust credit.' });
    }
    const { customerId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
        return res.status(400).json({ msg: 'Invalid customer ID format.' });
    }

    // FIX 7: Comprehensive validation for adjustmentAmount
    const { adjustmentAmount, reason, billIdToPayOff } = req.body;

    if (typeof adjustmentAmount !== 'number' || isNaN(adjustmentAmount) || adjustmentAmount === 0) {
        // The adjustment amount can be positive (for credit increase/debt reduction) 
        // OR negative (for debt increase/credit reduction).
        return res.status(400).json({ msg: 'A valid non-zero adjustment amount is required.' });
    }

    try {
        // Find customer to get old balance and ensure existence
        const customer = await Customer.findById(customerId).select('creditBalance name');
        if (!customer) {
            return res.status(404).json({ msg: 'Customer not found.' });
        }
        const oldBalance = customer.creditBalance;

        // FIX 8: Atomic Update using $inc
        const updatedCustomer = await Customer.findByIdAndUpdate(
            customerId,
            { $inc: { creditBalance: adjustmentAmount } },
            { new: true, runValidators: true }
        ).select('name phone email creditBalance');

        // Determine the type of adjustment for logging
        let logType = '';
        let logData = {};

        if (adjustmentAmount > 0) {
            logType = 'CUSTOMER_CREDIT_INCREASE';
            logData.action = 'Credit Top-up / Debt Reduction';
        } else {
            logType = 'CUSTOMER_DEBT_INCREASE';
            logData.action = 'Debt Increase / Credit Reduction';
        }

        // Auditing the Credit Adjustment
        await createLog(logType, {
            customerName: updatedCustomer.name,
            adjustmentAmount: adjustmentAmount,
            reason: reason || 'Manual adjustment',
            billPaidOff: billIdToPayOff || 'N/A',
            oldBalance: oldBalance,
            newBalance: updatedCustomer.creditBalance,
        }, req.user, updatedCustomer._id, 'Customer');

        res.status(200).json({
            msg: `Customer credit balance adjusted successfully. Change: ${adjustmentAmount.toFixed(0)}`,
            customer: updatedCustomer
        });

    } catch (error) {
        console.error('Error updating customer credit:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ msg: 'Validation failed during credit update.' });
        }
        return res.status(500).json({ msg: 'Internal Server Error updating the credit' });
    }
};


const getCustomersInDebt = async (req, res) => {
    try {
        // Find customers where creditBalance is less than 0 (i.e., they owe money)
        const customersInDebt = await Customer.find({ creditBalance: { $lt: 0 } })
            .select('name phone creditBalance')
            .sort({ creditBalance: 1 });

        // Calculate the total outstanding debt
        // FIX 9: Sum the absolute value of the negative balances for the total debt figure
        const totalDebt = customersInDebt.reduce((acc, customer) => acc + Math.abs(customer.creditBalance), 0);

        res.status(200).json({
            customers: customersInDebt,
            totalOutstandingDebt: totalDebt, // This is the positive amount owed by customers
            totalCount: customersInDebt.length
        });
    } catch (error) {
        console.error('Error fetching customers in debt:', error);
        res.status(500).json({ msg: 'Failed to fetch customer debt data.' });
    }
};

const getAllCustomers = async (req, res) => {
    try {
        // FIX 10: Select relevant fields for a list/table view
        const customers = await Customer.find({})
            .select('name phone email creditBalance totalPoints bottleBalance createdAt')
            .sort('name');

        res.status(200).json({ customers, count: customers.length });
    } catch (error) {
        console.error('Error fetching all customers:', error);
        res.status(500).json({ msg: 'Internal Server Error.' });
    }
};
const resetCustomerPoints = async (req, res) => {
    const { customerId } = req.params;
    const user = req.user; // Assuming user object is available from auth middleware

    if (!customerId) {
        return res.status(400).json({ msg: 'Customer ID is required for point reset.' });
    }

    try {
        // Find the customer by ID and update the totalPoints field to 0
        const customer = await Customer.findByIdAndUpdate(
            customerId,
            {
                $set: { totalPoints: 0 }
            },
            { new: true, runValidators: true } // Return the updated document and run schema validators
        );

        if (!customer) {
            return res.status(404).json({ msg: 'Customer not found.' });
        }

        // --- Audit Log ---
        await createLog('CUSTOMER_POINTS_RESET',
            { customerId: customer._id, pointsReset: customer.totalPoints },
            user, customer._id, 'Customer');

        res.status(200).json({
            msg: `Fidelity points for ${customer.name} have been reset to 0.`,
            customer
        });

    } catch (err) {
        console.error('Reset Customer Points Failed:', err);
        // Handle potential invalid ID format errors
        if (err.name === 'CastError') {
            return res.status(400).json({ msg: 'Invalid Customer ID format.' });
        }
        res.status(500).json({ msg: 'Server error during point reset.', details: err.message });
    }
};

const getRemainingQuantity = (withdrawal) => withdrawal.savedQuantity - withdrawal.withdrawnQuantity;

const getSavedBottles = async (req, res) => {
    // Récupère customerId et day des requêtes
    const { customerId, day } = req.query; 

    try {
        let customerMatchStage = {};
        let bottleMatchStage = {}; 

        // 1. LOGIQUE DE FILTRAGE CLIENT (CORRIGÉE pour ID, Nom et Téléphone)
        if (customerId) {
            // Tente de filtrer par ID exact si c'est un ObjectId valide
            if (mongoose.Types.ObjectId.isValid(customerId)) {
                customerMatchStage._id = new mongoose.Types.ObjectId(customerId);
            } else {
                // Sinon, recherche par Nom ou Téléphone (regex insensible à la casse)
                const regex = { $regex: customerId, $options: 'i' };
                customerMatchStage.$or = [
                    { name: regex },
                    { phone: regex },
                ];
            }
        }

        // 2. LOGIQUE DE FILTRAGE DE DATE (Renforcée)
        if (day) {
            const startOfDay = new Date(day);
            startOfDay.setUTCHours(0, 0, 0, 0); // Début du jour UTC
            
            const endOfDay = new Date(day);
            endOfDay.setUTCHours(23, 59, 59, 999); // Fin du jour UTC

            bottleMatchStage['bottleWithdrawals.paidOn'] = {
                $gte: startOfDay,
                $lte: endOfDay
            };
        }

        // Condition pour les bouteilles non entièrement retirées (saved > withdrawn)
        const remainingFilter = {
            $gt: [
                '$bottleWithdrawals.savedQuantity',
                '$bottleWithdrawals.withdrawnQuantity'
            ]
        };

        const pipeline = [
            // 1. Match Customers (Appliqué en premier pour l'efficacité)
            { $match: { ...customerMatchStage } },

            // 2. Déconstruction de l'array
            { $unwind: '$bottleWithdrawals' },
            
            // 3. Match des entrées restantes et application du filtre de date
            { 
                $match: {
                    $expr: remainingFilter, 
                    ...bottleMatchStage // Applique le filtre de date ici
                }
            },

            // 4. Population des détails du produit (inchangée)
            { 
                $lookup: {
                    from: Product.collection.name, 
                    localField: 'bottleWithdrawals.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: { path: '$productDetails', preserveNullAndEmptyArrays: true } },
            
            // 5. Projection finale (inchangée)
            { $project: {
                _id: '$_id', 
                name: '$name', 
                phone: '$phone',
                pendingBottles: {
                    _id: '$bottleWithdrawals._id',
                    product: '$bottleWithdrawals.product', 
                    name: { $ifNull: ['$productDetails.name', 'Produit Inconnu'] }, 
                    savedQuantity: '$bottleWithdrawals.savedQuantity',
                    withdrawnQuantity: '$bottleWithdrawals.withdrawnQuantity',
                    billId: '$bottleWithdrawals.billId',
                    dateSaved: '$bottleWithdrawals.paidOn', 
                },
                remainingQuantity: {
                    $subtract: ['$bottleWithdrawals.savedQuantity', '$bottleWithdrawals.withdrawnQuantity']
                }
            }},
            // 6. Tri
            { $sort: { 'pendingBottles.dateSaved': -1 } }
        ];

        const flatSavedBottles = await Customer.aggregate(pipeline);
        
        res.status(200).json({ savedBottles: flatSavedBottles });
        
    } catch (error) {
        console.error('Error fetching saved bottles (getSavedBottles):', error);
        res.status(500).json({ msg: 'Internal Server Error fetching saved bottles.' });
    }
};

module.exports = {
    registerCustomer,
    getCustomerDetails,
    withdrawBottle,
    adjustCredit,
    getAllCustomers,
    getCustomersInDebt,
    resetCustomerPoints,
    getSavedBottles,
};