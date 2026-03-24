const mongoose = require('mongoose');
const Bill = require('../models/BillModel');
const Customer = require('../models/CustomerModel');
const Product = require('../models/ProductModel');
const Inventory = require('../models/InventoryModel');
const { createLog } = require('../utils/AuditService');

const { BILL_STATUS, PAYMENT_STATUS } = require('../utils/constants');
const UserModel = require('../models/UserModel');
const { USER_ROLES } = require('../middleware/authentication');

const getWaiterMovementReport = async (req, res) => {
    try {
        const report = await Bill.aggregate([
            { $match: { status: BILL_STATUS.FINAL } }, // Uniquement les factures terminées
            {
                $group: {
                    _id: "$waiter",
                    totalSales: { $sum: "$total" },
                    billsCount: { $sum: 1 },
                    lastActivity: { $max: "$updatedAt" }
                }
            },
            {
                $lookup: {
                    from: "users", // Nom de votre collection d'utilisateurs
                    localField: "_id",
                    foreignField: "_id",
                    as: "waiterDetails"
                }
            },
            { $unwind: "$waiterDetails" },
            {
                $project: {
                    _id: 1,
                    totalSales: 1,
                    billsCount: 1,
                    lastActivity: 1,
                    waiterName: "$waiterDetails.name"
                }
            },
            { $sort: { totalSales: -1 } }
        ]);

        res.status(200).json({ report });
    } catch (error) {
        res.status(500).json({ msg: "Erreur lors du calcul du rapport", error: error.message });
    }
};
const checkStockForCart = async (cart) => {
    const insufficientStock = [];

    for (const item of cart) {
        // Find product. NO POPULATE needed as stock is now directly on the Product document.
        const product = await Product.findById(item.productId).select('name isStockTracked stockBar');

        if (!product) {
            throw new Error(`Product ID ${item.productId} not found during stock check.`);
        }

        // Check if stock tracking is enabled for this product
        if (product.isStockTracked === false) {
            continue; // Skip stock check for services or non-tracked items
        }

        const requiredProductQuantity = item.quantity;

        // 🎯 NEW LOGIC: Use stockBar for immediate POS sales stock check
        const availableStock = product.stockBar;

        if (requiredProductQuantity > availableStock) {
            insufficientStock.push({
                productName: product.name,
                required: requiredProductQuantity,
                available: availableStock
            });
        }

        // ❌ REMOVED OLD LOGIC: Cases 1 and 2 (1:1 Inventory and Recipe Product) are deleted.
    }

    if (insufficientStock.length > 0) {
        throw new Error(
            'Insufficient stock for one or more items: ' +
            JSON.stringify(insufficientStock)
        );
    }
    return true; // Stock is sufficient
};

const deductStockForBillItems = async (billItems) => {
    const updatePromises = [];

    for (const item of billItems) {
        const productId = item.product;
        const soldQuantity = item.quantity;

        // Find product to check if it's stock-tracked
        const product = await Product.findById(productId).select('isStockTracked');

        if (!product || product.isStockTracked === false) { // <--- Stock deduction is skipped here
            console.warn(`Product ID ${productId} not found or not stock tracked, skipping deduction.`);
            continue;
        }

        // 🎯 NEW LOGIC: Use $inc for atomic update on the Product document's stockBar field
        if (soldQuantity > 0) {
            const promise = Product.findByIdAndUpdate(
                productId,
                { $inc: { stockBar: -soldQuantity } }
                // We rely on the initial checkStockForCart to ensure stock is sufficient
            );
            updatePromises.push(promise);
        }
    }

    // Execute all stock updates in parallel
    await Promise.all(updatePromises);
};

const createDraftBill = async (req, res) => {
    const currentUserId = req.user.userId;
    const user = req.user; // User object for audit log
    const { customer: customerId, items, draftId, draftName, totalAmount } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ msg: 'Cannot create a draft bill with an empty cart.' });
    }

    try {
        const cartForStockAction = items.map(item => ({
            productId: new mongoose.Types.ObjectId(item.product),
            quantity: item.quantity
        }));

        // NOTE: Stock is checked for drafts to prevent selling items that cannot be fulfilled.
        await checkStockForCart(cartForStockAction);

        let bill;
        let originalItems = [];

        // --- 1. Handle Existing Draft (Update) ---
        if (draftId) {
            bill = await Bill.findById(draftId).select('items');
            if (!bill) {
                return res.status(404).json({ msg: `Draft bill with ID ${draftId} not found.` });
            }
            // CRITICAL: Save original items to calculate difference for stock return
            originalItems = bill.items.map(item => ({
                product: item.product.toString(),
                quantity: item.quantity
            }));

            // NOTE: The stock adjustment logic is in updateDraftBill to handle the difference
            // For createDraftBill (with draftId), it's essentially an update, 
            // so we should ideally use the updateDraftBill logic/controller, 
            // or perform a full stock return/deduction here, which is safer but less efficient.
            // *Keeping the original logic here for simple create/save, 
            // and relying on updateDraftBill for proper delta updates.*
        }

        // --- 2. Fetch Details (Customer/Waiter) ---
        let customerName = 'Walk-in / Guest'; 
        if (customerId) {
            const customerDoc = await Customer.findById(customerId).select('name');
            if (customerDoc) {
                customerName = customerDoc.name;
            }
        }
        const waiterName = user.name || 'System User';

        const billData = {
            customer: customerId || null,
            waiter: currentUserId,
            customerName: customerName,
            waiterName: waiterName,
            draftName: draftName || null,
            items: items.map(item => ({
                product: new mongoose.Types.ObjectId(item.product),
                name: item.name,
                price: item.price,
                quantity: item.quantity
            })),
            status: BILL_STATUS.DRAFT,
            totalAmount: totalAmount,
        };

        // --- 3. Create or Update Bill ---
        if (draftId && bill) {
            // Update existing draft
            const updatedBill = await Bill.findByIdAndUpdate(draftId, billData, { new: true, runValidators: true });

            // Since we've decided to move the stock deduction to updateDraftBill 
            // and this block is for 'update existing draft', 
            // we'll rely on updateDraftBill to manage stock deltas.
            // If this route is *only* for creation or simple save/overwrite, 
            // a full return/deduct might be needed, but sticking to the updateDraftBill for complex stock logic.

            // The main stock deduction should happen on a successful creation/update if draftId is new.

            bill = updatedBill;
        } else {
            // Create new draft
            console.log('Final billData before creation:', JSON.stringify(billData, null, 2));

            bill = await Bill.create(billData);
            // --- 4. Stock Deduction for NEW Draft ---
            const stockDeductionItems = items.map(item => ({
                product: item.product, // Correct mapping: uses 'product' key
                quantity: item.quantity
            }));

            // ✅ FIX: Pass the array keyed with 'product'
            await deductStockForBillItems(stockDeductionItems);

            // --- 5. Audit Log for Creation ---
            await createLog('DRAFT_BILL_CREATED', { billId: bill._id, items: cartForStockAction }, user, bill._id, 'Bill');
        }

        res.status(draftId ? 200 : 201).json({
            msg: `Draft bill ${draftId ? 'updated' : 'created'} successfully. Stock deducted.`,
            billId: bill._id,
            draftBill: bill,
        });

    } catch (err) {
        console.error('Draft Creation/Update Failed:', err.message);

        // ... error handling
        if (err.message.includes('Insufficient stock')) {
            return res.status(400).json({
                msg: err.message,
                error: 'Insufficient Stock'
            });
        }

        return res.status(500).json({
            msg: err.name === 'ValidationError' ? 'Draft bill validation failed.' : 'Internal Server Error during draft bill process.',
            error: err.name || 'DraftSaveFailed',
            details: err.errors,
        });
    }
};

