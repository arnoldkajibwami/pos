const mongoose = require('mongoose');
const Bill = require('../models/BillModel'); // Assume BillModel exists
const Product = require('../models/ProductModel');
const AuditLog = require('../models/AuditLogModels');
const User = require('../models/UserModel');
const Inventory = require('../models/InventoryModel'); // Assume InventoryModel exists
const { BILL_STATUS } = require('../utils/constants'); // Correctement importé
const { createLog } = require('../utils/AuditService');


const adjustProductStock = async (req, res) => {
    const { id } = req.params; // Product ID
    const { adjustmentAmount, stockField, reason } = req.body;

    if (!['stockBar', 'stockGeneral'].includes(stockField)) {
        return res.status(400).json({ msg: 'Invalid stock field specified. Must be stockBar or stockGeneral.' });
    }
    if (typeof adjustmentAmount !== 'number' || adjustmentAmount === 0) {
        return res.status(400).json({ msg: 'Adjustment amount must be a non-zero number.' });
    }

    try {
        const product = await Product.findById(id).select(`name ${stockField}`);
        if (!product) {
            return res.status(404).json({ msg: `Product ID ${id} not found.` });
        }

        let currentStock = product[stockField];

        // Check for insufficient stock only if subtracting
        if (adjustmentAmount < 0) {
            const requiredDeduction = Math.abs(adjustmentAmount);

            if (currentStock < requiredDeduction) {
                return res.status(400).json({
                    msg: `Cannot subtract ${requiredDeduction}. Only ${currentStock} available in ${stockField}.`,
                    availableStock: currentStock
                });
            }
        }

        // Use $inc for atomic update
        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            { $inc: { [stockField]: adjustmentAmount } },
            { new: true, runValidators: true }
        ).select('name stockBar stockGeneral');

        await createLog('PRODUCT_STOCK_ADJUSTED', {
            productName: updatedProduct.name,
            stockField: stockField,
            adjustment: adjustmentAmount,
            reason: reason || 'Manual adjustment',
            oldStock: currentStock,
            newStock: updatedProduct[stockField],
        }, req.user, updatedProduct._id, 'Product');


        res.status(200).json({
            msg: `Product stock (${stockField}) adjusted successfully`,
            product: updatedProduct
        });

    } catch (error) {
        console.error("Error in adjustProductStock:", error);
        res.status(500).json({ msg: 'Failed to adjust product stock.', error: error.message });
    }
};
/**
 * Handles transferring stock between stockGeneral and stockBar for a product.
 */
const transferProductStock = async (req, res) => {
    const { id } = req.params; // Product ID
    const { quantity, fromLocation, toLocation, reason } = req.body;

    const validLocations = ['stockBar', 'stockGeneral'];

    if (!validLocations.includes(fromLocation) || !validLocations.includes(toLocation) || fromLocation === toLocation) {
        return res.status(400).json({ msg: 'Invalid transfer locations specified.' });
    }
    if (typeof quantity !== 'number' || quantity <= 0) {
        return res.status(400).json({ msg: 'Transfer quantity must be a positive number.' });
    }

    try {
        const product = await Product.findById(id).select('name stockBar stockGeneral');
        if (!product) {
            return res.status(404).json({ msg: `Product ID ${id} not found.` });
        }

        const currentStock = product[fromLocation];
        if (currentStock < quantity) {
            return res.status(400).json({
                msg: `Cannot transfer ${quantity}. Only ${currentStock} available in ${fromLocation}.`,
                availableStock: currentStock
            });
        }

        // Create an update object: subtract from one field, add to the other
        const update = {
            $inc: {
                [fromLocation]: -quantity, // Subtract from 'from'
                [toLocation]: quantity    // Add to 'to'
            }
        };

        const oldFromStock = product[fromLocation];
        const oldToStock = product[toLocation];

        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            update,
            { new: true, runValidators: true }
        ).select('name stockBar stockGeneral');

        await createLog('PRODUCT_STOCK_TRANSFERRED', {
            productName: updatedProduct.name,
            from: fromLocation,
            to: toLocation,
            amount: quantity,
            reason: reason || 'Transfer',
            oldFromStock: oldFromStock,
            newFromStock: updatedProduct[fromLocation],
            oldToStock: oldToStock,
            newToStock: updatedProduct[toLocation],
        }, req.user, updatedProduct._id, 'Product');


        res.status(200).json({
            msg: `Stock successfully transferred from ${fromLocation} to ${toLocation}`,
            product: updatedProduct
        });
    } catch (error) {
        console.error("Error in transferProductStock:", error);
        res.status(500).json({ msg: 'Failed to transfer stock.', error: error.message });
    }
};


