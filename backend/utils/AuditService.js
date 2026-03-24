// utils/AuditService.js (Updated for robust null/undefined handling)

const AuditLog = require('../models/AuditLogModels');

/**
 * Creates a new audit log entry.
 * @param {string} action - The action type (e.g., 'BILL_FINALIZED').
 * @param {object} details - The detailed payload for the log.
 * @param {object} user - The authenticated user object (must have _id or userId, name, role).
 * @param {string | null} targetId - ID of the affected entity.
 * @param {string | null} targetType - Type of the affected entity.
 */
const createLog = async (action, details, user, targetId = null, targetType = null) => {
    // Use a safe fallback for the user object if it's undefined
    const safeUser = user || { _id: null, name: 'System/Unknown', role: 'SYSTEM' };

    try {
        await AuditLog.create({
            action,
            details: JSON.stringify(details),
            // Access properties safely, prioritizing _id which is standard for Mongoose
            user: safeUser._id || safeUser.userId || null,
            userName: safeUser.name,
            userRole: safeUser.role,
            targetId,
            targetType,
        });
    } catch (error) {
        // IMPORTANT: Log the error but do NOT halt the main transaction
        console.error('Failed to create audit log:', error);
    }
};

module.exports = { createLog };