import React, { useState, useEffect, useMemo } from 'react';
import { 
    Container, Card, Table, Button, Badge, Spinner, 
    Modal, Form, Row, Col, InputGroup, Alert 
} from 'react-bootstrap';
import { 
    Utensils, CheckCircle, DollarSign, AlertTriangle, 
    ArrowRight, Trash2, Edit3, RefreshCw, XCircle 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API_URL from '../api/api'
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// const API_URL = 'http://localhost:5000/api/v1';

const BuffetDrafts = () => {
    const navigate = useNavigate();
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // États des Modals
    const [showFinalizeModal, setShowFinalizeModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    
    // Sélection
    const [selectedDraft, setSelectedDraft] = useState(null);
    const [idToDelete, setIdToDelete] = useState(null);
    
    // Paiement
    const [amountReceived, setAmountReceived] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [successMessage, setSuccessMessage] = useState(null);

    useEffect(() => {
        fetchBuffetDrafts();
    }, []);

    const fetchBuffetDrafts = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/bills/drafts?t=${new Date().getTime()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const data = res.data.drafts || res.data || [];
            const buffetOnly = data.filter(d => 
                d.status?.toLowerCase() === 'draft' && 
                (d.draftName?.toLowerCase().includes('buffet') || d.isBuffet || d.customerName?.toLowerCase().includes('buffet'))
            ).map(draft => {
                const calculatedTotal = draft.items?.reduce((sum, i) => sum + (Number(i.price) * Number(i.quantity)), 0) || 0;
                return {
                    ...draft,
                    displayPrice: Number(draft.totalAmount) > 0 ? Number(draft.totalAmount) : calculatedTotal
                };
            });
            setDrafts(buffetOnly);
        } catch (err) {
            toast.error("Erreur de synchronisation");
        } finally {
            setLoading(false);
        }
    };

    // --- LOGIQUE SUPPRESSION MODERNE ---
    const askDeleteConfirmation = (id) => {
        setIdToDelete(id);
        setShowDeleteModal(true);
    };

    const executeDelete = async () => {
        setIsProcessing(true);
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/bills/drafts/${idToDelete}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Le brouillon a été supprimé");
            fetchBuffetDrafts();
        } catch (err) {
            toast.error("Échec de la suppression");
        } finally {
            setIsProcessing(false);
            setShowDeleteModal(false);
            setIdToDelete(null);
        }
    };

    // --- LOGIQUE PAIEMENT ---
    const cartTotal = useMemo(() => selectedDraft?.displayPrice || 0, [selectedDraft]);
    const paymentMade = Number(amountReceived) || 0;
    const changeDue = Math.max(0, paymentMade - cartTotal);
    const isReadyToFinalize = cartTotal > 0 && paymentMade >= cartTotal;

    const handleFinalize = async () => {
        setIsProcessing(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/bills/buffet/finalize`, {
                billId: selectedDraft._id,
                paymentMethod,
                amountPaid: cartTotal,
                amountReceived: paymentMade
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            setSuccessMessage(`Encaissement réussi !`);
            fetchBuffetDrafts();
        } catch (err) {
            toast.error(err.response?.data?.msg || "Erreur lors du paiement");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCloseModal = () => {
        setShowFinalizeModal(false);
        setSelectedDraft(null);
        setAmountReceived('');
        setSuccessMessage(null);
    };

    if (loading) return (
        <div className="text-center py-5 vh-100 d-flex flex-column justify-content-center align-items-center">
            <Spinner animation="border" variant="warning" />
            <p className="text-muted mt-3 fw-bold">Mise à jour du buffet...</p>
        </div>
    );

    return (
        <Container className="py-4 min-vh-100">
            {/* IMPORTANT: zIndex 9999 pour passer au-dessus des Modals Bootstrap */}
            <ToastContainer 
                position="top-right" 
                autoClose={3000} 
                theme="colored" 
                style={{ zIndex: 9999 }} 
            />

            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold d-flex align-items-center mb-0">
                    <Utensils className="me-3 text-warning" size={32} /> 
                    Brouillons Buffet
                </h2>
                <div className="d-flex gap-2">
                    <Button variant="outline-dark" className="rounded-pill px-3" onClick={fetchBuffetDrafts}>
                        <RefreshCw size={18} className="me-2" /> Rafraîchir
                    </Button>
                    <Badge bg="primary" className="rounded-pill px-3 py-2 d-flex align-items-center shadow-sm">
                        {drafts.length} En attente
                    </Badge>
                </div>
            </div>

            <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                <Card.Body className="p-0">
                    <Table responsive hover className="mb-0">
                        <thead className="bg-light border-bottom">
                            <tr>
                                <th className="ps-4 py-3 text-muted small fw-bold uppercase">Client / Heure</th>
                                <th className="py-3 text-muted small fw-bold uppercase">Contenu du Plat</th>
                                <th className="py-3 text-muted small fw-bold uppercase">Total</th>
                                <th className="text-end pe-4 py-3 text-muted small fw-bold uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {drafts.length > 0 ? drafts.map(draft => (
                                <tr key={draft._id} className="align-middle border-bottom">
                                    <td className="ps-4 py-4">
                                        <div className="fw-bold text-dark">{draft.customerName || draft.draftName}</div>
                                        <div className="text-muted small">
                                            {new Date(draft.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="d-flex flex-wrap gap-1">
                                            {draft.items?.map((i, idx) => (
                                                <Badge key={idx} bg="white" text="dark" className="border fw-normal px-2">
                                                    {i.quantity}x {i.name}
                                                </Badge>
                                            ))}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="fw-bold text-primary h6 mb-0">
                                            {draft.displayPrice.toLocaleString()} FC 
                                        </span>
                                    </td>
                                    <td className="text-end pe-4">
                                        <div className="d-flex justify-content-end gap-2">
                                            <Button variant="light" size="sm" className="rounded-circle" onClick={() => navigate(`/buffet/composer?edit=${draft._id}`)}>
                                                <Edit3 size={16} />
                                            </Button>
                                            <Button variant="light" size="sm" className="rounded-circle text-danger" onClick={() => askDeleteConfirmation(draft._id)}>
                                                <Trash2 size={16} />
                                            </Button>
                                            <Button variant="success" className="rounded-pill px-3 fw-bold btn-sm shadow-sm w-50" onClick={() => { setSelectedDraft(draft); setShowFinalizeModal(true); }}>
                                                Encaisser
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="4" className="text-center py-5">
                                        <p className="text-muted">Aucun plat en attente dans la liste.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            {/* MODAL SUPPRESSION */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered size="sm border-0">
                <Modal.Body className="text-center p-4">
                    <XCircle size={50} className="text-danger mb-3" />
                    <h5 className="fw-bold">Confirmer ?</h5>
                    <p className="text-muted small">Voulez-vous vraiment supprimer ce brouillon ?</p>
                    <div className="d-flex gap-2 mt-4">
                        <Button variant="light" className="w-100 rounded-pill" onClick={() => setShowDeleteModal(false)}>Non</Button>
                        <Button variant="danger" className="w-100 rounded-pill shadow-sm" onClick={executeDelete} disabled={isProcessing}>
                            {isProcessing ? <Spinner size="sm"/> : "Supprimer"}
                        </Button>
                    </div>
                </Modal.Body>
            </Modal>

            {/* MODAL PAIEMENT */}
            <Modal show={showFinalizeModal} onHide={handleCloseModal} size="lg" centered backdrop="static">
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-bold">Encaissement</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {successMessage ? (
                        <div className="text-center py-4">
                            <CheckCircle size={70} className="text-success mb-3" />
                            <h2 className="fw-bold text-success">Paiement Validé</h2>
                            <div className="bg-light p-4 rounded-4 mt-3 border">
                                <span className="text-muted d-block small mb-1">MONNAIE À RENDRE</span>
                                <h1 className="fw-black mb-0 text-dark">{changeDue.toLocaleString()} FC </h1>
                            </div>
                            <Button variant="dark" className="px-5 rounded-pill mt-4 shadow" onClick={handleCloseModal}>Fermer</Button>
                        </div>
                    ) : (
                        <Row className="g-4">
                            <Col md={6}>
                                <div className="p-4 border rounded-4 h-100 bg-white">
                                    <Form.Group className="mb-4">
                                        <Form.Label className="small fw-bold text-uppercase text-muted">Mode de Règlement</Form.Label>
                                        <Form.Select className="form-control-lg border-2" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                                            <option value="CASH">Espèces</option>
                                            <option value="MOBILE">Mobile Money</option>
                                            <option value="CARD">Carte</option>
                                        </Form.Select>
                                    </Form.Group>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-uppercase text-muted">Montant Reçu</Form.Label>
                                        <InputGroup size="lg">
                                            <Form.Control 
                                                type="number" className="fw-bold text-success border-2" autoFocus
                                                value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)}
                                            />
                                            <InputGroup.Text className="bg-light fw-bold">FC </InputGroup.Text>
                                        </InputGroup>
                                    </Form.Group>
                                </div>
                            </Col>
                            <Col md={6}>
                                <div className="p-4 bg-light rounded-4 h-100 border">
                                    <div className="d-flex justify-content-between mb-2">
                                        <span className="text-muted">Total Net :</span>
                                        <span className="fw-bold h5 mb-0">{cartTotal.toLocaleString()} FC </span>
                                    </div>
                                    <hr />
                                    <div className={`p-4 rounded-3 text-center ${changeDue > 0 ? "bg-success text-white" : "bg-dark text-white"}`}>
                                        <small className="d-block text-uppercase mb-1 opacity-75">Monnaie</small>
                                        <h2 className="fw-black mb-0">{changeDue.toLocaleString()} FC </h2>
                                    </div>
                                    {paymentMade < cartTotal && paymentMade > 0 && (
                                        <div className="text-danger small mt-2 fw-bold text-center">
                                            Manque : {(cartTotal - paymentMade).toLocaleString()} FC 
                                        </div>
                                    )}
                                </div>
                            </Col>
                        </Row>
                    )}
                </Modal.Body>
                {!successMessage && (
                    <Modal.Footer className="border-0">
                        <Button variant="link" className="text-muted" onClick={handleCloseModal}>Annuler</Button>
                        <Button 
                            variant="success" size="lg" className="px-5 rounded-pill fw-bold shadow-sm"
                            disabled={!isReadyToFinalize || isProcessing} onClick={handleFinalize}
                        >
                            {isProcessing ? <Spinner size="sm"/> : "Confirmer le Paiement"}
                        </Button>
                    </Modal.Footer>
                )}
            </Modal>
        </Container>
    );
};

export default BuffetDrafts;