const adjustInventoryStock = async (req, res) => {
    const { id } = req.params; // Inventory Item ID
    const { adjustmentAmount, stockLocation, reason } = req.body;

    if (!['storeStock', 'generalStock'].includes(stockLocation)) {
        return res.status(400).json({ msg: 'Invalid stock location specified. Must be generalStock or storeStock.' });
    }
    if (typeof adjustmentAmount !== 'number' || adjustmentAmount === 0) {
        return res.status(400).json({ msg: 'Adjustment amount must be a non-zero number.' });
    }

    try {
        // Find inventory item to perform stock check before atomic update
        const item = await Inventory.findById(id).select('name generalStock storeStock');
        if (!item) {
            return res.status(404).json({ msg: `Inventory Item ID ${id} not found.` });
        }

        // Check for insufficient stock only if subtracting (adjustmentAmount is negative)
        if (adjustmentAmount < 0) {
            const currentStock = item[stockLocation];
            const requiredDeduction = Math.abs(adjustmentAmount);

            if (currentStock < requiredDeduction) {
                return res.status(400).json({
                    msg: `Cannot subtract ${requiredDeduction}. Only ${currentStock} available in ${stockLocation.replace('Stock', ' Stock')} location.`,
                    availableStock: currentStock
                });
            }
        }

        // Use $inc for atomic update
        const updatedItem = await Inventory.findByIdAndUpdate(
            id,
            {
                $inc: { [stockLocation]: adjustmentAmount },
                // Optional: You might want to log this adjustment to a separate History collection
            },
            { new: true, runValidators: true }
        ).select('name generalStock storeStock');

        res.status(200).json({ msg: 'Inventory stock adjusted successfully', item: updatedItem });
    } catch (error) {
        res.status(500).json({ msg: 'Failed to adjust inventory stock.', error: error.message });
    }
};

/**
 * Handles transferring stock between generalStock and storeStock for an inventory item (raw material/ingredient).
 */
const transferInventoryStock = async (req, res) => {
    const { id } = req.params; // Inventory Item ID
    const { transferQuantity, fromLocation, toLocation } = req.body;

    const validLocations = ['storeStock', 'generalStock'];

    if (!validLocations.includes(fromLocation) || !validLocations.includes(toLocation) || fromLocation === toLocation) {
        return res.status(400).json({ msg: 'Invalid transfer locations specified. Must be between generalStock and storeStock.' });
    }
    if (typeof transferQuantity !== 'number' || transferQuantity <= 0) {
        return res.status(400).json({ msg: 'Transfer quantity must be a positive number.' });
    }

    try {
        // Find inventory item to perform stock check
        const item = await Inventory.findById(id).select('name generalStock storeStock');
        if (!item) {
            return res.status(404).json({ msg: `Inventory Item ID ${id} not found.` });
        }

        const currentStock = item[fromLocation];
        if (currentStock < transferQuantity) {
            return res.status(400).json({
                msg: `Cannot transfer ${transferQuantity}. Only ${currentStock} available in ${fromLocation.replace('Stock', ' Stock')} location.`,
                availableStock: currentStock
            });
        }

        // Create an update object: subtract from one field, add to the other
        const update = {
            $inc: {
                [fromLocation]: -transferQuantity, // Subtract from 'from'
                [toLocation]: transferQuantity     // Add to 'to'
            }
        };

        const updatedItem = await Inventory.findByIdAndUpdate(
            id,
            update,
            { new: true, runValidators: true }
        ).select('name generalStock storeStock');

        res.status(200).json({
            msg: `Stock successfully transferred from ${fromLocation.replace('Stock', ' Stock')} to ${toLocation.replace('Stock', ' Stock')}`,
            item: updatedItem
        });
    } catch (error) {
        res.status(500).json({ msg: 'Failed to transfer stock.', error: error.message });
    }
};


