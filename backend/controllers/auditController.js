const AuditLog = require('../models/AuditLogModels');
// Assuming constants for roles
const { USER_ROLES } = require('../utils/constants'); 

// Utility to create a log entry (used in other controllers)
const createAuditLog = async ({ user, action, entityType, entityId, description, oldValue = null, newValue = null }) => {
    try {
        // Find the user's name for the log record (assuming user object from req.user)
        const userName = user.name || (await User.findById(user._id).select('name'))?.name || 'System';

        await AuditLog.create({
            user: user._id,
            userName,
            action,
            entityType,
            entityId,
            description,
            oldValue,
            newValue,
        });
    } catch (error) {
        console.error('Audit Log Error:', error);
        // Do not block the main transaction for a logging error
    }
};

const getAuditLogs = async (req, res) => {
    try {
        // Only Admin/Manager should see all audit logs
        if (req.user.role !== USER_ROLES.ADMIN && req.user.role !== USER_ROLES.MANAGER) {
            return res.status(403).json({ msg: 'Access denied. Only managers and admins can view audit logs.' });
        }

        const { limit = 50, skip = 0, sort = '-createdAt', entityType, action } = req.query;
        const query = {};

        if (entityType) {
            query.entityType = entityType;
        }
        if (action) {
            query.action = action;
        }

        const logs = await AuditLog.find(query)
            .sort(sort)
            .limit(parseInt(limit))
            .skip(parseInt(skip));

        const totalCount = await AuditLog.countDocuments(query);

        res.status(200).json({ logs, count: totalCount });

    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ msg: 'Failed to retrieve audit logs.' });
    }
};


module.exports = {
    createAuditLog,
    getAuditLogs,
};