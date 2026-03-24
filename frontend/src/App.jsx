import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import NavBar from "./components/NavBar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Drafts from "./pages/Drafts";
import PosTerminal from "./pages/PosTerminal";
import Inventory from "./pages/Inventory";
import UserManagement from "./pages/UserManagement";
import ProductManagement from "./pages/ProductManagement";
import WaiterPerformancePage from "./pages/WaiterPerformance";
import AutoLockWrapper from "./components/AutoLockWrapper";

import AddBuffetItem from "./pages/AddBuffetItem";
import BuffetDrafts from "./pages/BuffetDrafts";
import BuffetReports from "./pages/BuffetReports";


// Buffet Pages (Ensure these are imported)
import BuffetComposer from "./pages/BuffetComposer";
import BuffetInventory from "./pages/BuffetInventory";

import SalesReports from "./components/SalesReports";
import CustomerManagement from "./pages/CustomerManagement";

import "./App.css";
import "./style.css";
import "./posTerminal.css";
import Reports from "./pages/Reports";
import FinalizedBills from "./pages/FinalizedBills";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import Contact from "./pages/ContactPage";
import Gallery from "./pages/GalleryPage";
import SavedBottlesPage from "./pages/SavedBottlesPage";
import { ToastContainer } from "react-toastify/unstyled";
import BillHistory from "./pages/BillHistory";

import 'react-toastify/dist/ReactToastify.css';
import MovementWaiter from "./pages/MovementWaiter";


// Component to protect routes based on role
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="text-center py-5">
        Vérification de l'authentification...
      </div>
    );
  }

  if (!user || !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // If a buffet user tries to access the standard dashboard, redirect them to their composer
    if (user.role === "buffet")
      return <Navigate to="/buffet/composer" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </Router>
  );
};

const AppLayout = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  const RootRedirect = () => {
    if (isLoading) {
      return (
        <div className="text-center py-5">Chargement de la session...</div>
      );
    }
    if (!isAuthenticated) return <Navigate to="/login" replace />;

    // Redirect based on role at root
    return user.role === "buffet" ? (
      <Navigate to="/buffet/composer" replace />
    ) : (
      <Navigate to="/dashboard" replace />
    );
  };

  return (
    <>
      <ToastContainer 
    position="top-right" 
    autoClose={3000} 
    theme="colored"
    style={{ zIndex: 9999 }} // Force le toast à être au-dessus des modals
/>
      {isAuthenticated && <NavBar />}
      <div className="container-fluid py-3">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/Gallery" element={<Gallery />} />

          {/* --- BUFFET SPECIFIC ROUTES --- */}
          <Route
            path="/buffet/composer"
            element={
              <ProtectedRoute allowedRoles={["buffet", "admin", "manager"]}>
                <AutoLockWrapper allowedRoles={["buffet"]}>
                  <BuffetComposer />
                </AutoLockWrapper>
              </ProtectedRoute>
            }
          />
          {/* <Route
            path="/buffet/drafts"
            element={
              <ProtectedRoute allowedRoles={["buffet", "admin", "manager"]}>
                <Drafts userId={user?.userId} user={user} isBuffetMode={true} />
              </ProtectedRoute>
            }
          /> */}
          <Route
            path="/buffet/inventory"
            element={
              <ProtectedRoute allowedRoles={["buffet", "admin", "manager"]}>
                <BuffetInventory />
              </ProtectedRoute>
            }
          />
          <Route
  path="/buffet/reports"
  element={
    <ProtectedRoute allowedRoles={["admin", "manager", "buffet"]}>
      <BuffetReports />
    </ProtectedRoute>
  }
/>
<Route
  path="/buffet/drafts"
  element={
    <ProtectedRoute allowedRoles={["admin", "manager", "waiter", "buffet", "cashier"]}>
      <BuffetDrafts />
    </ProtectedRoute>
  }
/>

          <Route
            path="/add-buffet-item"
            element={
              <ProtectedRoute allowedRoles={["admin", "manager", "buffet"]}>
                <AddBuffetItem />
              </ProtectedRoute>
            }
          />

          <Route
            path="/movement"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <MovementWaiter />
              </ProtectedRoute>
            }
          />

          {/* Standard Protected Routes */}
          <Route
            path="/register"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Register />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bills"
            element={
              <ProtectedRoute allowedRoles={["admin", "manager", "cashier"]}>
                <FinalizedBills />
              </ProtectedRoute>
            }
          />
          <Route
            path="/performances"
            element={
              <ProtectedRoute allowedRoles={["admin", "manager"]}>
                <WaiterPerformancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report"
            element={
              <ProtectedRoute allowedRoles={["admin", "manager"]}>
                <SalesReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dept"
            element={
              <ProtectedRoute allowedRoles={["admin", "manager"]}>
                <CustomerManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <BillHistory user={user} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute
                allowedRoles={["admin", "manager", "cashier", "waiter"]}
              >
                <AutoLockWrapper allowedRoles={["waiter"]}>
                  <PosTerminal />
                </AutoLockWrapper>
              </ProtectedRoute>
            }
          />

          <Route
            path="/pos"
            element={
              <ProtectedRoute
                allowedRoles={["waiter", "cashier", "manager", "admin"]}
              >
                <AutoLockWrapper allowedRoles={["waiter"]}>
                  <PosTerminal />
                </AutoLockWrapper>
              </ProtectedRoute>
            }
          />

          <Route
            path="/inventory"
            element={
              <ProtectedRoute allowedRoles={["manager", "admin"]}>
                <Inventory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/drafts"
            element={
              <ProtectedRoute
                allowedRoles={["admin", "manager", "cashier", "waiter"]}
              >
                <Drafts userId={user?.userId} user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={["admin", "manager"]}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute allowedRoles={["admin", "manager"]}>
                <ProductManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/savebottle"
            element={
              <ProtectedRoute allowedRoles={["admin", "manager"]}>
                <SavedBottlesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute allowedRoles={["admin", "manager"]}>
                <CustomerManagement />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<RootRedirect />} />
          <Route
            path="*"
            element={<h1 className="text-center py-5">404 Not Found</h1>}
          />
        </Routes>
      </div>
    </>
  );
};

export default App;