// ===============================================================
// ** New: Fetch All Transaction Records (Bills) **
// ===============================================================

/**
 * Fetches all finalized transaction records (Bills).
 * Supports optional date range filtering for history viewing.
 */
const getAllTransactions = async (req, res) => {
    const { startDate, endDate } = req.query; // Allow filtering by date

    // Correctly uses the constant: BILL_STATUS.FINAL is 'final'
    let match = { status: BILL_STATUS.FINAL };

    if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) {
            match.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
            // For range query, $lt on the day *after* endDate is usually desired
            const nextDay = new Date(endDate);
            nextDay.setDate(nextDay.getDate() + 1);
            match.createdAt.$lt = nextDay;
        }
    }

    try {
        const transactions = await Bill.find(match)
            .sort({ createdAt: -1 }) // Latest transactions first
            .limit(100) // Limit to a reasonable number for history view
            .select('billNumber total amountPaid creditGiven paymentMethod items customerName createdAt');

        res.status(200).json({
            msg: 'Transaction records fetched successfully.',
            transactions,
            count: transactions.length,
        });
    } catch (error) {
        res.status(500).json({ msg: 'Failed to fetch transaction records.', error: error.message });
    }
};

// ===============================================================
// ** Inventory Reports (for: /inventory/reports) **
// ===============================================================

/**
 * Generates the requested reports: customer debt, total sales by product, total gain by day, and remaining stock.
 *
 * NOTE: The totalRevenueByDay aggregate already serves as the core of an 'End of Day Report'.
 */
const getInventoryReports = async (req, res) => {
    try {
        // Correctly uses the constant: BILL_STATUS.FINAL is 'final'
        const finalStatusMatch = { status: BILL_STATUS.FINAL };

        // 1. Reports of bills with customer debt (creditGiven > 0)
        const customerDebtReport = await Bill.aggregate([
            { $match: { ...finalStatusMatch, creditGiven: { $gt: 0 } } },
            {
                $group: {
                    _id: '$customer',
                    customerName: { $first: '$customerName' },
                    totalDebt: { $sum: '$creditGiven' },
                    lastBillDate: { $max: '$createdAt' }
                }
            },
            { $sort: { totalDebt: -1 } }
        ]);

        // 2. Total sales by product item
        const totalSalesByProduct = await Bill.aggregate([
            { $match: finalStatusMatch },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.product',
                    productName: { $first: '$items.name' },
                    totalQuantitySold: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: '$items.total' },
                    price: { $first: '$items.price' },
                    category: { $first: '$items.category' }
                }
            },
            { $sort: { totalQuantitySold: -1 } }
        ]);

        // 3. Total gain/revenue by day (The core "End of Day" summary)
        const totalRevenueByDay = await Bill.aggregate([
            { $match: finalStatusMatch },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    totalRevenue: { $sum: '$total' },
                    totalBills: { $sum: 1 },
                }
            },
            { $sort: { _id: -1 } }
        ]);

        // 4. Remaining stock report from the core Product model (Saleable Items)
        const remainingProductStock = await Product.find({ isStockTracked: true })
            .select('name stockBar stockGeneral category isStockTracked price buyPrice');

        // 5. Calculate Gain/Profit Metrics
        let totalPotentialGain = 0;
        const productsWithGain = remainingProductStock.map(product => {
            const gainPerUnit = product.price - product.buyPrice;
            const totalStock = product.stockBar + product.stockGeneral;
            const potentialGain = gainPerUnit * totalStock;
            totalPotentialGain += potentialGain;

            return {
                ...product._doc,
                gainPerUnit: gainPerUnit,
                totalStock: totalStock,
                potentialGain: potentialGain,
            };
        });

        // 6. Remaining stock report from the core Inventory model (Ingredients/Raw Materials)
        const remainingInventoryStock = await Inventory.find({})
            .select('name generalStock storeStock unit category');

        res.status(200).json({
            msg: 'Inventory reports generated successfully.',
            customerDebtReport,
            totalSalesByProduct,
            totalRevenueByDay,
            remainingProductStock: productsWithGain, // <-- USE the new array with gain data
            totalPotentialGain: totalPotentialGain,
            remainingInventoryStock,
        });

    } catch (error) {
        res.status(500).json({ msg: 'Internal Server Error during report generation.', error: error.message });
    }
};

