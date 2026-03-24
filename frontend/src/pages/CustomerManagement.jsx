import React, { useState, useEffect } from 'react';
import {
    Container, Card, Alert, Spinner, Table, Button,
    Modal, Form, Badge, InputGroup
} from 'react-bootstrap';
// 💡 CORRECTION: Replace Fa Icons with Lucide Icons
import { 
    Users, Plus, Trash2, Pencil, MinusCircle, DollarSign, 
    HandCoins, RotateCcw, Wallet, Star, Receipt, CreditCard
} from 'lucide-react'; 
import API_URL from '../api/api'
import axios from 'axios';
import { toast } from 'react-toastify'; // Assurez-vous que react-toastify est bien installé et configuré

// const API_URL = 'http://localhost:5000/api/v1';  // test
// const API_URL = 'https://posbackend-usko.onrender.com/api/v1';

// Utilitaire pour formater la devise
const formatCurrency = (amount) => `${Number(amount).toFixed(0)} Fc`;

// =========================================================================
// Modale pour l'Ajustement de Crédit (Paiement Client)
// =========================================================================
const AdjustCreditModal = ({ show, onHide, data, setData, handleSubmit, error }) => {
    const isDebt = data.currentBalance < 0;
    const isPositiveBalance = data.currentBalance >= 0; // Solde Débit (client a un avoir)
    const balanceAmount = Math.abs(data.currentBalance);

    // Affiche 'Dette' si négatif, 'Débit' si positif ou zéro
    const balanceText = isDebt
        ? `Dette : ${formatCurrency(balanceAmount)}`
        : `Débit : ${formatCurrency(balanceAmount)}`;

    const titleText = isDebt 
        ? "Encaisser un Paiement" 
        : "Ajuster/Débiter l'Avoir Client";

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton className={isDebt ? 'bg-success text-white' : 'bg-primary text-white'}>
                <Modal.Title>
                    <HandCoins size={20} className='me-2' /> {titleText} pour **{data.customerName}**
                </Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    <Alert variant={isDebt ? 'danger' : 'success'}>
                        Solde Actuel : **{balanceText}**
                    </Alert>

                    <Form.Group className="mb-3">
                        <Form.Label>**Montant de l'Ajustement (Fc)**</Form.Label>
                        <Form.Text className="text-muted d-block mb-1">
                            *Entrez un nombre positif. Ce montant réduit la dette (paiement) ou augmente le débit.*
                        </Form.Text>
                        <InputGroup>
                            <InputGroup.Text>Fc</InputGroup.Text>
                            <Form.Control
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={data.adjustmentAmount}
                                onChange={(e) => setData({ ...data, adjustmentAmount: Number(e.target.value) })}
                                required
                            />
                        </InputGroup>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>**Raison/Notes**</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            value={data.reason}
                            onChange={(e) => setData({ ...data, reason: e.target.value })}
                        />
                    </Form.Group>
                    {error && <Alert variant="danger">{error}</Alert>}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide}>Annuler</Button>
                    <Button variant={isDebt ? 'success' : 'primary'} type="submit" className='fw-bold'>
                        <CreditCard size={18} className='me-1' /> {isDebt ? 'Appliquer le Paiement' : 'Appliquer l\'Ajustement'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

// =========================================================================
// Modale pour la Réinitialisation des Points
// =========================================================================
const ResetPointsModal = ({ show, onHide, customerId, customerName, currentPoints, handleSubmit, error }) => {
    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton className='bg-warning text-dark'>
                <Modal.Title>
                    <RotateCcw size={20} className='me-2' /> **Réinitialiser les Points de Fidélité**
                </Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    <Alert variant="warning" className='shadow-sm'>
                        Êtes-vous sûr de vouloir réinitialiser les points de fidélité pour **{customerName}** ?
                        Le solde actuel de points est : **{currentPoints}**.
                    </Alert>
                    <p>Cette action doit être effectuée lorsque le client a utilisé ses points.</p>
                    {error && <Alert variant="danger">{error}</Alert>}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide}>Annuler</Button>
                    <Button variant="warning" type="submit" className='fw-bold text-dark'>
                        <RotateCcw size={18} className='me-1' /> Confirmer la Réinitialisation à Zéro
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};