const getDraftBills = async (req, res) => {
    // Assurez-vous que les dépendances (Bill, BILL_STATUS) sont chargées

    const user = req.user;
    const currentUserId = user.userId;
    console.log('Current User ID:', currentUserId);
    const userRole = user.role;

    try {
        let query = {
            status: BILL_STATUS.DRAFT,
        };

        // ⭐ Étape de Débogage et de Normalisation CLÉ
        // Normaliser le rôle pour éviter les erreurs de casse ou d'espace
        const normalizedRole = userRole ? userRole.toLowerCase().trim() : '';

        // Définir les rôles qui DOIVENT VOIR TOUS les brouillons
        const hasFullAccess = normalizedRole === 'manager' || normalizedRole === 'admin';

        // console.log('User Role from DB/Token:', userRole);
        // console.log('Normalized Role:', normalizedRole);
        // console.log('Has Full Access:', hasFullAccess);

        // Si l'utilisateur n'a PAS un accès complet (il est un serveur simple, caissier, etc.)
        if (!hasFullAccess) {
            // Appliquer le filtre pour voir UNIQUEMENT ses propres brouillons
            query.waiter = currentUserId;
        }
        // Sinon (s'il est manager ou admin), la requête reste { status: 'draft' }

        console.log('Final MongoDB Query Object:', query);

        // Fetch all draft bills matching the criteria
        const drafts = await Bill.find(query)
            .populate('customer', 'name phone')
            .populate('waiter', 'name')
            .lean()
            .sort({ createdAt: -1 });

        console.log('Number of drafts retrieved:', drafts.length);

        if (drafts.length > 0) {
            const draftWaiterId = drafts[0].waiter
                ? (drafts[0].waiter._id || drafts[0].waiter)
                : 'MISSING or NULL';
            console.log('First Draft Waiter ID (DB Value):', draftWaiterId);
        }

        res.status(200).json({ drafts });

    } catch (err) {
        console.error('Error fetching draft bills:', err);
        res.status(500).json({ msg: 'Internal Server Error while fetching drafts.' });
    }
};

const getDraftBillDetails = async (req, res) => {
    // NOTE: This assumes Bill model and BILL_STATUS constants are available in scope.

    // Check for a single ID (for GET /drafts/:id)
    const { id } = req.params;
    // Check for a customer ID (for GET /drafts/customer/:customerId or from a dedicated customer route)
    const { customerId } = req.params;
    // Check for multiple IDs (for query: /drafts/details?draftIds=...)
    const { draftIds } = req.query;

    console.log(`[DEBUG] Attempting to fetch draft bills. Params ID: ${id}, Params CustomerID: ${customerId}, Query DraftIDs: ${draftIds}`); // Log received parameters

    let query = {}; // Start with an empty query object

    if (id) {
        // Case 1A: Fetching specific single bill by ID (e.g., for editing a known bill via GET /drafts/:id)
        query._id = id;
        console.log(`[DEBUG] Query path: By single specific ID from params.`);
    } else if (draftIds) {
        // Case 1B: Fetching specific bills by ID list (e.g., for bulk lookup via query)
        const ids = draftIds.split(',');
        query._id = { $in: ids };
        console.log(`[DEBUG] Query path: By specific draft IDs from query.`);

    } else if (customerId) {
        // Case 2: Fetching ALL active drafts for a specific customer
        query.customer = customerId;
        query.status = BILL_STATUS.DRAFT;
        console.log(`[DEBUG] Query path: By customer ID for DRAFTS. Status: ${BILL_STATUS.DRAFT}`);

    } else {
        // Case 3: Invalid Request
        console.log(`[DEBUG] Query path: Invalid request (missing params).`);
        return res.status(400).json({ msg: 'Invalid request: ID, customerId, or draftIds are required.' });
    }

    // NOTE: We only strictly enforce DRAFT status if searching by customer ID (Case 2).
    // If searching by specific ID(s) (Case 1A/1B), we retrieve it regardless of status for editing purposes.

    console.log('[DEBUG] Final MongoDB Query:', JSON.stringify(query)); // Log the final query object

    // Now execute the query
    try {
        const drafts = await Bill.find(query)
            .populate('customer', 'name fidelityCardId')
            .populate('items.product', 'name price') // Ensures product data required for editing is available
            .sort({ createdAt: 1 });

        console.log(`[DEBUG] Query executed successfully. Found ${drafts.length} drafts.`); // Log results count

        if (drafts.length === 0) {
            // Determine which error message to return based on the query type
            const errorMsg = id || draftIds
                ? 'No bill details found for the given ID(s).'
                : `No active draft bills found for customer ${customerId}.`;

            return res.status(404).json({ msg: errorMsg });
        }

        res.status(200).json({ drafts, count: drafts.length });
    } catch (error) {
        console.error('[ERROR] Failed to execute Bill query:', error);
        res.status(500).json({ msg: 'Server error during draft retrieval.', error: error.message });
    }
};

