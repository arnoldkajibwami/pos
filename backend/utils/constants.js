// utils/constants.js

const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  CASHIER: 'cashier',
  WAITER: 'waiter',
  BUFFET: 'buffet',
};

const BILL_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending', 
  FINAL: 'final',
  ARCHIVED: 'archived', 
};

const PAYMENT_STATUS = {
  PAID: 'paid',
  CREDIT: 'credit',
  HALF_PAID: 'half-paid',
};

module.exports = {
  USER_ROLES,
  BILL_STATUS,
  PAYMENT_STATUS,
};