// =========================================================================
// Main Component
// =========================================================================
const CustomerManagement = () => {
    const [customers, setCustomers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [customerForm, setCustomerForm] = useState({
        _id: null, name: '', phone: '', email: '', totalPoints: 0
    });

    // State for the Bottle Withdrawal Modal
    const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
    const [withdrawalData, setWithdrawalData] = useState({ customerId: '', amount: 0, reason: '' });

    // State for the Credit Adjustment Modal
    const [showAdjustCreditModal, setShowAdjustCreditModal] = useState(false);
    const [creditAdjustmentData, setCreditAdjustmentData] = useState({
        customerId: '',
        customerName: '',
        currentBalance: 0,
        adjustmentAmount: 0,
        reason: ''
    });

    // State for Points Reset Modal
    const [showResetPointsModal, setShowResetPointsModal] = useState(false);
    const [resetPointsData, setResetPointsData] = useState({ customerId: '', customerName: '', currentPoints: 0 });


    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`${API_URL}/customers`);
            setCustomers(response.data.customers);
            setError(null);
        } catch (err) {
            setError('Échec de la récupération des clients.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (customer = null) => {
        if (customer) {
            setIsEditing(true);
            setCustomerForm({
                _id: customer._id,
                name: customer.name,
                phone: customer.phone || '',
                email: customer.email || '',
                totalPoints: customer.totalPoints // Reference totalPoints
            });
        } else {
            setIsEditing(false);
            setCustomerForm({ _id: null, name: '', phone: '', email: '', totalPoints: 0 });
        }
        setError(null);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = { name: customerForm.name, phone: customerForm.phone, email: customerForm.email };
            if (isEditing) {
                await axios.patch(`${API_URL}/customers/${customerForm._id}`, data);
                toast.success('Client mis à jour avec succès !'); // Changement : toast
            } else {
                await axios.post(`${API_URL}/customers`, data);
                toast.success('Client créé avec succès !'); // Changement : toast
            }
            setShowModal(false);
            fetchCustomers();
            setError(null);
        } catch (err) {
            setError(err.response?.data?.msg || 'Opération échouée.');
            toast.error(err.response?.data?.msg || 'Opération échouée.'); // Changement : toast
        }
    };

    const handleDeleteCustomer = async (customerId, customerName) => {
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer le client : ${customerName} ?`)) {
            try {
                await axios.delete(`${API_URL}/customers/${customerId}`);
                toast.success(`Client ${customerName} supprimé.`); // Changement : toast
                fetchCustomers();
                setError(null);
            } catch (err) {
                setError(err.response?.data?.msg || 'Échec de la suppression du client.');
                toast.error(err.response?.data?.msg || 'Échec de la suppression du client.'); // Changement : toast
            }
        }
    };

    const handleOpenWithdrawalModal = (customer) => {
        setWithdrawalData({ customerId: customer._id, amount: 0, reason: `Retrait pour ${customer.name}` });
        setError(null);
        setShowWithdrawalModal(true);
    };

    const handleWithdrawalSubmit = async (e) => {
        e.preventDefault();
        try {
            const { customerId, amount, reason } = withdrawalData;
            if (amount <= 0) {
                toast.error('Le montant du retrait doit être supérieur à zéro.'); // Changement : toast
                return; // Stop execution
            }
            await axios.patch(`${API_URL}/customers/withdraw/${customerId}`, {
                amount: Number(amount),
                reason,
            });
            toast.success(`${formatCurrency(amount)} retiré du solde de bouteilles du client.`); // Changement : toast
            setShowWithdrawalModal(false);
            fetchCustomers();
            setError(null);
        } catch (err) {
            setError(err.response?.data?.msg || 'Échec du retrait. Vérifiez le solde et les journaux du serveur.');
            toast.error(err.response?.data?.msg || 'Échec du retrait.'); // Changement : toast
        }
    };


    // Handlers for Credit Adjustment
    const handleShowAdjustCreditModal = (customer) => {
        setCreditAdjustmentData({
            customerId: customer._id,
            customerName: customer.name,
            currentBalance: customer.creditBalance, // Assuming this field exists
            adjustmentAmount: 0,
            reason: '',
        });
        setError(null);
        setShowAdjustCreditModal(true);
    };

    const handleAdjustCredit = async (e) => {
        e.preventDefault();
        const { customerId, adjustmentAmount, reason } = creditAdjustmentData;

        if (adjustmentAmount <= 0) {
            toast.error("Le montant de l'ajustement doit être un nombre positif pour le paiement/l'augmentation du crédit."); // Changement : toast
            return;
        }

        try {
            const response = await axios.patch(`${API_URL}/customers/credit/${customerId}`, {
                adjustmentAmount: adjustmentAmount,
                reason: reason || 'Paiement Client/Ajustement Manuel',
            });

            fetchCustomers();
            toast.success(`Solde pour ${creditAdjustmentData.customerName} mis à jour ! Nouveau Solde: ${formatCurrency(response.data.newCreditBalance)}`); // Changement : toast
            setShowAdjustCreditModal(false);
            setError(null);
        } catch (err) {
            setError(`Échec de l'ajustement : ${err.response?.data?.msg || err.message}`);
            toast.error(`Échec de l'ajustement du solde : ${err.response?.data?.msg || err.message}`); // Changement : toast
        }
    };

    // Handlers for Points Reset
    const handleShowResetPointsModal = (customer) => {
        setResetPointsData({
            customerId: customer._id,
            customerName: customer.name,
            currentPoints: customer.totalPoints || 0,
        });
        setError(null);
        setShowResetPointsModal(true);
    };

    const handleResetPoints = async (e) => {
        e.preventDefault();
        const { customerId, customerName } = resetPointsData;

        try {
            await axios.patch(`${API_URL}/customers/points/${customerId}/reset`);

            fetchCustomers();
            toast.success(`Points de fidélité pour ${customerName} réinitialisés à zéro.`); // Changement : toast
            setShowResetPointsModal(false);
            setError(null);
        } catch (err) {
            setError(`Échec de la réinitialisation des points : ${err.response?.data?.msg || err.message}`);
            toast.error(`Échec de la réinitialisation des points : ${err.response?.data?.msg || err.message}`); // Changement : toast
        }
    };

    if (isLoading) return <Container className="text-center py-5"><Spinner animation="border" /> Chargement des Clients...</Container>;

    return (
        <Container className="my-5">
            {/* 💡 Header Style */}
            <h2 className="mb-4 d-flex align-items-center fw-light">
                <Users size={32} className="me-3 text-primary" /> **Gestion des Clients & Fidélité**
            </h2>

            {/* 💡 Action Button Style */}
            <Button variant="success" className="mb-4 d-flex align-items-center fw-bold btn-pos-action shadow-sm" onClick={() => handleOpenModal()}>
                <Plus size={20} className="me-2" /> Ajouter un Nouveau Client
            </Button>

            {error && <Alert variant="danger" className='shadow-sm'>{error}</Alert>}

            {/* 💡 Main Card Style */}
            <Card className="shadow-xl card-modern border-0">
                <Card.Body className="p-0">
                    <Table striped hover responsive className='align-middle mb-0'>
                        <thead className="table-primary text-white">
                            <tr>
                                <th>Nom</th>
                                <th>Téléphone</th>
                                <th>Email</th>
                                <th className='text-center'>Montant (Fc)</th>
                                <th className='text-center'>Points de Fidélité</th>
                                <th className='text-center'>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map((customer) => {
                                const creditBalance = customer.creditBalance || 0;
                                const totalPoints = customer.totalPoints || 0;
                                const isDebt = creditBalance < 0;
                                const isPositiveBalance = creditBalance >= 0; // C'est le Débit

                                const paymentButtonText = isDebt ? "Payer" : "Débiter";
                                const paymentButtonVariant = isDebt ? "outline-success" : "outline-primary"; // Bleu pour Débit, Vert pour Paiement (Dette)

                                return (
                                    <tr key={customer._id} className={isDebt ? 'table-danger-light fw-bold' : ''}>
                                        <td>
                                            <span className='fw-bold'>{customer.name}</span>
                                            <small className='text-muted d-block'>ID: {customer._id.slice(-6)}</small>
                                        </td>
                                        <td>{customer.phone || 'N/D'}</td>
                                        <td>{customer.email || 'N/D'}</td>

                                    
                                        {/* Credit/Debt Badge */}
                                        <td className='text-center'>
                                            <Badge
                                                bg={isDebt ? 'danger' : 'success'}
                                                className='p-2 fw-bold d-inline-flex align-items-center'
                                            >
                                                <DollarSign size={16} className='me-1' />
                                                {isDebt 
                                                    ? `DETTE: ${formatCurrency(Math.abs(creditBalance))}` 
                                                    : `DÉBIT: ${formatCurrency(creditBalance)}`}
                                            </Badge>
                                        </td>

                                        {/* Loyalty Points Badge */}
                                        <td className='text-center'>
                                            <Badge bg={totalPoints > 0 ? "info" : "secondary"} className='p-2 fw-bold d-inline-flex align-items-center text-dark'>
                                                <Star size={16} className='me-1' /> {totalPoints} Pts
                                            </Badge>
                                        </td>

                                        <td className='text-nowrap text-center'>
                                            {/* Action Buttons with modern icons and animation */}
                                            <Button variant="outline-primary" size="sm" className="me-2 btn-pos-action" onClick={() => handleOpenModal(customer)} title="Modifier les Détails Client">
                                                <Pencil size={16} />
                                            </Button>

                                            {/* Bouton Payer/Débiter DYNAMIQUE */}
                                            <Button 
                                                variant={paymentButtonVariant} 
                                                size="sm" 
                                                className="me-2 btn-pos-action fw-medium" 
                                                onClick={() => handleShowAdjustCreditModal(customer)} 
                                                title={isDebt ? "Accepter un Paiement pour réduire la Dette" : "Débiter le Solde Client"}
                                            >
                                                <HandCoins size={16} /> {paymentButtonText}
                                            </Button>

                                            <Button
                                                variant="outline-warning"
                                                size="sm"
                                                className="me-2 btn-pos-action fw-medium"
                                                onClick={() => handleShowResetPointsModal(customer)}
                                                title="Réinitialiser les Points de Fidélité"
                                                disabled={totalPoints === 0}
                                            >
                                                <RotateCcw size={16} /> Utiliser
                                            </Button>

                                            {/* <Button variant="outline-dark" size="sm" className="me-2 btn-pos-action fw-medium" onClick={() => handleOpenWithdrawalModal(customer)} title="Retrait de Bouteille/Crédit">
                                                <MinusCircle size={16} /> Retrait
                                            </Button> */}

                                            <Button variant="outline-danger" size="sm" className="btn-pos-action" onClick={() => handleDeleteCustomer(customer._id, customer.name)} title="Supprimer le Client">
                                                <Trash2 size={16} />
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            {/* Customer Add/Edit Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton className='bg-primary text-white'>
                    <Modal.Title><Users size={20} className='me-2' /> {isEditing ? 'Modifier le Client' : 'Ajouter un Nouveau Client'}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>**Nom du Client**</Form.Label>
                            <Form.Control
                                type="text"
                                value={customerForm.name}
                                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>**Téléphone**</Form.Label>
                            <Form.Control
                                type="tel"
                                value={customerForm.phone}
                                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>**Email**</Form.Label>
                            <Form.Control
                                type="email"
                                value={customerForm.email}
                                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                            />
                        </Form.Group>
                        {isEditing && (
                            <Form.Group className="mb-3">
                                <Form.Label>**Points de Fidélité Actuels**</Form.Label>
                                <Form.Control type="text" value={customerForm.totalPoints} disabled className='bg-light fw-bold' />
                            </Form.Group>
                        )}
                        {error && <Alert variant="danger">{error}</Alert>}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
                        <Button variant="primary" type="submit" className='fw-bold'>
                            <Pencil size={16} className='me-1' /> {isEditing ? 'Enregistrer les Modifications' : 'Créer le Client'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Bottle Withdrawal Modal */}
            <Modal show={showWithdrawalModal} onHide={() => setShowWithdrawalModal(false)} centered>
                <Modal.Header closeButton className='bg-warning text-dark'>
                    <Modal.Title><MinusCircle size={20} className='me-2' /> **Confirmer le Retrait**</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleWithdrawalSubmit}>
                    <Modal.Body>
                        <p className='fw-bold mb-3'>Client : {customers.find(c => c._id === withdrawalData.customerId)?.name || 'N/D'}</p>
                        <Form.Group className="mb-3">
                            <Form.Label>**Montant du Retrait (Fc)**</Form.Label>
                            <InputGroup>
                                <InputGroup.Text>Fc</InputGroup.Text>
                                <Form.Control
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={withdrawalData.amount}
                                    onChange={(e) => setWithdrawalData({ ...withdrawalData, amount: Number(e.target.value) })}
                                    required
                                />
                            </InputGroup>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>**Raison/Notes**</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={withdrawalData.reason}
                                onChange={(e) => setWithdrawalData({ ...withdrawalData, reason: e.target.value })}
                            />
                        </Form.Group>
                        {error && <Alert variant="danger">{error}</Alert>}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowWithdrawalModal(false)}>Annuler</Button>
                        <Button variant="warning" type="submit" className='fw-bold text-dark'>
                            <MinusCircle size={16} className='me-1' /> Confirmer le Retrait
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Credit Adjustment Modal (External Component) */}
            {
                showAdjustCreditModal && (
                    <AdjustCreditModal
                        show={showAdjustCreditModal}
                        onHide={() => setShowAdjustCreditModal(false)}
                        data={creditAdjustmentData}
                        setData={setCreditAdjustmentData}
                        handleSubmit={handleAdjustCredit}
                        error={error}
                    />
                )
            }

            {/* Reset Points Modal (External Component) */}
            {
                showResetPointsModal && (
                    <ResetPointsModal
                        show={showResetPointsModal}
                        onHide={() => setShowResetPointsModal(false)}
                        customerId={resetPointsData.customerId}
                        customerName={resetPointsData.customerName}
                        currentPoints={resetPointsData.currentPoints}
                        handleSubmit={handleResetPoints}
                        error={error}
                    />
                )
            }
        </Container>
    );
};

export default CustomerManagement;