const getStaffPerformanceReport = async (req, res) => {
    try {
        const staffPerformance = await Bill.aggregate([
            // 1. Filtrer uniquement les factures finalisées (using BILL_STATUS.FINAL)
            { $match: { status: BILL_STATUS.FINAL } },

            // 2. Grouper par l'utilisateur (le staff) qui a créé la facture
            {
                $group: {
                    _id: "$createdBy",
                    totalRevenue: { $sum: "$total" }, // Utiliser 'total' pour le revenu
                    totalSalesCount: { $sum: 1 },
                }
            },

            // 3. Trier par revenu total décroissant
            { $sort: { totalRevenue: -1 } }
        ]);

        // 4. Joindre les détails du personnel (nom/email)
        await Bill.populate(staffPerformance, {
            path: '_id',
            select: 'name email',
            model: 'User'
        });

        const formattedReport = staffPerformance
            .filter(item => item._id)
            .map(item => ({
                staffId: item._id._id,
                staffName: item._id.name,
                totalRevenue: item.totalRevenue,
                totalSalesCount: item.totalSalesCount,
            }));

        res.status(200).json({
            msg: 'Données de performance du personnel récupérées avec succès.',
            staffPerformance: formattedReport,
        });

    } catch (error) {
        res.status(500).json({
            msg: 'Erreur Serveur Interne lors de la génération du rapport de performance du personnel.',
            error: error.message
        });
    }
};

const getStaffPerformanceDashboard = async (req, res) => {
    try {
        const staff = await User.find({ role: { $in: ['waiter', 'cashier', 'manager'] } })
            .select('name performancePoints lastMonthPoints role')
            .sort({ performancePoints: -1 });

        const bestUser = staff.length > 0 ? staff[0] : null;

        res.status(200).json({
            staffPerformance: staff,
            bestUserOfMonth: bestUser,
        });

    } catch (error) {
        res.status(500).json({ msg: 'Internal Server Error during staff performance retrieval.' });
    }
};

/**
 * @desc Generate a report of all audit logs (Request 1)
 * @route GET /api/v1/inventory/reports/audit-logs
 */
const getAuditLogs = async (req, res) => {
    try {
        const logs = await AuditLog.find({})
            .sort({ createdAt: -1 })
            .limit(500);

        res.status(200).json({ logs, count: logs.length });
    } catch (error) {
        res.status(500).json({ msg: 'Failed to retrieve audit logs.' });
    }
};

/**
 * Generates a report of product sales filtered by waiter/staff ID and an optional date range.
 * @route GET /api/v1/inventory/reports/product-sales-by-staff
 */
