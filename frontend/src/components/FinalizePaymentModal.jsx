import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
    Modal, Button, Form, Alert, Row, Col, Card, 
    InputGroup, Spinner, ListGroup, Badge, Table, OverlayTrigger, Tooltip,
    Collapse, Dropdown
} from 'react-bootstrap';
import { 
    User, Scale, CheckCircle, AlertTriangle, Wallet, 
    DollarSign, CreditCard, MinusCircle, X, RefreshCcw, 
    Info, Receipt, ChevronRight, History, Edit3, Save,
    Printer, ArrowLeft, Trash2, Zap, Calculator, TrendingUp,
    Delete, ArrowDownRight, UserCheck, ShieldCheck, Globe
} from 'lucide-react';
import API_URL from '../api/api'
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

/**
 * UTILS & CONFIGURATION
 */
// const API_URL = 'http://localhost:5000/api/v1';

const formatFC = (amount) => {
    return new Intl.NumberFormat('fr-CD', {
        style: 'currency',
        currency: 'CDF',
        minimumFractionDigits: 0
    }).format(amount || 0).replace('CDF', 'Fc');
};

const formatUSD = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount || 0);
};

const CDF_DENOMINATIONS = [20000, 10000, 5000, 1000, 500];

/**
 * COMPONENT: FinalizePaymentModal
 */
