// controllers/reportController.js

const mongoose = require('mongoose');
const Bill = require('../models/BillModel');
const Customer = require('../models/CustomerModel');
const Product = require('../models/ProductModel'); // Needed for COGS/Profit calculation
// Assuming BILL_STATUS is accessible, e.g., from '../utils/constants'
// For simplicity, we'll hardcode the constant here, but ideally, you'd import it.
const BILL_STATUS = {
    DRAFT: 'DRAFT',
    CONFIRMED: 'CONFIRMED',
    FINALIZED: 'FINALIZED',
    CANCELED: 'CANCELED',
}; 
// --- NOTE: You must set up a Product Cost field for 'Profit' calculation ---
// Assuming ProductModel has a 'costOfGoods' field for COGS calculation.
// If not, the 'Profit' metric will not be accurate.

/**
 * Generates a high-level summary of sales, revenue, and customer debt.
 */
const getSalesAndDebtSummary = async (req, res) => {
    try {
        // --- 1. Sales and Revenue Aggregation ---
        const salesAggregation = await Bill.aggregate([
            { $match: { status: BILL_STATUS.FINALIZED } }, // Only count finalized bills
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$total' }, // Total value of sales
                    totalAmountPaid: { $sum: '$amountPaid' }, // Cash/Card received
                    totalCreditUsed: { $sum: '$creditUsed' },
                    totalCreditGiven: { $sum: '$creditGiven' },
                    totalBills: { $sum: 1 }
                }
            }
        ]);

        // --- 2. Customer Debt/Credit Aggregation ---
        const debtAggregation = await Customer.aggregate([
            {
                $group: {
                    _id: null,
                    // Sum of negative balances (customers who owe us)
                    totalCustomerDebt: {
                        $sum: {
                            $cond: [{ $lt: ['$creditBalance', 0] }, '$creditBalance', 0]
                        }
                    },
                    // Sum of positive balances (credit we owe customers)
                    totalOurCredit: {
                        $sum: {
                            $cond: [{ $gt: ['$creditBalance', 0] }, '$creditBalance', 0]
                        }
                    },
                }
            }
        ]);

        // --- 3. List of Debtors (Customers Who Owe Us) ---
        const debtors = await Customer.find({ creditBalance: { $lt: 0 } })
            .select('name creditBalance phone')
            .sort({ creditBalance: 1 }) // Highest negative balance first
            .limit(10);

        // --- 4. List of Creditors (Customers We Owe) ---
        const creditors = await Customer.find({ creditBalance: { $gt: 0 } })
            .select('name creditBalance phone')
            .sort({ creditBalance: -1 }) // Highest positive balance first
            .limit(10);

        const summary = {
            sales: salesAggregation[0] || { 
                totalRevenue: 0, 
                totalAmountPaid: 0, 
                totalCreditUsed: 0, 
                totalCreditGiven: 0, 
                totalBills: 0 
            },
            debtSummary: debtAggregation[0] || { 
                totalCustomerDebt: 0, 
                totalOurCredit: 0 
            },
            topDebtors: debtors,
            topCreditors: creditors,
        };

        res.status(200).json(summary);

    } catch (error) {
        console.error('Report Generation Error:', error);
        res.status(500).json({ msg: 'Failed to generate financial summary report.' });
    }
};

/**
 * Generates a detailed breakdown of products sold and sales by waiter.
 */
const getProductAndWaiterReports = async (req, res) => {
    try {
        // --- 1. Product Sales Breakdown ---
        const productSales = await Bill.aggregate([
            { $match: { status: BILL_STATUS.FINALIZED } },
            { $unwind: '$items' }, // Deconstruct the items array
            {
                $group: {
                    _id: '$items.product',
                    productName: { $first: '$items.name' },
                    totalQuantitySold: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: '$items.total' },
                }
            },
            { $sort: { totalQuantitySold: -1 } }
        ]);

        // --- 2. Waiter Performance Breakdown ---
        const waiterSales = await Bill.aggregate([
            { $match: { status: BILL_STATUS.FINALIZED } },
            {
                $group: {
                    // Group by the waiter's name/ID
                    _id: '$waiter', 
                    waiterName: { $first: '$waiterName' },
                    totalBills: { $sum: 1 },
                    totalRevenue: { $sum: '$total' },
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);

        res.status(200).json({ productSales, waiterSales });

    } catch (error) {
        console.error('Report Generation Error:', error);
        res.status(500).json({ msg: 'Failed to generate product and waiter reports.' });
    }
};

module.exports = {
    getSalesAndDebtSummary,
    getProductAndWaiterReports,
};