// pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Container, Card, Alert, Form, Button, Spinner, Row, Col } from 'react-bootstrap';
import { LogIn, Key, Users, Lock, ArrowLeft, Utensils } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('portal'); // 'portal', 'auth', 'waiter'
  const navigate = useNavigate();
  const { login, pinLogin } = useAuth();

  // Gestion unifiée de la connexion Email + Password
  const handleAuthLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(email, password);
      
      // Redirection intelligente basée sur le rôle après connexion email
      if (user.role === 'buffet') {
        navigate('/buffet/composer');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err?.response?.data?.msg || "Erreur d'authentification");
      setPassword(''); 
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await pinLogin(pin);
      if (user.role === 'buffet') {
        navigate('/buffet/composer');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err?.response?.data?.msg || "PIN incorrect");
      setPin(''); 
    } finally {
      setLoading(false);
    }
  };

  // Formulaire Email/Password (Utilisé pour Admin ET Buffet désormais)
  const renderEmailLoginForm = () => (
    <div className="fade-in">
      <div className="text-center mb-4">
        {/* Icône dynamique si c'est le buffet ou l'admin */}
        <Users size={48} className="text-primary mb-2" />
        <h4 className="fw-bold text-primary">Connexion Sécurisée</h4>
        <p className="text-muted small">Accès via Email et Mot de passe</p>
      </div>
      {error && <Alert variant="danger" className="text-center py-2 small">{error}</Alert>}
      <Form onSubmit={handleAuthLogin}>
        <Form.Group className="mb-3">
          <Form.Label className="small fw-bold">Email</Form.Label>
          <Form.Control 
            type="email" 
            placeholder="utilisateur@exemple.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
            className="form-control-lg shadow-sm"
          />
        </Form.Group>
        <Form.Group className="mb-4">
          <Form.Label className="small fw-bold">Mot de passe</Form.Label>
          <Form.Control 
            type="password" 
            placeholder="••••••••" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
            className="form-control-lg shadow-sm"
          />
        </Form.Group>
        <Button 
          variant="primary" 
          type="submit" 
          className="w-100 py-3 d-flex align-items-center justify-content-center fw-bold shadow" 
          disabled={loading}
        >
          {loading ? <Spinner size="sm" className="me-2" /> : <LogIn size={20} className="me-2" />}
          SE CONNECTER
        </Button>
      </Form>
      <div className="text-center mt-4">
        <Button variant="link" className="text-decoration-none text-muted" onClick={() => setView('portal')}>
          <ArrowLeft size={16} className='me-1'/> Retour au portail
        </Button>
      </div>
    </div>
  );

  const renderPinLoginForm = (roleTitle, roleColor, roleIcon) => (
    <div className="fade-in">
      <div className="text-center mb-4">
        {roleIcon}
        <h4 className={`fw-bold text-${roleColor}`}>{roleTitle}</h4>
        <p className="text-muted small">Utilisez votre code d'accès à 4 chiffres</p>
      </div>
      {error && <Alert variant="danger" className="text-center py-2 small">{error}</Alert>}
      <Form onSubmit={handlePinLogin}>
        <Form.Group className="mb-4 text-center">
          <Form.Control 
            type="password" 
            inputMode="numeric"
            placeholder="0000" 
            className="text-center fw-bold shadow-sm"
            style={{ fontSize: '2.5rem', letterSpacing: '0.5rem', borderRadius: '15px' }}
            value={pin}
            onChange={(e) => setPin(e.target.value.slice(0, 4))}
            maxLength={4}
            required 
            autoFocus
          />
        </Form.Group>
        <Button 
          variant={roleColor} 
          type="submit" 
          className="w-100 py-3 d-flex align-items-center justify-content-center fw-bold text-white shadow" 
          disabled={loading || pin.length !== 4}
        >
          {loading ? <Spinner size="sm" className="me-2" /> : <Key size={20} className="me-2" />}
          VALIDER LE PIN
        </Button>
      </Form>
      <div className="text-center mt-4">
        <Button variant="link" className="text-decoration-none text-muted" onClick={() => setView('portal')}>
          <ArrowLeft size={16} className='me-1'/> Retour au portail
        </Button>
      </div>
    </div>
  );

  const renderPortal = () => (
    <Row className="g-4 fade-in">
      {/* Gestion / Admin - Utilise désormais 'auth' */}
      <Col md={4}>
        <Card className="portal-card h-100 border-0 shadow-sm text-center py-4" onClick={() => setView('auth')}>
          <Card.Body>
            <div className="icon-circle bg-light-primary text-primary mb-3">
              <Users size={32} />
            </div>
            <h5 className="fw-bold">Gestion</h5>
            <p className="text-muted small">Admin & Manager</p>
          </Card.Body>
        </Card>
      </Col>
      {/* Service - Garde le PIN */}
      <Col md={4}>
        <Card className="portal-card h-100 border-0 shadow-sm text-center py-4" onClick={() => setView('waiter')}>
          <Card.Body>
            <div className="icon-circle bg-light-success text-success mb-3">
              <Key size={32} />
            </div>
            <h5 className="fw-bold">Service</h5>
            <p className="text-muted small">Serveurs & Bar</p>
          </Card.Body>
        </Card>
      </Col>
      {/* Buffet - Utilise aussi 'auth' (Email/Pass) */}
      <Col md={4}>
        <Card className="portal-card h-100 border-0 shadow-sm text-center py-4" onClick={() => setView('auth')}>
          <Card.Body>
            <div className="icon-circle bg-light-warning text-warning mb-3">
              <Utensils size={32} />
            </div>
            <h5 className="fw-bold">Buffet</h5>
            <p className="text-muted small">Identifiants requis</p>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );

  return (
    <div className="login-wrapper bg-soft-primary">
      <Container className="d-flex justify-content-center align-items-center min-vh-100">
        <div style={{ width: '100%', maxWidth: view === 'portal' ? '900px' : '450px' }}>
          <div className="text-center mb-5">
            <div className="d-inline-block p-3 rounded-circle bg-white shadow-sm mb-3">
              <Lock size={40} className="text-warning" />
            </div>
            <h2 className="fw-bold text-dark">ARK <span className="text-primary">POS</span></h2>
            <p className="text-muted">Système de Point de Vente Intelligent</p>
          </div>

          <Card className="border-0 shadow-lg overflow-hidden" style={{ borderRadius: '20px' }}>
            <Card.Body className={view === 'portal' ? 'p-5' : 'p-4 p-md-5'}>
              {view === 'portal' && renderPortal()}
              {view === 'auth' && renderEmailLoginForm()}
              {view === 'waiter' && renderPinLoginForm('Service Salle', 'success', <Key size={48} className="text-success mb-2" />)}
            </Card.Body>
          </Card>
          
          <div className='text-center text-muted mt-5'>
            <small className="fw-bold">&copy; {new Date().getFullYear()} ArnoldKajibwami POS .v2.0</small>
            <div className="mt-2" style={{ height: '3px', width: '30px', background: '#0d6efd', margin: '0 auto' }}></div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default Login;