import React, { useState, useEffect, useCallback } from 'react';
import { 
    Container, Card, Alert, Form, Row, Col, 
    Button, Table, Modal, InputGroup, Badge, Spinner 
} from 'react-bootstrap';
import { 
    Beer, UserSearch, ArrowRightCircle, LogIn, 
    Search, Calendar, History, ClipboardList, Info, CheckCircle2 
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

import API_URL from '../api/api';

const SaveBottlesPage = () => {
    const [bouteillesEnregistrees, setBouteillesEnregistrees] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [erreur, setErreur] = useState(null);
    const [filtres, setFiltres] = useState({ customerId: '', jour: '' }); 
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
    const [withdrawQty, setWithdrawQty] = useState(0);

    const getRemaining = (item) => (item.savedQuantity || 0) - (item.withdrawnQuantity || 0);

    const fetchSavedBottles = useCallback(async () => {
        setIsLoading(true);
        setErreur(null);
        
        try {
            const params = new URLSearchParams();
            if (filtres.customerId) params.append('customerId', filtres.customerId);
            if (filtres.jour) params.append('day', filtres.jour);
            
            const { data } = await axios.get(`${API_URL}/customers/saved-bottles?${params.toString()}`);
            setBouteillesEnregistrees(data.savedBottles || []);
        } catch (err) {
            setErreur(err.response?.data?.msg || "Erreur lors du chargement des données.");
        } finally {
            setIsLoading(false);
        }
    }, [filtres]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchSavedBottles();
        }, 300); // Small debounce for search
        return () => clearTimeout(delayDebounceFn);
    }, [fetchSavedBottles]);

    const handleOpenWithdraw = (customerData) => {
        setSelectedWithdrawal(customerData);
        setWithdrawQty(getRemaining(customerData.pendingBottles)); 
        setShowWithdrawModal(true);
    };

    const confirmWithdrawal = async (e) => {
        e.preventDefault();
        const item = selectedWithdrawal.pendingBottles;
        const remaining = getRemaining(item);

        if (withdrawQty <= 0 || withdrawQty > remaining) {
            toast.error("Quantité invalide");
            return;
        }

        try {
            await axios.patch(`${API_URL}/customers/withdraw-bottle`, { 
                customerId: selectedWithdrawal._id,
                withdrawalItemId: item._id, 
                quantity: withdrawQty,
            });
            toast.success('Retrait effectué avec succès');
            setShowWithdrawModal(false);
            fetchSavedBottles(); 
        } catch (err) {
            toast.error(err.response?.data?.msg || "Échec du retrait.");
        }
    };

    return (
        <Container fluid className="py-4 px-lg-5">
            {/* --- Dashboard Header --- */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4">
                <div>
                    <h2 className="fw-bold text-dark d-flex align-items-center mb-1">
                        <Beer className="me-2 text-primary" size={32} /> Consignation Bouteilles
                    </h2>
                    <p className="text-muted">Gérez les dépôts clients et les retraits de stock.</p>
                </div>
                <Badge bg="primary" className="p-2 rounded-pill shadow-sm px-4 h6 mb-0">
                    {bouteillesEnregistrees.length} Clients en attente
                </Badge>
            </div>

            {/* --- Filter Bar --- */}
            <Card className="border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
                <Card.Body className="bg-white p-4">
                    <Row className="g-3 align-items-end">
                        <Col lg={5}>
                            <Form.Group>
                                <Form.Label className="small fw-bold text-uppercase text-muted">Rechercher Client</Form.Label>
                                <InputGroup className="bg-light rounded-3 overflow-hidden border">
                                    <InputGroup.Text className="bg-transparent border-0"><Search size={18} /></InputGroup.Text>
                                    <Form.Control 
                                        className="bg-transparent border-0 py-2"
                                        placeholder="Nom, Téléphone ou ID..." 
                                        value={filtres.customerId}
                                        onChange={(e) => setFiltres({...filtres, customerId: e.target.value})} 
                                    />
                                </InputGroup>
                            </Form.Group>
                        </Col>
                        <Col lg={4}>
                            <Form.Group>
                                <Form.Label className="small fw-bold text-uppercase text-muted">Date de Dépôt</Form.Label>
                                <InputGroup className="bg-light rounded-3 overflow-hidden border">
                                    <InputGroup.Text className="bg-transparent border-0"><Calendar size={18} /></InputGroup.Text>
                                    <Form.Control 
                                        type="date"
                                        className="bg-transparent border-0 py-2"
                                        value={filtres.jour} 
                                        onChange={(e) => setFiltres({...filtres, jour: e.target.value})}
                                    />
                                </InputGroup>
                            </Form.Group>
                        </Col>
                        <Col lg={3}>
                            <Button 
                                variant="dark" 
                                className="w-100 py-2 rounded-3 fw-bold d-flex align-items-center justify-content-center"
                                onClick={fetchSavedBottles}
                                disabled={isLoading}
                            >
                                {isLoading ? <Spinner size="sm" className="me-2" /> : <History size={18} className="me-2" />}
                                Actualiser la Liste
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* --- Data Table --- */}
            <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                <Card.Body className="p-0">
                    <Table hover responsive className="align-middle mb-0">
                        <thead className="bg-light text-muted">
                            <tr>
                                <th className="ps-4 py-3 text-uppercase fs-xs">Client</th>
                                <th className="py-3 text-uppercase fs-xs">Produit</th>
                                <th className="text-center py-3 text-uppercase fs-xs">Stock Enregistré</th>
                                <th className="text-center py-3 text-uppercase fs-xs">Déjà Retiré</th>
                                <th className="text-center py-3 text-uppercase fs-xs">Restant</th>
                                <th className="py-3 text-uppercase fs-xs">Date</th>
                                <th className="pe-4 text-end py-3 text-uppercase fs-xs">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="7" className="text-center py-5"><Spinner animation="border" variant="primary" /></td></tr>
                            ) : bouteillesEnregistrees.length > 0 ? (
                                bouteillesEnregistrees.map((customer) => {
                                    const item = customer.pendingBottles;
                                    const remaining = getRemaining(item);
                                    return (
                                        <tr key={item._id} className="border-bottom">
                                            <td className="ps-4">
                                                <div className="fw-bold text-dark">{customer.name}</div>
                                                <div className="text-muted small">{customer.phone}</div>
                                            </td>
                                            <td>
                                                <Badge bg="secondary" className="bg-opacity-10 text-dark fw-medium px-3 py-2">
                                                    {item.name || 'Inconnu'}
                                                </Badge>
                                            </td>
                                            <td className="text-center fw-bold">{item.savedQuantity}</td>
                                            <td className="text-center text-muted">{item.withdrawnQuantity}</td>
                                            <td className="text-center">
                                                <Badge bg={remaining > 0 ? "success" : "light"} className={`px-3 py-2 ${remaining === 0 && 'text-muted'}`}>
                                                    {remaining} Bouteilles
                                                </Badge>
                                            </td>
                                            <td className="text-muted small">
                                                {new Date(item.dateSaved).toLocaleDateString('fr-CD')}
                                            </td>
                                            <td className="pe-4 text-end">
                                                <div className="d-flex justify-content-end gap-2">
                                                    <Button 
                                                        variant={remaining > 0 ? "primary" : "outline-light"} 
                                                        size="sm"
                                                        className="rounded-pill px-3"
                                                        disabled={remaining === 0}
                                                        onClick={() => handleOpenWithdraw(customer)}
                                                    >
                                                        <LogIn size={14} className="me-1" /> Retrait
                                                    </Button>
                                                    <Button variant="link" className="text-muted p-1">
                                                        <History size={16} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="7" className="text-center py-5 text-muted">
                                        <ClipboardList size={40} className="mb-2 opacity-25" />
                                        <p>Aucun enregistrement trouvé pour ces critères.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            {/* --- Withdrawal Modal --- */}
            <Modal show={showWithdrawModal} onHide={() => setShowWithdrawModal(false)} centered className="border-0">
                <Form onSubmit={confirmWithdrawal}>
                    <Modal.Header closeButton className="border-0 pb-0">
                        <Modal.Title className="fw-bold">Confirmer le Retrait</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="pt-4">
                        {selectedWithdrawal && (
                            <>
                                <div className="p-3 rounded-4 bg-light mb-4 border border-primary border-opacity-10 text-center">
                                    <h6 className="text-muted text-uppercase small mb-2">Bouteille en cours</h6>
                                    <h5 className="fw-bold mb-1">{selectedWithdrawal.pendingBottles.name}</h5>
                                    <p className="mb-0 text-primary fw-bold">
                                        Restant: {getRemaining(selectedWithdrawal.pendingBottles)} unités
                                    </p>
                                </div>
                                <Form.Group>
                                    <Form.Label className="fw-bold">Quantité à retirer maintenant</Form.Label>
                                    <InputGroup className="input-group-lg border rounded-3 overflow-hidden shadow-sm">
                                        <Form.Control
                                            type="number"
                                            min="1"
                                            max={getRemaining(selectedWithdrawal.pendingBottles)}
                                            value={withdrawQty}
                                            onChange={(e) => setWithdrawQty(Number(e.target.value))}
                                            className="border-0 text-center fw-bold"
                                            required
                                        />
                                        <Button 
                                            variant="dark"
                                            className="px-4"
                                            onClick={() => setWithdrawQty(getRemaining(selectedWithdrawal.pendingBottles))}
                                        >
                                            Tout
                                        </Button>
                                    </InputGroup>
                                    <Form.Text className="text-muted mt-2 d-block">
                                        <Info size={14} className="me-1" /> Cette action mettra à jour l'historique du client : **{selectedWithdrawal.name}**.
                                    </Form.Text>
                                </Form.Group>
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer className="border-0 pt-0">
                        <Button variant="link" className="text-muted text-decoration-none" onClick={() => setShowWithdrawModal(false)}>
                            Annuler
                        </Button>
                        <Button variant="primary" type="submit" className="px-5 rounded-pill shadow-sm">
                            Valider le Retrait <CheckCircle2 size={18} className="ms-2" />
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default SaveBottlesPage;