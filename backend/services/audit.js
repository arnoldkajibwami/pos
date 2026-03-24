const AuditLog = require('../models/AuditLog');
/**
 * Logs a critical action to the audit trail.
 * @param {object} req - The Express request object, containing req.user
 * @param {string} action_type - e.g., 'CREATE', 'UPDATE', 'LOGIN', 'DEBT_INCURRED'
 * @param {string} target_collection - e.g., 'Customer', 'InventoryItem', 'Staff'
 * @param {string} target_id - The MongoDB ID of the affected resource
 * @param {object} change_details - Any additional details about the action
 */
exports.logAudit = async (req, action_type, target_collection, target_id, change_details = {}) => {
    try {
        // Ensure user exists (should be guaranteed by 'protect' middleware)
        const staffId = req.user ? req.user._id : null;
        const staffRole = req.user ? req.user.role : 'System';

        await AuditLog.create({
            staff_id: staffId, 
            staff_role: staffRole,
            action_type,
            target_collection,
            target_id,
            change_details: { ...change_details, ip_address: req.ip || 'N/A' },
        });
    } catch (error) {
        // Log the failure to audit, but do NOT crash the main process/request
        console.error('⚠️ Audit Log failed to save:', error.message);
    }
};