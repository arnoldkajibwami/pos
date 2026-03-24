import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API_URL = 'https://posbackend-usko.onrender.com/api/v1';
// const API_URL = 'http://localhost:5000/api/v1';  // test

export const API = axios.create({ 
  baseURL: 'https://posbackend-usko.onrender.com/api/v1'
});


export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Integrated States for AutoLockWrapper
  const [isPrinting, setIsPrinting] = useState(false); // State to pause inactivity timer
  const [isLocked, setIsLocked] = useState(false); // State for session lock status

  // Helper function to set user state and local storage
  const setAuthData = (user, token) => {
    setUser(user);
    setToken(token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setIsLocked(false); // Ensure session is unlocked upon successful login/auth refresh
  };

  // Function to check token validity by attempting an authenticated request
  const checkTokenValidity = async (storedToken) => {
    try {
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      // Using a protected endpoint that returns a successful response for a valid token
      await axios.get(`${API_URL}/users`);

      console.log("Token validated successfully.");
      return true;

    } catch (error) {
      console.error("Token invalid or expired.", error.message);
      return false;
    }
  };

  // Load user from local storage and validate token on initial load
  useEffect(() => {
    const initializeAuth = async () => {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');

      if (storedUser && storedToken) {
        const isValid = await checkTokenValidity(storedToken);

        if (isValid) {
          setAuthData(JSON.parse(storedUser), storedToken);
        } else {
          logout();
        }
      }
      setIsLoading(false); // Authentication check complete
    };

    initializeAuth();
    // Ensure axios defaults are cleared on component unmount
    return () => delete axios.defaults.headers.common['Authorization'];
  }, []);

  // --- Standard Email/Password Login (Admin/Manager) ---
  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { user, token } = response.data;
      setAuthData(user, token);
      return response.data;
    } catch (error) {
      throw error.response?.data?.msg || 'Login failed';
    }
  };

  // --- PIN Login (Waiter/Cashier & Unlock Session) ---
  // This function is used both for initial PIN login and for session unlock
  const pinLogin = async (pin) => {
    try {
      const response = await axios.post(`${API_URL}/auth/pin-login`, { pin });
      const { user, token } = response.data;
      // If successful, update auth data and set isLocked to false via setAuthData
      setAuthData(user, token);
      return response.data;
    } catch (error) {
      throw error.response?.data?.msg || 'PIN Login failed';
    }
  };

  // --- Session Management ---

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsLocked(false); // Ensure session is unlocked upon full logout
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  const lockSession = () => {
    console.log('Session auto-locked due to inactivity.');
    setIsLocked(true);
  };

  // Since pinLogin now handles the core authentication and sets isLocked=false on success,
  // we can remove the redundant `unlockSession` and use `pinLogin` directly in the wrapper component.
  // However, to preserve the explicit function signature for clarity, let's keep it as a wrapper.
  const unlockSession = async (pin) => {
    await pinLogin(pin);
  };

  // --- Role Helpers ---
  const isManagerOrAdmin = user && (user.role === 'manager' || user.role === 'admin');
  const isWaiter = user && user.role === 'waiter';
  const isCashierOrHigher = user && (user.role === 'cashier' || isManagerOrAdmin);

  const value = {
    user,
    token,
    isLoading,
    login,
    pinLogin,
    logout,
    // Session States & Actions
    isPrinting,
    setIsPrinting,
    isLocked,
    lockSession,
    unlockSession,
    // Role Helpers
    isManagerOrAdmin,
    isWaiter,
    isCashierOrHigher,
    isAuthenticated: !!user,
    isAuthenticating: isLoading, // Exposing isLoading as isAuthenticating for clarity
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
