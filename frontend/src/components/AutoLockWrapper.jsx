// components/AutoLockWrapper.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Container, Card, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { Key, ArrowLeft, Unlock, Utensils } from 'lucide-react';

const INACTIVITY_TIMEOUT_MS = 10000;

// --- LockScreen Component ---
const LockScreen = () => {
  const { pinLogin, logout, isAuthenticating } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await pinLogin(pin);
      const loggedInUser = response.user;

      // ✅ MISE À JOUR : Autoriser 'waiter' ET 'buffet' à déverrouiller via PIN
      const allowedRoles = ['waiter', 'buffet'];
      
      if (!allowedRoles.includes(loggedInUser.role)) {
        await logout();
        setError(`Accès refusé. Seuls les serveurs et le buffet peuvent utiliser le déverrouillage rapide.`);
        setPin('');
        return;
      }

      // Redirection selon le rôle
      if (loggedInUser.role === 'buffet') {
        navigate('/buffet/composer');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Échec du déverrouillage. PIN incorrect.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const isFormDisabled = loading || isAuthenticating;

  return (
    <Container fluid className="lock-screen-overlay d-flex align-items-center justify-content-center bg-soft-primary min-vh-100">
      <Card className="lock-screen-card shadow-lg p-4 bg-white border-0" style={{ maxWidth: '450px', width: '100%', borderRadius: '20px' }}>
        <div className="text-center mb-4">
          <div className="bg-light-success d-inline-block p-3 rounded-circle mb-3">
            <Unlock size={40} className="text-success pulsing" />
          </div>
          <h4 className="fw-bold text-dark">Session Verrouillée</h4>
          <p className="text-muted small">Entrez votre code PIN pour reprendre</p>
        </div>

        {error && <Alert variant="danger" className="text-center py-2 small">{error}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-4 text-center">
            <Form.Control
              type="password"
              inputMode="numeric"
              placeholder="0000"
              className="text-center fw-bold"
              style={{ fontSize: '2.5rem', letterSpacing: '0.5rem', borderRadius: '15px' }}
              value={pin}
              onChange={(e) => setPin(e.target.value.slice(0, 4))}
              maxLength={4}
              required
              disabled={isFormDisabled}
              autoFocus
            />
          </Form.Group>

          <Button
            variant="success"
            type="submit"
            className="w-100 py-3 d-flex align-items-center justify-content-center fw-bold text-white shadow"
            disabled={isFormDisabled || pin.length !== 4}
          >
            {isFormDisabled ? <Spinner size="sm" className='me-2' /> : <Unlock size={20} className="me-2" />}
            DÉVERROUILLER
          </Button>
        </Form>

        <Button
          variant="link"
          className="w-100 mt-4 text-decoration-none text-muted"
          onClick={() => { logout(); navigate('/login'); }}
        >
          <ArrowLeft size={16} className='me-1' /> Quitter la session
        </Button>
      </Card>
    </Container>
  );
};

// --- AutoLockWrapper Component ---
// components/AutoLockWrapper.jsx
const AutoLockWrapper = ({ children, allowedRoles = ['waiter'] }) => {
  const { user, isAuthenticated, isLocked, lockSession } = useAuth();
  const navigate = useNavigate();
  const timeoutRef = useRef(null);

  // LOG DE DÉBOGAGE : Vérifiez ce qui s'affiche dans la console F12 du navigateur
  // console.log("AutoLock Check - Role:", user?.role, "Allowed:", allowedRoles);

  // 1. CONDITION DE SORTIE IMMÉDIATE : Si c'est le buffet, on ne fait RIEN.
  // On compare en minuscules pour éviter les erreurs de saisie (buffet vs BUFFET)
  const isBuffet = user?.role?.toLowerCase() === 'buffet';
  
  // On ne verrouille que si l'utilisateur est un 'waiter' (ou autre rôle autorisé explicitement)
  const shouldAutoLock = user && allowedRoles.includes(user.role) && !isBuffet;

  const lockAndRedirect = useCallback(() => {
    lockSession();
    navigate('/', { replace: true });
  }, [lockSession, navigate]);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // On ajoute !isBuffet ici aussi par sécurité extrême
    if (shouldAutoLock && isAuthenticated && !isLocked && !isBuffet) {
      timeoutRef.current = setTimeout(() => {
        lockAndRedirect();
      }, 10000);
    }
  }, [shouldAutoLock, isAuthenticated, isLocked, lockAndRedirect, isBuffet]);

  useEffect(() => {
    // Si c'est le buffet ou si le rôle n'est pas concerné, on nettoie tout et on arrête
    if (!shouldAutoLock || isLocked || !isAuthenticated || isBuffet) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    const events = ['mousemove', 'keypress', 'scroll', 'mousedown', 'touchstart'];
    const handleActivity = () => resetTimer();

    resetTimer();

    events.forEach(event => window.addEventListener(event, handleActivity));
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [shouldAutoLock, isAuthenticated, isLocked, resetTimer, isBuffet]);

  // Si verrouillé, montrer l'écran de verrouillage
  if (isAuthenticated && isLocked) {
    return <LockScreen />;
  }

  return children;
};

export default AutoLockWrapper;