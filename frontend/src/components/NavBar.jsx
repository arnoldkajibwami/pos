import React, { useState } from "react";
import { Navbar, Nav, Container, Button, Badge } from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";
import { useAuth } from "../context/AuthContext";
import {
  Package, Users, LogOut, Receipt, FileText, ShoppingCart,
  Warehouse, UserCheck, Beer, PlusCircle, Menu,
  UtensilsCrossed, ClipboardList, LayoutDashboard, WorkflowIcon
} from "lucide-react";
import Image1 from "../../public/logo.png";
// N'oubliez pas d'importer le CSS

const NavBar = () => {
  const { user, logout, isManagerOrAdmin } = useAuth();
  const [expanded, setExpanded] = useState(false);

  const closeNavbar = () => setExpanded(false);
  const isBuffet = user?.role === "buffet";

  const NavItem = ({ to, children, className = "" }) => (
    <LinkContainer to={to} onClick={closeNavbar}>
      <Nav.Link className={`nav-link-modern ${className}`}>{children}</Nav.Link>
    </LinkContainer>
  );

  return (
    <Navbar
      bg="white"
      expand="lg"
      className="shadow-sm border-bottom sticky-top mynavbar"
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
    >
      <Container fluid>
        <LinkContainer to={isBuffet ? "/buffet/composer" : "/dashboard"}>
          <Navbar.Brand className="py-0">
            <img src={Image1} alt="logo" />
          </Navbar.Brand>
        </LinkContainer>

        <Navbar.Toggle aria-controls="basic-navbar-nav" className="border-0">
          <Menu size={20} />
        </Navbar.Toggle>

        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            
            {/* --- SECTION POS --- */}
            {!isBuffet && (
              <>
                <NavItem to="/dashboard" className="fw-bold text-primary">
                  <ShoppingCart className="me-1" /> POS
                </NavItem>
                <NavItem to="/drafts">
                  <ClipboardList className="me-1 text-primary" /> Brouillons
                </NavItem>
              </>
            )}

            {/* --- SECTION BUFFET --- */}
            {(isBuffet || isManagerOrAdmin) && (
              <>
                <div className="vr mx-2 d-none d-lg-block"></div>
                <NavItem to="/buffet/composer" className="fw-bold text-warning">
                  <UtensilsCrossed className="me-1" /> Composer
                </NavItem>
                <NavItem to="/buffet/drafts">
                  <FileText className="me-1 text-warning" /> Brouillons
                </NavItem>
              </>
            )}

            {/* --- ADMINISTRATION --- */}
            {isManagerOrAdmin && (
              <>
                <div className="vr mx-2 d-none d-lg-block"></div>
                <NavItem to="/bills" className="text-info"><Receipt className="me-1" /> Factures</NavItem>
                <NavItem to="/products"><Package className="me-1 text-info" /> Articles</NavItem>
                <NavItem to="/saveBottle"><Beer className="me-1 text-info" /> Bouteilles</NavItem>
                <NavItem to="/inventory"><Warehouse className="me-1 text-info" /> Inventaire</NavItem>
                <NavItem to="/movement"><WorkflowIcon className="me-1 text-info" /> Perf.</NavItem>
                <NavItem to="/customers"><Users className="me-1 text-info" /> Clients</NavItem>
                <NavItem to="/users"><UserCheck className="me-1 text-info" /> RH</NavItem>
                <NavItem to="/add-buffet-item" className="fw-bold"><PlusCircle className="me-1 text-info" /> Config</NavItem>
              </>
            )}

            {/* --- SPECIFIQUE BUFFET --- */}
            {isBuffet && !isManagerOrAdmin && (
              <>
                <NavItem to="/add-buffet-item"><PlusCircle className="me-1 text-info" /> Config</NavItem>
                <NavItem to="/buffet/reports"><LayoutDashboard className="me-1 text-primary" /> Rapport</NavItem>
              </>
            )}
          </Nav>

          {/* --- PROFIL & ACTION --- */}
          <Nav className="align-items-center" >
            {user && (
              <div className="d-flex align-items-center me-2 pe-3 border-end">
                <div className="text-end d-none d-sm-block">
                  <div className="user-name">{user.name}</div>
                  <Badge bg="light" text="dark" className="user-badge border">
                    {user.role.toUpperCase()}
                  </Badge>
                </div>
              </div>
            )}
            <Button
              onClick={() => { logout(); closeNavbar(); }}
              className="btn-logout"
              title="Déconnexion"
            >
              <LogOut size={18} />
            </Button>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default NavBar;