const updateDraftBill = async (req, res) => {
    const { id: billId } = req.params;
    const user = req.user;
    const { items, customer: customerId, draftName, tableNumber, notes } = req.body;

    console.log(`[UPDATE DRAFT] Attempting to update draft ID: ${billId}`);

    // --- (Rest of the updateDraftBill logic remains the same) ---

    try {
        const draft = await Bill.findOne({ _id: billId, status: BILL_STATUS.DRAFT });
        if (!draft) {
            return res.status(404).json({ msg: 'Draft bill not found or already finalized.' });
        }

        // Check if items array is missing or empty, which would cause issues later
        if (!items) {
            console.warn(`[UPDATE DRAFT] Items payload missing for draft ID: ${billId}. Assuming items are being removed.`);
        }

        // --- 1. Stock Adjustment Logic ---

        // a. Get current stock reserved by the draft
        const originalItems = draft.items.map(item => ({
            // Ensure product ID is always a string for consistent mapping
            product: item.product.toString(),
            quantity: item.quantity
        }));

        // b. Calculate stock difference (Delta)
        const newItemsMap = (items || []).reduce((acc, item) => {
            acc[item.product.toString()] = item.quantity;
            return acc;
        }, {});

        const deltaStock = {};
        let totalAmount = 0;

        // Compare old items to new items
        for (const { product, quantity: oldQuantity } of originalItems) {
            const newQuantity = newItemsMap[product] || 0;
            const difference = oldQuantity - newQuantity; // Positive: stock to return; Negative: stock to deduct
            if (difference !== 0) {
                deltaStock[product] = (deltaStock[product] || 0) + difference;
            }
            // Remove from newItemsMap to only process new/updated items in the next loop
            delete newItemsMap[product];
        }

        // Add new items (those remaining in newItemsMap)
        for (const productId in newItemsMap) {
            const quantity = newItemsMap[productId];
            // Since this product wasn't in the original draft, the full quantity needs to be deducted
            deltaStock[productId] = (deltaStock[productId] || 0) - quantity;
        }

        // Recalculate total amount and prepare for stock check (only needed for new deductions)
        const itemsToDeduct = [];
        const itemsToReturn = [];

        for (const productId in deltaStock) {
            const quantityDelta = deltaStock[productId];
            if (quantityDelta < 0) {
                itemsToDeduct.push({ product: productId, quantity: -quantityDelta });
            } else if (quantityDelta > 0) {
                itemsToReturn.push({ product: productId, quantity: quantityDelta });
            }
        }

        console.log(`[UPDATE DRAFT] Stock Delta Calculated. To Deduct: ${itemsToDeduct.length}, To Return: ${itemsToReturn.length}`);


        // Calculate new total amount
        totalAmount = (items || []).reduce((sum, item) => sum + (item.quantity * item.price), 0);

        // c. Check stock for items being *added* (deducted from general stock)
        if (itemsToDeduct.length > 0) {
            await checkStockForCart(itemsToDeduct.map(i => ({ productId: i.product, quantity: i.quantity })));
        }

        // d. Perform stock actions atomically
        if (itemsToReturn.length > 0) {
            await returnStockForBillItems(itemsToReturn);
        }
        if (itemsToDeduct.length > 0) {
            await deductStockForBillItems(itemsToDeduct);
        }

        // --- 2. Update Bill Data ---
        let updateData = {
            items: items || [], // Store empty array if none provided
            draftName,
            tableNumber,
            notes,
            totalAmount,
        };

        // Handle customer update
        if (customerId !== undefined) {
            // ... (Customer logic remains the same as original function)
            if (customerId) {
                const customerDoc = await Customer.findById(customerId).select('name');
                if (!customerDoc) {
                    return res.status(404).json({ msg: 'Specified customer not found.' });
                }
                updateData.customer = customerId;
                updateData.customerName = customerDoc.name;
            } else {
                updateData.customer = null;
                updateData.customerName = 'Walk-in / Guest';
            }
        }

        // --- 3. Perform Update & Log ---
        const updatedDraft = await Bill.findByIdAndUpdate(billId, updateData, { new: true, runValidators: true });

        // --- 4. Audit Log for Update ---
        await createLog('DRAFT_BILL_UPDATED', { billId: updatedDraft._id, items: updatedDraft.items, stockDelta: deltaStock }, user, updatedDraft._id, 'Bill');

        res.status(200).json({ msg: 'Draft bill updated successfully. Stock adjusted.', updatedDraft });

    } catch (error) {
        console.error('Error updating draft bill:', error);

        if (error.message.includes('Insufficient stock')) {
            return res.status(400).json({
                msg: error.message,
                error: 'Insufficient Stock'
            });
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({ msg: 'Draft bill validation failed.', details: error.errors });
        }
        res.status(500).json({ msg: 'Server error during draft update.' });
    }
};

const deleteDraftBill = async (req, res) => {
    const { id: billId } = req.params;

    try {
        // Change status to archived instead of deleting permanently
        const archivedDraft = await Bill.findOneAndUpdate(
            { _id: billId, status: BILL_STATUS.DRAFT },
            { $set: { status: BILL_STATUS.ARCHIVED, notes: 'Archived/Deleted by User' } },
            { new: true }
        );

        if (!archivedDraft) {
            return res.status(404).json({ msg: 'Draft bill not found or already finalized/archived.' });
        }

        res.status(200).json({ msg: 'Draft bill deleted (archived) successfully.' });

    } catch (error) {
        console.error('Error archiving draft bill:', error);
        res.status(500).json({ msg: 'Server error during draft deletion.' });
    }
};

const POINT_RATE_BACKEND = 0.10; // 🎯 FIX: Updated to match frontend (10 points = $1.00)
const EARNING_RATE_PER_DOLLAR = 0.5;

