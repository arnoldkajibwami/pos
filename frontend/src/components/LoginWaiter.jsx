// pages/LoginWaiterStandalone.jsx (or similar)

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Assurez-vous que le chemin est correct
import { Container, Card, Alert, Form, Button, Spinner } from 'react-bootstrap';
import { LogIn, Key, ArrowLeft } from 'lucide-react';

const LoginWaiter = () => {
    // 1. Local state for PIN and UI
    const [pin, setPin] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // 2. Hooks for Auth and Navigation
    const navigate = useNavigate();
    const { pinLogin, logout } = useAuth(); // Import pinLogin and logout

    // 3. Login Handler
    const handlePinLogin = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // Attempt PIN login
            const response = await pinLogin(pin);
            const loggedInUser = response.user;

            // CRITICAL CHECK: Enforce 'waiter' role for this login page
            if (loggedInUser.role !== 'waiter') {
                // If a non-waiter role logs in (e.g., manager PIN), force logout and block access.
                await logout(); 
                setError(`Accès refusé. Seul le rôle 'waiter' est autorisé ici. Votre rôle: '${loggedInUser.role}'.`);
                setLoading(false);
                setPin('');
                return;
            }

            // Success: Redirect to the main dashboard
            navigate('/dashboard'); 
        } catch (err) {
            // Handle login error
            setError(err || 'Échec de la connexion. PIN incorrect ou non trouvé.');
            setPin(''); 
        } finally {
            setLoading(false);
        }
    };

    // Helper to ensure pin is treated as a string for validation
    const isPinLengthValid = String(pin).length === 4;

    return (
        <div className="bg-light d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
            <div style={{ maxWidth: '450px', width: '100%', padding: '20px' }}>
                <Card className="shadow-2xl border-0">
                    <Card.Header className="bg-white text-center py-4 border-bottom-0">
                        <h1 className="fw-bold mb-0 text-dark">
                            <Key size={32} className="me-2 text-success" />
                            Système POS
                        </h1>
                    </Card.Header>
                    <Card.Body className='p-5'>
                        <div className="text-center mb-4">
                            <Key size={48} className="text-success mb-2" />
                            <h4 className="fw-bold text-success">Connexion Employé (Waiter)</h4>
                            <p className="text-muted">Veuillez entrer votre PIN pour continuer.</p>
                        </div>

                        {error && <Alert variant="danger" className="text-center">{error}</Alert>}
                        
                        <Form onSubmit={handlePinLogin}>
                            <Form.Group className="mb-3 text-center">
                                <Form.Label className="h5 fw-normal">Entrez votre PIN à 4 chiffres</Form.Label>
                                <Form.Control
                                    type="number"
                                    placeholder="____"
                                    className="text-center h1 p-4"
                                    style={{ letterSpacing: '10px', maxWidth: '200px', margin: '0 auto' }}
                                    value={pin}
                                    onChange={(e) => {
                                        const value = e.target.value.slice(0, 4);
                                        setPin(value); // Now setPin is available from useState
                                    }}
                                    maxLength={4}
                                    required
                                    disabled={loading}
                                />
                            </Form.Group>
                            <Button
                                variant="success"
                                type="submit"
                                className="w-100 d-flex align-items-center justify-content-center fw-bold btn-pos-action"
                                size="lg"
                                disabled={loading || !isPinLengthValid}
                            >
                                {loading ? (
                                    <>
                                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className='me-2' />
                                        Connexion en cours...
                                    </>
                                ) : (
                                    <>
                                        <LogIn size={20} className="me-2" />
                                        Connexion Rapide
                                    </>
                                )}
                            </Button>
                        </Form>
                        {/* Option to go back to the main portal if it exists */}
                        <Button variant="link" className="w-100 mt-3" onClick={() => navigate('/login')} disabled={loading}>
                            <ArrowLeft size={16} className='me-1' /> Retour au portail principal
                        </Button>
                    </Card.Body>
                </Card>
                <div className='text-center text-muted pt-3'>
                    <small>&copy; {new Date().getFullYear()} ArnoldKajibwami POS .v2.0</small>
                </div>
            </div>
        </div>
    );
};

export default LoginWaiter;