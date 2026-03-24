import React, { createContext, useContext, useState, useMemo } from 'react';

// 1. Create the Context object
const PosStateContext = createContext();

/**
 * Custom hook to consume the POS state context.
 * @returns {{
 * cart: Array<Object>,
 * setCart: Function,
 * customer: Object | null,
 * setCustomer: Function,
 * draftIds: Array<string>,
 * setDraftIds: Function,
 * clearCart: Function,
 * cartTotal: number,
 * removeCustomer: Function
 * }}
 */
export const usePosState = () => {
  const context = useContext(PosStateContext);
  if (!context) {
    throw new Error('usePosState must be used within a PosStateProvider');
  }
  return context;
};

// 2. Create the Provider component
export const PosStateProvider = ({ children }) => {
  // State variables for the current transaction
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [draftIds, setDraftIds] = useState([]); // Array to store merged draft IDs

  // Utility to calculate cart total
  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cart]);

  // Utility to clear the entire transaction
  const clearCart = () => {
    setCart([]);
    setCustomer(null);
    setDraftIds([]);
  };

  const removeCustomer = () => {
    setCustomer(null);
  }

  // Value provided to consumers
  const contextValue = useMemo(() => ({
    cart,
    setCart,
    customer,
    setCustomer,
    draftIds,
    setDraftIds,
    clearCart,
    cartTotal,
    removeCustomer
  }), [cart, customer, draftIds, cartTotal]);


  return (
    <PosStateContext.Provider value={contextValue}>
      {children}
    </PosStateContext.Provider>
  );
};

export default PosStateProvider;