const finalizeBill = async (req, res) => {
    const {
        cart,
        customerId,
        amountReceived,
        paymentMethod,
        creditUsed,
        pointsUsed,
        draftIds 
    } = req.body;
    
    const user = req.user; // L'utilisateur qui finalise (ex: Admin)

    const n_amountReceived = Number(amountReceived) || 0;
    const n_creditUsed = Number(creditUsed) || 0;
    const n_pointsUsed = Number(pointsUsed) || 0;
    const POINT_RATE = 1; // Ou votre constante POINT_RATE_BACKEND

    if (!cart || cart.length === 0) {
        return res.status(400).json({ msg: 'Cannot finalize an empty cart.' });
    }

    const isUpdatingDraft = draftIds && Array.isArray(draftIds) && draftIds.length > 0;
    const primaryDraftId = isUpdatingDraft ? draftIds[0] : null;

    try {
        // --- 🎯 LE VERROU DE SERVEUR (CRITIQUE) ---
        let finalWaiterId = user.userId;
        let finalWaiterName = user.name;

        if (isUpdatingDraft) {
            const existingDraft = await Bill.findById(primaryDraftId);
            if (existingDraft && existingDraft.waiter) {
                // On force la conservation du serveur du brouillon
                finalWaiterId = existingDraft.waiter;
                finalWaiterName = existingDraft.waiterName || "Serveur d'origine";
                console.log(`[Fix] Preservation du serveur: ${finalWaiterName}`);
            }
        }
        // ------------------------------------------

        const sanitizedCart = cart.map(item => ({
            product: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: item.quantity * item.price,
            saveBottle: !!item.saveBottle,
        }));

        const subtotal = sanitizedCart.reduce((sum, item) => sum + item.total, 0);
        const totalAmount = subtotal; 

        let customerDoc = null;
        if (customerId) {
            customerDoc = await Customer.findById(customerId);
        }

        const pointValue = n_pointsUsed * POINT_RATE;
        const billAmountAfterPoints = totalAmount - pointValue;
        const netAmountDue = billAmountAfterPoints - n_creditUsed;
        const changeDue = Math.max(0, n_amountReceived - netAmountDue);
        const finalDebtAccrued = Math.max(0, netAmountDue - n_amountReceived);

        // Préparation de l'objet de mise à jour
        const finalBillData = { 
            customer: customerId || null,
            customerName: customerDoc ? customerDoc.name : 'Walk-in Customer',
            waiter: finalWaiterId, // L'ID préservé
            waiterName: finalWaiterName, // Le nom préservé
            items: sanitizedCart,
            subtotal: subtotal,
            totalAmount: totalAmount, 
            paymentMethod: paymentMethod,
            amountReceived: n_amountReceived,
            creditUsed: n_creditUsed,
            pointsUsed: n_pointsUsed,
            finalAmountDue: billAmountAfterPoints,
            debtAccrued: finalDebtAccrued,
            changeDue: changeDue,
            status: 'final', // Forcer le statut final
            paymentStatus: finalDebtAccrued > 0 ? 'half-paid' : 'paid',
            updatedAt: new Date()
        };

        let bill;
        if (isUpdatingDraft) {
            // Mise à jour du brouillon et suppression des champs spécifiques au brouillon
            bill = await Bill.findOneAndUpdate(
                { _id: primaryDraftId },
                { 
                    $set: finalBillData,
                    $unset: { draftName: 1, tableNumber: 1 } 
                },
                { new: true, runValidators: true }
            );

            // Nettoyage des autres brouillons si fusion
            if (draftIds.length > 1) {
                await Bill.updateMany(
                    { _id: { $in: draftIds.slice(1) } },
                    { $set: { status: 'archived' } }
                );
            }
        } else {
            // Création nouvelle facture si pas de brouillon
            bill = await Bill.create(finalBillData);
            await deductStockForBillItems(sanitizedCart);
        }

        // Mise à jour points client si applicable
        if (customerDoc) {
            if (n_creditUsed > 0) customerDoc.creditBalance -= n_creditUsed;
            if (finalDebtAccrued > 0) customerDoc.creditBalance -= finalDebtAccrued;
            else if (changeDue > 0) customerDoc.creditBalance += changeDue;
            
            // Gain de points (ex: 1 point par dollar)
            customerDoc.totalPoints += Math.floor(billAmountAfterPoints);
            await customerDoc.save();
        }

        res.status(201).json({
            msg: 'Bill finalized successfully.',
            bill
        });

    } catch (error) {
        console.error('Finalize Bill Error:', error);
        res.status(500).json({ msg: 'Erreur lors de la finalisation', error: error.message });
    }
};

const getFinalBills = async (req, res) => {
    try {
        // Correction 1: Utiliser la constante BILL_STATUS.FINAL (qui vaut 'final')
        // Si vous voulez aussi voir les factures 'archived', utilisez { $in: [BILL_STATUS.FINAL, 'archived'] }
        const bills = await Bill.find({ status: BILL_STATUS.FINAL })
            .populate('waiter', 'name') // Correction 2: 'waiter' au lieu de 'waiterId'
            .populate('items.product', 'name') // Correction 3: 'product' au lieu de 'productId'
            .sort({ updatedAt: -1 });

        res.status(200).json({ bills });
    } catch (error) {
        console.error('Erreur getFinalBills:', error);
        res.status(500).json({ 
            msg: 'Erreur lors de la récupération des factures.',
            details: error.message 
        });
    }
};