const getStaffProductSales = async (req, res) => {
    const { waiterId, startDate, endDate } = req.query;

    if (!waiterId) {
        return res.status(400).json({ msg: 'Waiter ID is required for staff product sales report.' });
    }

    // Correctly uses the constant: BILL_STATUS.FINAL is 'final'
    let match = {
        status: BILL_STATUS.FINAL,
        createdBy: new mongoose.Types.ObjectId(waiterId) // Filter by staff
    };

    if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) {
            match.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
            // Include the whole end day
            const nextDay = new Date(endDate);
            nextDay.setDate(nextDay.getDate() + 1);
            match.createdAt.$lt = nextDay;
        }
    }

    try {
        const staffProductSales = await Bill.aggregate([
            { $match: match }, // Apply staff and date filtering
            { $unwind: '$items' }, // Deconstruct the items array
            {
                $group: {
                    _id: '$items.product', // Group by product ID
                    productName: { $first: '$items.name' },
                    totalQuantitySold: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: '$items.total' },
                    price: { $first: '$items.price' },
                    category: { $first: '$items.category' },
                }
            },
            { $sort: { totalQuantitySold: -1 } }
        ]);

        res.status(200).json({
            msg: `Product sales report for staff ${waiterId} fetched successfully.`,
            staffProductSales,
        });

    } catch (error) {
        console.error("Error in getStaffProductSales:", error);
        res.status(500).json({ msg: 'Failed to generate staff product sales report.', error: error.message });
    }
};

const getDailySummaryReport = async (req, res) => {
    // 1. Définir les limites de temps (Début et fin de la journée)
    const { date } = req.query; // Format YYYY-MM-DD
    if (!date) {
        return res.status(400).json({ msg: "Le paramètre 'date' est requis (YYYY-MM-DD)." });
    }

    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0); 
    
    const endOfDay = new Date(date);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
    endOfDay.setUTCHours(0, 0, 0, 0); 

    try {
        const dateMatch = { createdAt: { $gte: startOfDay, $lt: endOfDay }, status: BILL_STATUS.FINAL };
        
        // --- 2. Agrégation FINANCIÈRE (Revenue, Montant Payé, Crédit, Profit) ---
        // Utilisation de $project pour le calcul du profit par article avant de grouper par facture
        const financialAndProfitAggregation = await Bill.aggregate([
            { $match: dateMatch },
            { $unwind: '$items' },
            
            // Calcul du profit par article vendu (pour éviter d'unwind deux fois)
            { $addFields: {
                itemProfit: {
                    $multiply: [
                        '$items.quantity', 
                        { $subtract: [
                            { $ifNull: ['$items.price', { $divide: ['$items.total', '$items.quantity'] }] }, 
                            { $ifNull: ['$items.buyPrice', 0] }
                        ] }
                    ]
                }
            }},
            
            // 🎯 CORRECTION MAJEURE: Regroupement par ID de facture pour s'assurer que les totaux ne sont comptés qu'une seule fois
            { 
                $group: {
                    _id: '$_id', // Groupe par ID de facture (document)
                    billTotal: { $first: '$total' },
                    billAmountPaid: { $first: '$amountPaid' }, // Montant Payé non dédoublé
                    totalProfit: { $sum: '$itemProfit' }, // Somme du profit de tous les articles de cette facture
                }
            },
            
            // Regroupement final (toutes les factures)
            { 
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$billTotal' },
                    totalAmountPaid: { $sum: { $toDouble: { $ifNull: ['$billAmountPaid', 0] } } }, // Application de $toDouble ici
                    totalProfit: { $sum: '$totalProfit' },
                    
                    // Calcul du total des nouveaux crédits (ne compte pas les remboursements de crédit antérieur)
                    totalNewCredit: { 
                        $sum: { 
                            $cond: [
                                { $gt: ['$billTotal', '$billAmountPaid'] }, 
                                { $subtract: ['$billTotal', '$billAmountPaid'] }, 
                                0
                            ]
                        }
                    },
                }
            },
            { $project: { _id: 0, totalRevenue: 1, totalAmountPaid: 1, totalProfit: 1, totalNewCredit: 1 } }
        ]);

        const financialSummary = financialAndProfitAggregation[0] || { 
            totalRevenue: 0, 
            totalAmountPaid: 0, 
            totalProfit: 0, 
            totalNewCredit: 0 
        };
        
        // --- 3. Clients ayant pris du Crédit (Debt) - LA LOGIQUE DEJA OK ---
        const billsWithCredit = await Bill.find({
            createdAt: { $gte: startOfDay, $lt: endOfDay },
            status: BILL_STATUS.FINAL, 
            $expr: { $gt: ["$total", "$amountPaid"] }, 
            customer: { $exists: true, $ne: null } 
        })
        .select('customer total amountPaid')
        .populate('customer', 'name'); 

        const customersWithCredit = billsWithCredit
            .filter(bill => bill.customer)
            .map(bill => ({
                customerId: bill.customer._id,
                customerName: bill.customer.name || `Client ID: ${bill.customer._id.toString().slice(-6)}`,
                value: bill.total - bill.amountPaid 
            }));


        // --- 4. Bouteilles/Articles Sauvegardés (Bottles Saved) - VÉRIFICATION DES LOGS ---
        // (Vérifier la collection AuditLog)
        const bottlesSavedLogs = await AuditLog.aggregate([
            { $match: {
                action: { $in: ['BOTTLE_SAVED', 'PRODUCT_SAVED'] }, 
                createdAt: { $gte: startOfDay, $lt: endOfDay },
            }},
            // ... (reste de l'agrégation inchangée)
            { $group: {
                _id: '$details.productId', 
                productName: { $first: '$details.productName' },
                quantity: { $sum: { $toInt: { $ifNull: ['$details.quantity', "0"] } } } 
            }},
            { $project: {
                _id: 0, productId: '$_id', productName: { $ifNull: ["$productName", "Article Inconnu"] }, value: '$quantity'
            }}
        ]);
        

        // --- 5. Stock (Fin de Journée & Faible Stock) ---
        const allProducts = await Product.find({ isActive: true }).select('name stockBar minThreshold');
        
        const stockBarEnd = allProducts.reduce((sum, p) => sum + (p.stockBar || 0), 0);
        
        // 🚨 CORRECTION DU STOCK: RETIRER LA SIMULATION DE DÉBUT DE JOURNÉE
        const stockBarStart = null; // Nous n'avons pas la donnée sans log
        const netMovement = null; 

        // Produits en faible stock (Low Stock)
        const lowStockProducts = allProducts
            .filter(p => {
                const stock = p.stockBar || 0;
                const threshold = p.minThreshold || 10;
                return stock > 0 && stock < threshold;
            })
            .map(p => ({
                productId: p._id,
                productName: p.name,
                value: p.stockBar || 0
            }));


        // --- 6. Assembler le Rapport Final ---
        const finalReport = {
            // Financier
            totalRevenue: financialSummary.totalRevenue,
            totalProfit: financialSummary.totalProfit,
            totalAmountPaid: financialSummary.totalAmountPaid,
            totalNewCredit: financialSummary.totalNewCredit,
            
            // Opérationnel
            customersWithCredit,
            bottlesSaved: bottlesSavedLogs,

            // Stock
            stockBarStart: stockBarStart, 
            stockBarEnd: stockBarEnd, 
            netMovement: netMovement, // Ajout de ce champ pour clarification
            lowStockProducts
        };

        res.json(finalReport);

    } catch (err) {
        console.error("Erreur lors de la génération du rapport quotidien :", err);
        res.status(500).json({ msg: "Erreur serveur lors de la récupération du résumé quotidien. Détails dans les logs du serveur." });
    }
};


const getDetailedProductInventoryReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query; 

        // 1. Définition de la période (Logique de date UTC-SAFE)
        const dateFilter = {};
        let startObj = null;
        let endObj = null;
        
        if (startDate) {
            startObj = new Date(startDate);
            startObj.setUTCHours(0, 0, 0, 0); 
            dateFilter.createdAt = { $gte: startObj };
        }
        
        if (endDate) {
            endObj = new Date(endDate);
            endObj.setUTCDate(endObj.getUTCDate() + 1); 
            endObj.setUTCHours(0, 0, 0, 0); 
            
            dateFilter.createdAt = { 
                ...(dateFilter.createdAt || {}), 
                $lt: endObj
            }; 
        }

        const debugInfo = {
            message: "Rapport généré avec succès.",
            mongoDBFilter: { status: BILL_STATUS.FINAL, ...dateFilter },
            startISODate: startObj,
            endISODate: endObj,
        };

        // 2. Agrégation des données de Vente à partir des factures (AVEC CORRECTION DU BÉNÉFICE)
        const salesAggregation = await Bill.aggregate([
            { $match: { 
                status: BILL_STATUS.FINAL, 
                ...dateFilter 
            }},
            { $unwind: '$items' },
            
            // 1. Filtrer les items qui ont un ID de produit (champ 'product')
            { $match: { 'items.product': { $ne: null } } }, 
            
            // ➡️ ÉTAPE CLÉ 1: Récupérer le prix d'achat actuel du produit
            {
                $lookup: {
                    from: 'products', // 🚨 Assurez-vous que le nom de votre collection de produits est bien 'products'
                    localField: 'items.product',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            // ➡️ ÉTAPE CLÉ 2: Extraire le buyPrice de l'objet produit joint
            {
                $addFields: {
                    // Utiliser le buyPrice enregistré dans la facture si disponible, sinon le buyPrice actuel du produit
                    cogsSourcePrice: { 
                        $ifNull: [
                            '$items.buyPrice', // Tente d'utiliser le prix d'achat historique (si enregistré)
                            { $arrayElemAt: ['$productInfo.buyPrice', 0] } // Utilise le prix d'achat actuel (via lookup)
                        ]
                    }
                }
            },

            // 3. Regroupement final
            { $group: {
                _id: '$items.product', // Groupement par l'ID du produit
                productName: { $first: '$items.name' }, 
                totalQuantitySold: { $sum: '$items.quantity' },
                totalRevenue: { $sum: { $ifNull: ['$items.total', 0] } }, 
                
                // Calcul du COGS (Coût des marchandises vendues)
                totalCogs: { 
                    $sum: { 
                        $multiply: [
                            '$items.quantity', 
                            { $ifNull: ['$cogsSourcePrice', 0] } // Utilise le prix d'achat trouvé/joint
                        ] 
                    } 
                }, 
            }},
            { $addFields: {
                // Calcul du Bénéfice
                totalProfit: { $subtract: ['$totalRevenue', '$totalCogs'] }
            }}
        ]);
        
        // Créer une carte pour une recherche rapide par ID de produit
        const salesMap = salesAggregation.reduce((acc, item) => {
            acc[item._id.toString()] = item;
            return acc;
        }, {});


        // 3. Récupérer TOUS les produits (pour le stock actuel)
        const allProducts = await Product.find({}).select('name stockBar stockGeneral'); 

        // 4. Fusionner les données
        const report = allProducts.map(product => {
            const salesItem = salesMap[product._id.toString()];

            return {
                productId: product._id,
                productName: product.name,
                
                // Données de Vente
                totalQuantitySold: salesItem ? salesItem.totalQuantitySold : 0,
                totalRevenue: salesItem ? salesItem.totalRevenue : 0,
                totalCogs: salesItem ? salesItem.totalCogs : 0,
                totalProfit: salesItem ? salesItem.totalProfit : 0,
                
                // Données de Stock
                currentStockBar: product.stockBar || 0,
                currentStockGeneral: product.stockGeneral || 0,
            };
        });

        // 5. Retourner le rapport
        res.json({ report: report, debugInfo: debugInfo });

    } catch (err) {
        console.error("Erreur lors de la génération du rapport détaillé d'inventaire :", err);
        res.status(500).json({ 
            msg: "Erreur serveur lors de la récupération du rapport détaillé. Détails dans les logs du serveur.",
            debugInfo: { message: `Erreur serveur : ${err.message}` } 
        });
    }
};

// ** EXPORT ALL CONTROLLER FUNCTIONS **
module.exports = {
    adjustInventoryStock,
    transferInventoryStock,
    adjustProductStock,
    getDetailedProductInventoryReport,
    transferProductStock,
    getInventoryReports,
    getAllTransactions,
    getStaffPerformanceDashboard,
    getAuditLogs,
    getStaffPerformanceReport,
    getStaffProductSales,
    getDailySummaryReport,
};