const FinalizePaymentModal = ({ 
    show, handleClose, cart, cartTotal, customer, 
    user, clearCart, setError, draftIds 
}) => {
    
    // --- États de Paiement ---
    const [amountReceived, setAmountReceived] = useState('');
    const [creditUsed, setCreditUsed] = useState(0);
    const [pointsUsed, setPointsUsed] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    
    // --- Gestion Manuelle du Taux ---
    const [exchangeRate, setExchangeRate] = useState(2850); 
    const [tempRate, setTempRate] = useState(2850);
    const [isEditingRate, setIsEditingRate] = useState(false);
    
    // --- États UI & Système ---
    const [isProcessing, setIsProcessing] = useState(false);
    const [successMessage, setSuccessMessage] = useState(null);
    const [finalizationError, setFinalizationError] = useState(null);
    const [finalChangeDue, setFinalChangeDue] = useState(0);
    const [showHistory, setShowHistory] = useState(false);
    const [localHistory, setLocalHistory] = useState([]);
    const [showNumPad, setShowNumPad] = useState(true);
    
    const navigate = useNavigate();
    const inputRef = useRef(null);

    // --- Paramètres de Fidélité ---
    const POINT_VAL_USD = 0.1; 
    const pointValueFC = useMemo(() => POINT_VAL_USD * exchangeRate, [exchangeRate]);
    
    // --- Logique de Calcul des Totaux (Memoized) ---
    const totals = useMemo(() => {
        const brut = cartTotal;
        const ptsValue = pointsUsed * (pointValueFC / 10); 
        const afterPoints = Math.max(0, brut - ptsValue);
        const maxCreditAllowed = customer ? Math.min(afterPoints, customer.creditBalance || 0) : 0;
        const netToPay = Math.max(0, afterPoints - creditUsed);
        const received = Number(amountReceived) || 0;
        const change = Math.max(0, received - netToPay);
        const debt = Math.max(0, netToPay - received);
        
        let remainingChange = change;
        const changeBreakdown = CDF_DENOMINATIONS.map(denom => {
            const count = Math.floor(remainingChange / denom);
            remainingChange %= denom;
            return { denom, count };
        }).filter(d => d.count > 0);

        return {
            brut, ptsValue, afterPoints, maxCreditAllowed, netToPay,
            received, change, debt, changeBreakdown,
            netUsd: (netToPay / exchangeRate).toFixed(0),
            receivedUsd: (received / exchangeRate).toFixed(0),
            changeUsd: (change / exchangeRate).toFixed(0)
        };
    }, [cartTotal, pointsUsed, creditUsed, amountReceived, exchangeRate, customer, pointValueFC]);

    // --- Sécurité & Sync ---
    useEffect(() => {
        if (customer) {
            const maxPtsPossible = Math.floor(cartTotal / (pointValueFC / 10));
            const availablePts = customer.totalPoints || 0;
            const allowed = Math.min(maxPtsPossible, availablePts);
            if (pointsUsed > allowed) setPointsUsed(allowed);
            if (creditUsed > totals.maxCreditAllowed) setCreditUsed(totals.maxCreditAllowed);
        }
    }, [pointsUsed, creditUsed, totals.maxCreditAllowed, customer, cartTotal, pointValueFC]);

    // --- Handlers Système ---
    const resetStates = useCallback(() => {
        setAmountReceived('');
        setCreditUsed(0);
        setPointsUsed(0);
        setFinalizationError(null);
        setSuccessMessage(null);
        setFinalChangeDue(0);
        setIsEditingRate(false);
    }, []);

    // FIX: Définition de la fonction manquante
    const handleModalClose = useCallback(() => {
        if (!isProcessing) {
            resetStates();
            handleClose();
        }
    }, [isProcessing, handleClose, resetStates]);

    const saveRate = () => {
        const rate = Number(tempRate);
        if (rate >= 1000 && rate <= 5000) {
            setExchangeRate(rate);
            setIsEditingRate(false);
        } else {
            setFinalizationError("Taux invalide (Min: 1000, Max: 5000)");
        }
    };

    // --- Gestion du Clavier Numérique ---
    const handleNumPress = (val) => {
        setAmountReceived(prev => `${prev}${val}`);
    };

    const handleNumDelete = () => {
        setAmountReceived(prev => prev.slice(0, -1));
    };

    // --- Finalisation API ---
    const finalizeTransaction = async (e) => {
        if (e) e.preventDefault();
        
        if (totals.debt > 0 && !customer) {
            setFinalizationError("❌ Un client est requis pour les ventes à crédit.");
            return;
        }

        setIsProcessing(true);
        setFinalizationError(null);

        const payload = {
            cart: cart.map(item => ({
                productId: item.product || item._id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                saveBottle: !!item.saveBottle
            })),
            customerId: customer?._id || null,
            waiterId: user?._id || user?.userId,
            amountReceived: totals.received,
            paymentMethod,
            creditUsed: Number(creditUsed),
            pointsUsed: Number(pointsUsed),
            exchangeRateApplied: exchangeRate,
            draftIds
        };

        try {
            const { data } = await axios.post(`${API_URL}/bills/finalize`, payload);
            setFinalChangeDue(totals.change);
            setLocalHistory(prev => [{ id: data.bill._id, time: new Date().toLocaleTimeString(), amount: totals.netToPay, customer: customer?.name || "Comptoir" }, ...prev].slice(0, 5));
            setSuccessMessage(`Facture générée avec succès.`);
            clearCart();
        } catch (err) {
            setFinalizationError(err.response?.data?.msg || "Échec de la transaction.");
        } finally {
            setIsProcessing(false);
        }
    };

    // --- Template Succès ---
    if (successMessage) {
        return (
            <Modal show={show} centered backdrop="static" size="md">
                <Modal.Body className="text-center p-5">
                    <div className="mb-4 text-success animate__animated animate__bounceIn">
                        <CheckCircle size={100} strokeWidth={1.5} />
                    </div>
                    <h2 className="fw-bold">Paiement Reçu</h2>
                    <Card className="bg-light border-0 my-4 rounded-4">
                        <Card.Body className="p-4">
                            <span className="text-muted small fw-bold text-uppercase">Monnaie à rendre</span>
                            <h1 className="display-3 fw-bold text-success mb-0">{formatFC(finalChangeDue)}</h1>
                            <h3 className="text-muted fw-bold">≈ {formatUSD(finalChangeDue / exchangeRate)}</h3>
                        </Card.Body>
                    </Card>
                    <div className="d-grid gap-2">
                        <Button variant="primary" size="lg" className="py-3 fw-bold" onClick={() => { resetStates(); handleClose(); navigate('/pos'); }}>
                            CONTINUER LE SERVICE
                        </Button>
                    </div>
                </Modal.Body>
            </Modal>
        );
    }

    return (
        <Modal show={show} onHide={handleModalClose} size="xl" centered backdrop="static" className="pos-finalize-modal">
            <Form onSubmit={finalizeTransaction}>
                <Modal.Header closeButton className="bg-white border-bottom px-4 py-3">
                    <div className="d-flex align-items-center">
                        <div className="bg-primary-light p-2 rounded-3 me-3">
                            <Receipt className="text-primary" size={24} />
                        </div>
                        <div>
                            <Modal.Title className="fw-bold h4 mb-0">Règlement de la commande</Modal.Title>
                            <small className="text-muted">ID Session: {user?.userId || 'Agent-01'}</small>
                        </div>
                    </div>
                </Modal.Header>

                <Modal.Body className="bg-light p-0">
                    {finalizationError && (
                        <Alert variant="danger" className="rounded-0 m-0 border-0 d-flex align-items-center">
                            <AlertTriangle size={20} className="me-2" /> {finalizationError}
                        </Alert>
                    )}

                    <Row className="g-0">
                        {/* COLONNE GAUCHE : CAISSE */}
                        <Col lg={7} className="bg-white p-4 border-end">
                            
                            {/* GESTION DU TAUX */}
                            <div className="d-flex justify-content-between align-items-center mb-4 p-3 bg-light rounded-4">
                                <div className="d-flex align-items-center">
                                    <Globe size={20} className="text-primary me-2" />
                                    <div>
                                        <span className="d-block small text-muted fw-bold">TAUX DU JOUR (Manuel)</span>
                                        {isEditingRate ? (
                                            <InputGroup size="sm" style={{ width: '180px' }}>
                                                <Form.Control type="number" value={tempRate} onChange={e => setTempRate(e.target.value)} autoFocus />
                                                <Button variant="success" onClick={saveRate}><Save size={16}/></Button>
                                            </InputGroup>
                                        ) : (
                                            <div className="d-flex align-items-center">
                                                <h4 className="fw-bold mb-0">1$ = {exchangeRate} FC</h4>
                                                <Button variant="link" className="p-0 ms-2" onClick={() => setIsEditingRate(true)}><Edit3 size={16}/></Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-end">
                                    <Badge bg="dark" className="px-3 py-2 rounded-pill">MODE: CDF/USD</Badge>
                                </div>
                            </div>

                            {/* MODES DE PAIEMENT */}
                            <h6 className="fw-bold text-muted small text-uppercase mb-3">Sélectionner le Mode</h6>
                            <Row className="g-2 mb-4">
                                {[
                                    { id: 'cash', label: 'ESPÈCES', icon: Wallet, color: '#059669' },
                                    { id: 'card', label: 'CARTE BANC.', icon: CreditCard, color: '#2563eb' },
                                    { id: 'mobile', label: 'MOBILE MONEY', icon: RefreshCcw, color: '#d97706' }
                                ].map(m => (
                                    <Col key={m.id} xs={4}>
                                        <div 
                                            onClick={() => setPaymentMethod(m.id)}
                                            className={`p-3 rounded-4 border-2 text-center transition-all h-100 ${paymentMethod === m.id ? 'bg-primary text-white border-primary shadow' : 'bg-white border-light'}`}
                                            style={{ cursor: 'pointer', border: '2px solid' }}
                                        >
                                            <m.icon size={24} className="mb-2" />
                                            <div className="small fw-bold">{m.label}</div>
                                        </div>
                                    </Col>
                                ))}
                            </Row>

                            {/* ZONE DE SAISIE AVEC NUMPAD */}
                            <Row className="g-3">
                                <Col md={showNumPad ? 7 : 12}>
                                    <div className="p-4 bg-light rounded-4 border">
                                        <Form.Label className="fw-bold mb-3">Montant Reçu (FC)</Form.Label>
                                        <div className="position-relative mb-3">
                                            <Form.Control 
                                                size="lg"
                                                type="number"
                                                className="fw-bold fs-1 py-4 ps-5 text-success border-0 shadow-sm"
                                                value={amountReceived}
                                                onChange={e => setAmountReceived(e.target.value)}
                                                placeholder="0"
                                            />
                                            <div className="position-absolute top-50 start-0 translate-middle-y ms-3">
                                                <span className="fw-bold text-muted h3">Fc</span>
                                            </div>
                                        </div>
                                        
                                        <div className="d-flex justify-content-between align-items-center px-2">
                                            <Button variant="dark" className="fw-bold" onClick={() => setAmountReceived(totals.netToPay)}>Exact</Button>
                                            <div className="text-primary fw-bold fs-4">
                                                <DollarSign size={18} /> {formatUSD(totals.receivedUsd)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* RACCOURCIS RAPIDES */}
                                    <div className="d-flex gap-2 mt-3">
                                        {[5000, 10000, 20000].map(v => (
                                            <Button key={v} variant="outline-secondary" className="flex-grow-1 fw-bold" onClick={() => setAmountReceived(Number(amountReceived || 0) + v)}>
                                                +{v/1000}k
                                            </Button>
                                        ))}
                                    </div>
                                </Col>

                                {showNumPad && (
                                    <Col md={5}>
                                        <div className="numpad bg-white p-2 rounded-4 border shadow-sm">
                                            <Row className="g-1">
                                                {[1,2,3,4,5,6,7,8,9].map(n => (
                                                    <Col xs={4} key={n}>
                                                        <Button variant="light" className="w-100 py-3 fw-bold fs-5 rounded-3" onClick={() => handleNumPress(n)}>{n}</Button>
                                                    </Col>
                                                ))}
                                                <Col xs={4}><Button variant="light" className="w-100 py-3 fw-bold fs-5 rounded-3" onClick={() => handleNumPress('000')}>.k</Button></Col>
                                                <Col xs={4}><Button variant="light" className="w-100 py-3 fw-bold fs-5 rounded-3" onClick={() => handleNumPress(0)}>0</Button></Col>
                                                <Col xs={4}><Button variant="danger-light" className="w-100 py-3 text-danger rounded-3" onClick={handleNumDelete}><Delete /></Button></Col>
                                            </Row>
                                        </div>
                                    </Col>
                                )}
                            </Row>
                        </Col>

                        {/* COLONNE DROITE : RÉSUMÉ FINANCIER */}
                        <Col lg={5} className="p-4 bg-light d-flex flex-column">
                            <h5 className="fw-bold mb-4">Résumé Transaction</h5>
                            
                            <Card className="border-0 shadow-sm rounded-4 mb-4">
                                <Card.Body className="p-0">
                                    <div className="p-3 border-bottom d-flex justify-content-between">
                                        <span className="text-muted">Total Panier</span>
                                        <span className="fw-bold">{formatFC(totals.brut)}</span>
                                    </div>
                                    
                                    {customer && (
                                        <div className="p-3 bg-primary-light border-bottom">
                                            <div className="d-flex justify-content-between mb-2">
                                                <span className="small fw-bold">Fidélité {customer.name}</span>
                                                <Badge bg="primary">{customer.totalPoints} Pts</Badge>
                                            </div>
                                            <Row className="g-2">
                                                <Col xs={6}>
                                                    <InputGroup size="sm">
                                                        <InputGroup.Text><Zap size={14}/></InputGroup.Text>
                                                        <Form.Control type="number" placeholder="Points" value={pointsUsed} onChange={e => setPointsUsed(e.target.value)} />
                                                    </InputGroup>
                                                </Col>
                                                <Col xs={6}>
                                                    <InputGroup size="sm">
                                                        <InputGroup.Text><CreditCard size={14}/></InputGroup.Text>
                                                        <Form.Control type="number" placeholder="Crédit" value={creditUsed} onChange={e => setCreditUsed(e.target.value)} />
                                                    </InputGroup>
                                                </Col>
                                            </Row>
                                        </div>
                                    )}

                                    <div className="p-4 text-center">
                                        <div className="text-muted small fw-bold text-uppercase mb-1">Net à Percevoir</div>
                                        <div className="display-5 fw-bold text-primary mb-0">{formatFC(totals.netToPay)}</div>
                                        <div className="h5 text-muted mb-0">{formatUSD(totals.netUsd)}</div>
                                    </div>
                                </Card.Body>
                            </Card>

                            {/* CALCULATEUR DE MONNAIE / DETTE */}
                            <div className={`p-4 rounded-4 border-3 border mb-4 shadow-sm text-center ${totals.debt > 0 ? 'bg-danger-light border-danger' : 'bg-success-light border-success'}`}>
                                {totals.debt > 0 ? (
                                    <>
                                        <div className="text-danger small fw-bold mb-1">MANQUANT (DETTE)</div>
                                        <h2 className="display-6 fw-bold text-danger mb-0">{formatFC(totals.debt)}</h2>
                                        <div className="text-danger fw-bold opacity-75">{formatUSD(totals.debt / exchangeRate)}</div>
                                        {!customer && <div className="mt-2 text-danger small fw-bold"><AlertTriangle size={14}/> Client obligatoire pour dette</div>}
                                    </>
                                ) : (
                                    <>
                                        <div className="text-success small fw-bold mb-1">MONNAIE À RENDRE</div>
                                        <h2 className="display-6 fw-bold text-success mb-0">{formatFC(totals.change)}</h2>
                                        <div className="text-success fw-bold opacity-75 mb-3">{formatUSD(totals.changeUsd)}</div>
                                        
                                        <div className="d-flex flex-wrap justify-content-center gap-2">
                                            {totals.changeBreakdown.map(b => (
                                                <Badge key={b.denom} bg="white" className="text-dark border border-success p-2">
                                                    {b.count} x {b.denom/1000}k
                                                </Badge>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* BOUTON FINAL */}
                            <Button 
                                variant={totals.debt > 0 ? "danger" : "success"}
                                size="lg"
                                className="w-100 py-3 fw-bold rounded-4 shadow mb-4"
                                disabled={isProcessing || totals.brut <= 0 || (totals.debt > 0 && !customer)}
                                onClick={finalizeTransaction}
                            >
                                {isProcessing ? <Spinner size="sm" /> : (
                                    <div className="d-flex align-items-center justify-content-center">
                                        {totals.debt > 0 ? <AlertTriangle className="me-2" /> : <ShieldCheck className="me-2" />}
                                        {totals.debt > 0 ? "ENREGISTRER COMME DETTE" : "CONFIRMER & FERMER VENTE"}
                                    </div>
                                )}
                            </Button>

                            {/* MINI HISTORIQUE */}
                            <Button variant="link" className="text-muted text-decoration-none small" onClick={() => setShowHistory(!showHistory)}>
                                <History size={14} className="me-1" /> Historique récent
                            </Button>
                            <Collapse in={showHistory}>
                                <div className="mt-2">
                                    <Table hover size="sm" className="bg-white rounded-3 small border overflow-hidden">
                                        <tbody>
                                            {localHistory.map(h => (
                                                <tr key={h.id}>
                                                    <td className="ps-2">{h.time}</td>
                                                    <td className="fw-bold">{formatFC(h.amount)}</td>
                                                    <td className="text-end pe-2 text-muted">{h.customer}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            </Collapse>
                        </Col>
                    </Row>
                </Modal.Body>
            </Form>

            <style>{`
                .bg-primary-light { background-color: #eff6ff; }
                .bg-success-light { background-color: #f0fdf4; }
                .bg-danger-light { background-color: #fef2f2; }
                .numpad .btn-light:active { background-color: #e2e8f0; transform: scale(0.95); }
                .pos-finalize-modal .modal-content { border: none; border-radius: 1.5rem; overflow: hidden; }
                .display-5 { font-size: 3rem; letter-spacing: -1px; }
            `}</style>
        </Modal>
    );
};

export default FinalizePaymentModal;