const updatedFinalizeBill = async (req, res) => {
    const {
        billIds,
        paymentMethod,
        amountReceived,
        creditUsed,
        debtAccrued,
        customerId: customerIdPayload,
        // savedProductItems: These are the products the customer paid for but left behind. 
        savedProductItems
    } = req.body;

    const user = req.user;
    const currentUserId = user.userId;

    if (!billIds || billIds.length === 0) {
        return res.status(400).json({ msg: 'No bill IDs provided for finalization.' });
    }

    if ((savedProductItems && savedProductItems.length > 0) && !customerIdPayload) {
        return res.status(400).json({ msg: 'Cannot save products for a walk-in customer. A customer account is required.' });
    }

    // --- 1. Transaction Start for Atomicity ---
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        // 2. Fetch all draft bills
        const drafts = await Bill.find({
            _id: { $in: billIds },
            status: BILL_STATUS.DRAFT
        }).session(session); // Use session

        if (drafts.length !== billIds.length) {
            await session.abortTransaction();
            return res.status(400).json({ msg: 'One or more bills were not found or are not drafts.' });
        }

        // 3. Aggregate Cart and Calculate Total (No change here)
        const { mergedCart, totalAmount: cartTotal } = drafts.reduce((acc, draft) => {
            acc.totalAmount += draft.totalAmount;
            draft.items.forEach(item => {
                const id = item.product.toString();
                if (!acc.mergedCart[id]) {
                    acc.mergedCart[id] = { productId: item.product, quantity: 0, price: item.price, name: item.name };
                }
                acc.mergedCart[id].quantity += item.quantity;
            });
            return acc;
        }, { mergedCart: {}, totalAmount: 0 });

        const safeCartTotal = Number(cartTotal).toFixed(0);
        const netCreditChange = -Number(debtAccrued) + Number(creditUsed);

        // --- 4. Handle Saved Products (Stock Return) ---
        const savedItemsForReturn = (savedProductItems || []).map(item => ({
            product: item.product,
            quantity: item.quantity
        }));

        if (savedItemsForReturn.length > 0) {
            // IMPORTANT: Returns the physical stock. Assumes returnStockForBillItems is session-aware or simple.
            await returnStockForBillItems(savedItemsForReturn);
        }

        // 5. Calculate Customer Credit and Points (Do NOT save the customer yet)
        let customerDoc = null;
        let customerInitialCreditBalance = 0;
        let customerFinalCreditBalance = 0;
        let pointsEarned = 0;

        if (customerIdPayload) {
            // Fetch customer within the session
            customerDoc = await Customer.findById(customerIdPayload).session(session);

            if (customerDoc) {
                customerInitialCreditBalance = customerDoc.creditBalance;
                pointsEarned = safeCartTotal * 0.5;
                pointsEarned = pointsEarned > 0 ? pointsEarned : 0;

                // Calculate final balances for the Bill document
                customerFinalCreditBalance = customerDoc.creditBalance + netCreditChange;
            } else {
                console.warn(`Customer ID ${customerIdPayload} not found during finalization.`);
            }
        }

        // 6. Create Final Bill Document
        const productsSavedForBill = (savedProductItems || []).map(item => ({
            product: new mongoose.Types.ObjectId(item.product),
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            isPickedUp: false, // Default status
            // pickedUpAt, pickedUpBy are optional and null by default
        }));

        const finalBillData = {
            customer: customerIdPayload || null,
            customerName: customerDoc ? customerDoc.name : drafts[0].customerName,
            waiter: currentUserId,
            waiterName: user.name,
            items: drafts.flatMap(draft => draft.items), // All items from drafts
            subtotal: drafts.reduce((sum, d) => sum + Number(d.subtotal || 0), 0),
            tax: drafts.reduce((sum, d) => sum + Number(d.tax || 0), 0),
            totalAmount: cartTotal,
            pointsEarned: pointsEarned,
            status: BILL_STATUS.FINAL,
            paymentStatus: Number(debtAccrued) > 0 ? PAYMENT_STATUS.CREDIT : PAYMENT_STATUS.PAID,
            paymentMethod,
            amountPaid: Number(amountReceived),
            creditUsed: Number(creditUsed),
            creditGiven: -Number(debtAccrued),
            customerInitialCreditBalance: customerInitialCreditBalance,
            customerFinalCreditBalance: customerFinalCreditBalance, // Use calculated value
            productsSaved: productsSavedForBill, // CRITICAL: Save the saved products
        };

        // Bill.create returns an array when using session
        const [finalBill] = await Bill.create([finalBillData], { session });
        const finalBillId = finalBill._id;

        // --- 7. CRITICAL: Update Customer's Withdrawals and Final Credit/Points ---
        if (customerIdPayload && customerDoc) {

            // Prepare the withdrawal entries with the new finalBillId
            const withdrawalUpdates = (savedProductItems || []).flatMap(item =>
                // Create one entry in bottleWithdrawals for EACH quantity unit
                Array(item.quantity).fill({
                    product: new mongoose.Types.ObjectId(item.product),
                    billId: finalBillId, // CRITICAL: Link to the new bill
                    paidOn: new Date(),
                    isWithdrawn: false,
                })
            );

            // Update customer's state atomically within the transaction
            const customerUpdate = {
                $set: {
                    creditBalance: customerFinalCreditBalance, // Final calculated balance
                    totalPoints: (customerDoc.totalPoints || 0) + pointsEarned, // Total points update
                }
            };

            if (withdrawalUpdates.length > 0) {
                customerUpdate.$push = {
                    bottleWithdrawals: { $each: withdrawalUpdates } // Bulk push
                };
            }

            await Customer.updateOne(
                { _id: customerIdPayload },
                customerUpdate,
                { session }
            );
        }

        // 8. Update Drafts Status
        await Bill.updateMany(
            { _id: { $in: billIds } },
            {
                $set: {
                    status: BILL_STATUS.FINAL,
                    parentBillId: finalBillId,
                    customer: null,
                    customerName: 'Merged/Finalized'
                }
            }
        ).session(session); // Use session

        // --- NEW LOGIC FOR SAVED BOTTLES ---
        if (bill.customer && bill.productsSaved && bill.productsSaved.length > 0) {

            const customerId = bill.customer;
            const bottleWithdrawals = bill.productsSaved.map(item => {
                // Create one entry in bottleWithdrawals for each quantity of the item
                return Array.from({ length: item.quantity }, () => ({
                    product: item.product,
                    paidOn: new Date(),
                    isWithdrawn: false, // Explicitly set to not withdrawn
                    billId: bill._id,
                    // Add the original productsSaved array item ID for potential linking
                    billItemId: item._id
                }));
            }).flat(); // Flatten the array of arrays

            const customerUpdate = await Customer.findByIdAndUpdate(
                customerId,
                {
                    $push: {
                        bottleWithdrawals: { $each: bottleWithdrawals }
                    }
                },
                { new: true, runValidators: true }
            );

            if (customerUpdate) {
                // LOG: Bottle Saved
                await createLog('BOTTLE_SAVED', {
                    billId: bill._id,
                    customerName: customerUpdate.name,
                    savedItems: bill.productsSaved.map(i => `${i.quantity}x ${i.name}`)
                }, req.user, customerId, 'Customer');
            }
        }
        // --- END NEW LOGIC ---


        // 9. Audit Log
        await createLog('BILL_FINALIZED_WITH_SAVED_ITEMS',
            { billId: finalBillId, amount: cartTotal, savedItems: savedProductItems },
            user, finalBillId, 'Bill');

        // --- 10. Commit the transaction ---
        await session.commitTransaction();

        res.status(201).json({
            msg: 'Bill finalized, saved products registered for pickup, and credit/points updated successfully.',
            bill: finalBill
        });

    } catch (err) {
        await session.abortTransaction(); // Abort on failure
        console.error('Updated Finalize Bill Failed:', err);
        // ... (rest of error handling)
        if (err.message.includes('Insufficient stock')) {
            return res.status(400).json({ msg: err.message, error: 'Insufficient Stock' });
        }
        if (err.name === 'ValidationError') {
            return res.status(400).json({ msg: `Bill validation failed: ${err.message}`, details: err.errors });
        }
        res.status(500).json({ msg: 'Server error during bill finalization.', details: err.message });
    } finally {
        session.endSession();
    }
};


const getCustomerWithdrawals = async (req, res) => {
    const { customerId } = req.params;

    const customer = await Customer.findById(customerId)
        .select('bottleWithdrawals')
        .populate('bottleWithdrawals.product', 'name');

    if (!customer) {
        return res.status(404).json({ msg: 'Customer not found.' });
    }

    const pendingWithdrawals = customer.bottleWithdrawals.filter(w => !w.withdrawnDate);

    res.status(200).json({ customerName: customer.name, pendingWithdrawals });
};

