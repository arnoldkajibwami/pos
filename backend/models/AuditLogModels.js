// models/AuditLogModel.js

const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        // Examples: 'BILL_FINALIZED', 'CUSTOMER_DEBT_PAID', 'STOCK_BAR_DEDUCTED'
    },
    details: {
        type: String, // Store a JSON string of relevant data (e.g., old vs new values)
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    userName: String,
    userRole: String,
    targetId: { // ID of the entity that was affected
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    targetType: { // Type of the affected entity
        type: String,
        enum: ['Bill', 'Customer', 'Product', 'Inventory', 'User', null],
        default: null,
    },
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', AuditLogSchema);