const getMergedDraftDetails = async (req, res) => {
    const { draftIds } = req.body;
    console.log('--- MERGE ROUTE REACHED --- IDs:', draftIds);
    if (!draftIds || draftIds.length === 0) {
        return res.status(400).json({ msg: 'No draft IDs provided for merging.' });
    }

    const drafts = await Bill.find({
        _id: { $in: draftIds },
        status: BILL_STATUS.DRAFT // ✅ Use 'status'
    })
        .select('items customer')
        .populate('items.product', 'name price'); // IMPORTANT: Populate product details for client-side display/mapping

    if (drafts.length === 0) {
        console.log('[DEBUG MERGE] No valid drafts found for IDs:', draftIds);
        return res.status(404).json({ msg: 'No valid drafts found for the provided IDs.' });
    }

    console.log(`[DEBUG MERGE] Successfully retrieved ${drafts.length} drafts.`);

    // Check for shared customer ID (use the first one found that has a customer)
    // Find the first draft with a non-null customer ID to use as the "shared" ID
    const firstDraftWithCustomer = drafts.find(d => d.customer);
    const sharedCustomerId = firstDraftWithCustomer ? firstDraftWithCustomer.customer : null;

    console.log(`[DEBUG MERGE] Determined shared customer ID: ${sharedCustomerId}`);


    // 1. Merge items
    const mergedCart = {};
    drafts.forEach(draft => {

        if (sharedCustomerId && draft.customer && draft.customer.toString() !== sharedCustomerId.toString()) {
            console.warn(`[WARNING MERGE] Merging drafts with different customers. Customer ID of draft: ${draft.customer}. Using shared ID: ${sharedCustomerId}`);
        }

        draft.items.forEach(item => {
            // Use product ID as the unique key for merging
            const itemId = (item.product._id || item.product).toString(); // Handle populated or unpopulated product

            if (!mergedCart[itemId]) {
                mergedCart[itemId] = {
                    // If product was populated, use its ID. If not, the value is just the ID string.
                    _id: item.product._id || item.product,
                    name: item.name,
                    price: item.price,
                    quantity: 0,
                };
            }
            mergedCart[itemId].quantity += item.quantity;
        });
    });

    // 2. Fetch Customer Details if available
    let customerDetails = null;
    if (sharedCustomerId) {
        customerDetails = await Customer.findById(sharedCustomerId).select('name creditBalance fidelityCardId');
    }

    console.log(`[DEBUG MERGE] Final merged cart size: ${Object.values(mergedCart).length}, Customer details fetched: ${!!customerDetails}`);


    res.status(200).json({
        msg: 'Drafts successfully merged into a single cart view.',
        mergedCart: Object.values(mergedCart),
        customer: customerDetails,
    });
};

const productSave = async (req, res) => {
    // --- Guard 1: Safety Check for Malformed Input (Addresses previous error) ---
    // Cette partie est maintenue pour la robustesse
    if (Array.isArray(req.body)) {
        console.warn('Attempt to save bottle with malformed array input rejected.');
        return res.status(400).json({ msg: 'Invalid request format. This action expects a single bottle save object, not an array.' });
    }

    // Data received from the FinalizedBills.jsx component
    const { billId, productId, quantity } = req.body;

    // --- 1. Basic Validation ---
    if (!billId || !productId || typeof quantity !== 'number' || quantity <= 0) {
        return res.status(400).json({ msg: 'Missing or invalid data: billId, productId, and a positive quantity are required.' });
    }
    
    const quantityToSave = Math.floor(quantity);

    try {
        // --- 2. Retrieve Bill and Customer ---
        // Fetch only necessary fields
        const bill = await Bill.findById(billId).select('items customer'); 
        if (!bill) {
            return res.status(404).json({ msg: `Bill not found with ID: ${billId}` });
        }

        // ⭐ FIX #1 (Garde-fou Client Manquant): S'assurer que la facture est liée à un client.
        if (!bill.customer) {
            return res.status(400).json({ msg: 'Cannot save products for a walk-in/guest customer. The bill must be linked to an account.' });
        }

        // Retrieve customer based on the bill's customer ID
        const customer = await Customer.findById(bill.customer).select('name bottleWithdrawals'); 
        if (!customer) {
            return res.status(404).json({ msg: 'Customer linked to the bill not found. Please verify the customer account exists.' });
        }


        // --- 3. Find Sold Item on Bill ---
        const billItem = bill.items.find(item => item.product.toString() === productId);
        
        if (!billItem) {
            return res.status(400).json({ msg: 'Product not found in this bill.' });
        }
        
        const totalSold = billItem.quantity;

        // --- 4. Calculate Total Already Saved ---
        // Cette logique est correcte pour le calcul
        const totalAlreadySaved = customer.bottleWithdrawals
            .filter(item => 
                item.product.toString() === productId && 
                item.sourceBillId && 
                item.sourceBillId.toString() === billId
            )
            // Assurez-vous que savedQuantity est traité comme 0 s'il manque 
            // pour ne pas causer d'erreur de calcul ici (même si la validation Mongoose est contournée)
            .reduce((sum, item) => sum + (item.savedQuantity || 0), 0); 

        const remainingAvailable = totalSold - totalAlreadySaved;
        
        // --- 5. CRITICAL VALIDATION CHECK ---
        if (quantityToSave > remainingAvailable) {
            return res.status(400).json({ 
                msg: `Validation Error: Cannot save ${quantityToSave} bottles. Only ${remainingAvailable} remaining from the bill item.`
            });
        }
        
        // --- 6. Save Bottle Record (Le FIX CRITIQUE pour la Validation Mongoose) ---
        const newBottleRecord = {
            product: productId,
            // Le champ OBLIGATOIRE 'savedQuantity' est correctement défini ici.
            savedQuantity: quantityToSave, 
            withdrawnQuantity: 0, 
            sourceBillId: billId, 
            dateSaved: new Date(),
        };

        // ⭐ FIX #2: Utiliser $push atomique pour ajouter le nouvel enregistrement
        // SANS déclencher la validation sur les anciens enregistrements du tableau.
        const updatedCustomer = await Customer.findByIdAndUpdate(
            customer._id,
            { $push: { bottleWithdrawals: newBottleRecord } },
            // runValidators: true valide UNIQUEMENT le 'newBottleRecord' poussé.
            { new: true, runValidators: true } 
        );

        if (!updatedCustomer) {
            return res.status(404).json({ msg: 'Customer not found during update.' });
        }

        // --- 7. Audit Logging ---
        const user = req.user || {
            _id: null,
            userId: null,
            name: 'System/Unknown',
            role: 'SYSTEM'
        };
        
        try {
            // Utilisation de updatedCustomer pour le nom
            await createLog('BOTTLE_SAVED', {
                customerId: bill.customer,
                customerName: updatedCustomer.name,
                productId: productId,
                quantity: quantityToSave,
                sourceBillId: billId,
            }, { userId: user._id || user.userId, name: user.name, role: user.role }, customer._id, 'Customer');
        } catch (logError) {
             console.error('Failed to create audit log:', logError.message);
        }

        res.status(200).json({ 
            msg: `Successfully saved ${quantityToSave} bottles.`,
            savedBottleRecord: newBottleRecord
        });

    } catch (error) {
        console.error('Error saving bottle (productSave):', error);
        // Gestion explicite de l'erreur de validation
        if (error.name === 'ValidationError') {
            return res.status(400).json({ msg: `Customer validation failed: ${error.message}`, details: error.errors });
        }
        res.status(500).json({ msg: `Internal Server Error during bottle saving. Error: ${error.message}` });
    }
};  

// Ensure this function is exported: module.exports = { /* ... */, productSave };

const returnStockForBillItems = async (billItems) => {
    const updatePromises = [];

    for (const item of billItems) {
        const productId = item.product;
        // In the delta calculation, quantity is already positive here (stock to return)
        const returnedQuantity = item.quantity;

        // Find product to check if it's stock-tracked
        const product = await Product.findById(productId).select('isStockTracked');

        if (!product || product.isStockTracked === false) {
            console.warn(`Product ID ${productId} not found or not stock tracked, skipping stock return.`);
            continue;
        }

        if (returnedQuantity > 0) {
            const promise = Product.findByIdAndUpdate(
                productId,
                // 🎯 Use positive value to ADD back to stockBar
                { $inc: { stockBar: returnedQuantity } }
            );
            updatePromises.push(promise);
        }
    }

    // Execute all stock updates in parallel
    await Promise.all(updatePromises);
};

const resetAllPerformancePoints = async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Forbidden: Only administrators can reset performance points.' });
    }

    try {
        const result = await UserModel.updateMany(
            {},
            { $set: { performancePoints: 0 } }
        );

        res.status(200).json({
            msg: `Successfully reset performance points for ${result.modifiedCount} staff members.`,
            modifiedCount: result.modifiedCount
        });
    } catch (err) {
        console.error('Error resetting performance points:', err);
        res.status(500).json({ msg: 'Server error during point reset.', details: err.message });
    }
};

// --- NEW CONTROLLER FUNCTION ---
const getPendingSavedProducts = async (req, res) => {
    try {
        // Find final bills that contain products in the 'productsSaved' array
        // where 'isPickedUp' is false.
        const bills = await Bill.find({
            status: BILL_STATUS.FINAL, // Only look at finalized bills
            'productsSaved': {
                $exists: true, // Ensure the array exists
                $not: { $size: 0 }, // Ensure the array is not empty
                $elemMatch: {
                    isPickedUp: false
                } // Match if ANY element is not picked up
            }
        }).select('_id customerName customer createdAt productsSaved'); // Select only necessary fields

        res.status(200).json({ bills });
    } catch (err) {
        console.error('Failed to fetch pending saved products:', err);
        res.status(500).json({ msg: 'Server error while fetching pending saved products.', details: err.message });
    }
};

const updateFinalBill = async (req, res) => {
    // Note: Bill and Product models are now available from the file imports above.
    const billId = req.params.id;
    
    // FIX 1: Change 'updatedItems' to 'items' and set a default empty array ([]).
    const { items = [], actionDetails, cardDetails } = req.body; // Added cardDetails here
    const user = req.user;

    // 1. Fetch the original final bill 
    const bill = await Bill.findById(billId).populate('items.product');

    if (!bill || bill.status !== 'final') {
        return res.status(404).json({ msg: 'Final bill not found or is not a finalized bill.' });
    }

    console.log(`[UPDATE FINAL] Bill found. Calculating stock delta...`);
    // CRITICAL DEBUGGING: Log the received updated items
    // FIX 2: Use the new variable name 'items'
    console.log(`[DEBUG] Received items:`, items);
    // CRITICAL DEBUGGING: Log the original bill items
    console.log(`[DEBUG] Original Bill Items:`, bill.items.map(i => ({
        db_id: i.product ? i.product._id.toString() : 'NOT POPULATED',
        qty: i.quantity,
        price: i.price
    })));

    const stockChangesLog = [];
    const itemsToDeduct = [];
    let newTotal = 0;

    // Calculate new Total and prepare stock delta
    // FIX 3: Iterate over 'items' instead of 'updatedItems'
    for (const updatedItem of items) { 
        // We MUST find the original item to get its product ID and price
        const originalItem = bill.items.find(i =>
            // Crucial safety check: ensure the product is populated and exists
            i.product && i.product._id && i.product._id.toString() === updatedItem.productId.toString()
        );

        // --- DEBUG LOGGING FOR MATCHING ---
        console.log(`[DEBUG ITEM] Looking up client ID: ${updatedItem.productId}`);
        console.log(`[DEBUG ITEM] Original item found: ${originalItem ? 'YES' : 'NO'}`);
        if (originalItem && originalItem.product) {
            console.log(`[DEBUG ITEM] Matched DB ID: ${originalItem.product._id.toString()}`);
        }
        // --- END DEBUG LOGGING ---


        // Safely determine price and original quantity
        const price = originalItem ? originalItem.price : 0;
        const originalQty = originalItem ? originalItem.quantity : 0;
        const updatedQty = updatedItem.quantity;

        // Add item total to the new bill total
        newTotal += (updatedQty * price);

        // If price is 0, this log will confirm if the lookup failed
        if (price === 0) {
            console.warn(`[WARNING] Price for ${updatedItem.productId} is 0. Check originalItem lookup.`);
        }


        // --- Stock Adjustment Logic ---
        if (originalItem && originalQty !== updatedQty) {

            // Delta calculation: original - updated. 
            const quantityDifference = originalQty - updatedQty;
            const productId = originalItem.product._id;

            // If quantityDifference is NEGATIVE, it means the user increased the quantity, 
            if (quantityDifference < 0) {
                itemsToDeduct.push({ product: productId, quantity: -quantityDifference });
            }

            stockChangesLog.push({
                product: productId,
                quantity: quantityDifference,
                action: quantityDifference > 0 ? 'RETURNED_TO_STOCK' : 'REMOVED_FROM_STOCK',
                original: originalQty,
                updated: updatedQty,
            });
        }
    }

    console.log(`[STOCK LOG] Changes prepared:`, stockChangesLog);
    console.log(`[TOTAL CALC] New Total calculated: ${newTotal}`); // Log the calculated total

    // 2. Check stock for new deductions (items where quantity was increased)
    if (itemsToDeduct.length > 0) {
        console.log(`[STOCK CHECK] Checking stock for new deductions...`);

        for (const { product, quantity } of itemsToDeduct) {
            const productDoc = await Product.findById(product);
            if (!productDoc || productDoc.stockQuantity < quantity) {
                return res.status(400).json({ msg: `Stock insuffisant pour l'article ID ${product}. Requis: ${quantity}, Disponible: ${productDoc?.stockQuantity || 0}.` });
            }
        }
    }

    // 3. Perform atomic stock adjustment (since stock check passed)
    for (const logEntry of stockChangesLog) {
        const stockUpdate = { $inc: { stockQuantity: logEntry.quantity } };

        await Product.findByIdAndUpdate(logEntry.product, stockUpdate, { new: true });
        console.log(`[STOCK ADJUSTED] Product ${logEntry.product} $inc by ${logEntry.quantity}`);
    }

    // 4. Update the bill items and add to action log
    const updatedBill = await Bill.findByIdAndUpdate(billId,
        {
            // FIX 4: Use the incoming 'items' array
            items: items.map(item => { 
                // Find the original item data to reliably get name and price for fallbacks
                const originalData = bill.items.find(i =>
                    i.product && i.product._id && i.product._id.toString() === item.productId.toString()
                );

                const storedName = originalData ? originalData.name : 'N/A';
                const storedPrice = originalData ? originalData.price : 0;

                return {
                    product: item.productId,
                    quantity: item.quantity,
                    // FIX 5: Ensure 'name' and 'price' are sent from client or derived from originalData
                    name: item.name || storedName,
                    price: item.price || storedPrice
                };
            }),
            total: newTotal, // Use the calculated newTotal
            // FIX 6: Add cardDetails to the update object if provided
            ...(cardDetails && { cardDetails: cardDetails }), 
            $push: {
                actionLog: {
                    action: 'FINAL_BILL_ADJUSTED',
                    details: actionDetails,
                    admin: user._id,
                    stockChanges: stockChangesLog
                }
            }
        },
        { new: true }
    ).populate('items.product');

    res.status(200).json({ bill: updatedBill, msg: 'Final bill updated and stock/logs adjusted.' });
};



const productWithdraw = async (req, res) => {
    const { customerId, withdrawalIds } = req.body;
    // withdrawalIds is an array of IDs from the bottleWithdrawals sub-document

    // 1. Mark the specific sub-documents as withdrawn
    const updateResult = await Customer.updateMany(
        {
            _id: customerId,
            'bottleWithdrawals._id': { $in: withdrawalIds }
        },
        {
            $set: {
                'bottleWithdrawals.$[elem].isWithdrawn': true,
                'bottleWithdrawals.$[elem].withdrawnAt': new Date(), // New field for timestamp
                'bottleWithdrawals.$[elem].withdrawnBy': req.user._id // Cashier/Waiter ID
            }
        },
        {
            arrayFilters: [{ 'elem._id': { $in: withdrawalIds } }]
        }
    );

    if (updateResult.modifiedCount === 0) {
        return res.status(400).json({ msg: 'No saved products were withdrawn, check IDs.' });
    }

    // 2. Optional: Generate a "Pickup Slip" for printing (as suggested by the front-end code)
    // Logic to fetch the updated customer or the specific withdrawn items for the slip.

    res.status(200).json({ msg: `${updateResult.modifiedCount} saved product(s) successfully withdrawn.` });
};

const getWaiterPerformance = async (req, res) => {
    try {
        const pipeline = [
            {
                // On filtre les factures payées qui ont un serveur assigné
                $match: { 
                    status: 'final', 
                    waiter: { $exists: true, $ne: null } 
                }
            },
            {
                $group: {
                    _id: '$waiter',
                    totalSales: { $sum: '$total' },
                    billsCount: { $sum: 1 },
                    lastActivity: { $max: '$createdAt' }
                }
            },
            {
                $lookup: {
                    from: 'users', // Nom de la collection dans MongoDB
                    localField: '_id',
                    foreignField: '_id',
                    as: 'waiterDetails'
                }
            },
            {
                $unwind: {
                    path: '$waiterDetails',
                    preserveNullAndEmptyArrays: true 
                }
            },
            {
                $project: {
                    _id: 1,
                    totalSales: 1,
                    billsCount: 1,
                    lastActivity: 1,
                    waiterName: { $ifNull: ['$waiterDetails.name', 'Serveur Inconnu'] }
                }
            },
            { $sort: { totalSales: -1 } }
        ];

        const performanceData = await Bill.aggregate(pipeline);
        res.status(200).json({ performanceData });
    } catch (error) {
        console.error('Erreur Performance:', error);
        res.status(500).json({ msg: 'Erreur interne du serveur', error: error.message });
    }
};

const getWaitersList = async (req, res) => {
    try {
        const waiters = await UserModel.find({ 
            role: USER_ROLES.WAITER, // Filter by the waiter role
            isActive: true // Optional: only active waiters
        }).select('_id name'); // Only retrieve the necessary fields

        // Return the list as an array of { _id, name }
        res.status(200).json(waiters);
    } catch (error) {
        console.error('Error fetching waiters list:', error);
        res.status(500).json({ msg: 'Internal Server Error fetching waiters list.' });
    }
};



module.exports = {
    createDraftBill,
    getDraftBills,
    getDraftBillDetails,
    updateDraftBill,
    deleteDraftBill,
    finalizeBill,
    getFinalBills,
    updateFinalBill,
    deductStockForBillItems,
    returnStockForBillItems,
    resetAllPerformancePoints,
    updatedFinalizeBill,
    getCustomerWithdrawals,
    productSave,
    getWaiterPerformance,
    productWithdraw,
    getMergedDraftDetails,
    checkStockForCart,
    getPendingSavedProducts,
    getWaitersList,
    getWaiterMovementReport,
};