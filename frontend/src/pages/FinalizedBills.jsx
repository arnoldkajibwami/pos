import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Container, Table, Button, Modal, Alert, Spinner, Card, Row, Col, Badge, Form } from 'react-bootstrap';
import {
    FileEdit,
    GlassWater,
    Wallet,
    Clock,
    User,
    CreditCard,
    Check,
    X,
    RefreshCw,
    Search,
    Filter
} from 'lucide-react';

// --- Configuration ---
const API_BASE_URL = 'http://localhost:5000/api/v1/bills';
// const API_BASE_URL = 'https://posbackend-usko.onrender.com/api/v1/bills';
const apiKey = ""; // Clé API Mock

// --- Fonctions utilitaires ---

/**
 * Convertit une chaîne de date en un format lisible.
 */
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    // Utilisation de 'fr-FR' pour le format français
    return new Date(dateString).toLocaleString('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short',
    });
};

// --- Composant principal ---

const FinalBills = ({ userRole = 'MANAGER' }) => {
    const [finalBills, setFinalBills] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- État pour le filtrage et la recherche ---
    const [filterData, setFilterData] = useState({
        dateRange: 'all', // 'today', 'last7days', 'last30days', 'all'
        customerName: '',
        waiterName: '',
        searchTerm: '', // Recherche générale
    });

    // État pour les Modales/Commentaires
    const [showModal, setShowModal] = useState(false);
    // FIX 1: Changed modalContent.message from string to React.Node (can be a string or a component)
    const [modalContent, setModalContent] = useState({ title: '', content: '', type: 'info', isHtml: false });

    // État pour les formulaires d'action
    const [showEditModal, setShowEditModal] = useState(false);
    const [currentBill, setCurrentBill] = useState(null);
    const [actionData, setActionData] = useState({
        actionType: null, // 'EDIT' ou 'SAVE_BOTTLE'
        billId: '',
        customerId: '',
        updatedItems: [],
        cardDetails: '',
        productId: '',
        quantityToSave: 1,
        maxQuantity: 1,
        actionDetails: '',
    });

    // --- Récupération des données ---

    const fetchFinalBills = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_BASE_URL}/final`, {
                headers: { 'X-User-Role': userRole }
            });
            const bills = (response.data.bills || []).map(bill => ({
                ...bill,
                customerId: bill.customer?._id || null,
            }));
            setFinalBills(bills);
        } catch (err) {
            console.error("Erreur lors de la récupération des factures finalisées :", err);
            setError("Échec du chargement des factures. Vérifiez la connexion réseau ou l'état du serveur.");
        } finally {
            setIsLoading(false);
        }
    }, [userRole]);

    useEffect(() => {
        fetchFinalBills();
    }, [fetchFinalBills]);

    // --- Logique de filtrage et de tri ---

    const getStartDateForFilter = (range) => {
        const now = new Date();
        const start = new Date(now.setHours(0, 0, 0, 0));

        switch (range) {
            case 'today':
                return start;
            case 'last7days':
                start.setDate(now.getDate() - 7);
                return start;
            case 'last30days':
                start.setMonth(now.getMonth() - 1);
                return start;
            case 'all':
            default:
                return null;
        }
    };

    /**
     * Filtre et trie le tableau de factures (Dernière opération en premier).
     */
    const filteredAndSortedBills = useMemo(() => {
        let filteredBills = finalBills;
        const { dateRange, customerName, waiterName, searchTerm } = filterData;

        // 1. Filtrage par date
        const startDate = getStartDateForFilter(dateRange);
        if (startDate) {
            filteredBills = filteredBills.filter(bill => {
                const billDate = new Date(bill.createdAt);
                return billDate >= startDate;
            });
        }

        // 2. Recherche par texte (ID, Client, Serveur)
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        if (lowerCaseSearchTerm) {
            filteredBills = filteredBills.filter(bill => {
                const customerMatch = (bill.customer?.name || bill.customerName || '').toLowerCase().includes(lowerCaseSearchTerm);
                const waiterMatch = (bill.waiterName || '').toLowerCase().includes(lowerCaseSearchTerm);
                const idMatch = (bill._id || '').toLowerCase().includes(lowerCaseSearchTerm);
                return customerMatch || waiterMatch || idMatch;
            });
        }

        // 3. Filtrage par client (liste déroulante)
        if (customerName) {
            const customerToMatch = customerName.toLowerCase();
            if (customerToMatch === 'walk-in') {
                filteredBills = filteredBills.filter(bill =>
                    !(bill.customer?.name || bill.customerName)
                );
            } else {
                filteredBills = filteredBills.filter(bill =>
                    (bill.customer?.name || bill.customerName || '').toLowerCase() === customerToMatch
                );
            }
        }

        // 4. Filtrage par serveur (liste déroulante)
        if (waiterName) {
            const waiterToMatch = waiterName.toLowerCase();
            filteredBills = filteredBills.filter(bill =>
                (bill.waiterName || 'System').toLowerCase() === waiterToMatch
            );
        }

        // 5. Tri : Dernière opération en premier (Ordre chronologique inverse)
        return filteredBills.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    }, [finalBills, filterData]);

    // Gestionnaire pour tous les changements de filtre
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilterData(prev => ({ ...prev, [name]: value }));
    };

    // Récupérer les listes uniques pour les filtres
    const uniqueWaiters = useMemo(() => {
        const waiters = finalBills.map(b => b.waiterName || 'Système').filter(Boolean); // Traduction de 'System'
        return [...new Set(waiters)].sort();
    }, [finalBills]);

    const uniqueCustomers = useMemo(() => {
        const customers = finalBills.map(b => b.customer?.name || b.customerName).filter(Boolean);
        return [...new Set(customers)].sort();
    }, [finalBills]);

    // --- Initiation des actions & Soumission de formulaire ---

    // FIX 2: Added 'content' and renamed 'message' in internal logic to 'content' for clarity
    const handleShowFeedbackModal = (title, content, type = 'info', isHtml = false) => {
        setModalContent({ title, content, type, isHtml });
        setShowModal(true);
    };

    const handleInitiateEditBill = (bill) => {
        setCurrentBill(bill);
        setActionData({
            actionType: 'EDIT',
            billId: bill._id, // Set billId for consistency
            customerId: bill.customerId || '',
            updatedItems: bill.items.map(item => ({
                productId: item.product?._id || item.product,
                quantity: item.quantity,
                name: item.name
            })),
            // Default cardDetails for a Card payment
            cardDetails: bill.paymentMethod === 'Card' ? (bill.cardDetails || '4 derniers chiffres : XXXX') : '',
            actionDetails: '',
            productId: '',
            quantityToSave: 1, // Consistent naming
            maxQuantity: 1, // Consistent naming
        });
        setShowEditModal(true);
    };

    const handleInitiateSaveBottle = (bill) => {
        const firstItem = bill.items.length > 0 ? bill.items[0] : null;

        setCurrentBill(bill);
        setActionData({
            actionType: 'SAVE_BOTTLE',
            billId: bill._id,
            customerId: bill.customer?._id || bill.customerId || '',
            updatedItems: [],
            cardDetails: '',
            productId: firstItem ? (firstItem.product?._id || firstItem.product) : '',
            quantityToSave: firstItem ? firstItem.quantity : 1,
            maxQuantity: firstItem ? firstItem.quantity : 1,
            actionDetails: '',
        });
        setShowEditModal(true);
    };

   const handleSubmitAction = useCallback(async (e) => {
    // Prevent default form submission only if it's a form event
    if (e && e.preventDefault) {
        e.preventDefault();
    }
    
    setIsLoading(true);
    setShowEditModal(false); // Ferme la modale immédiatement

    try {
        if (actionData.actionType === 'SAVE_BOTTLE') {
            
            const { billId, productId, quantityToSave } = actionData;

            if (!billId || !productId || typeof quantityToSave !== 'number' || quantityToSave <= 0) {
                throw new Error("Données incomplètes: La facture, le produit ou la quantité à sauvegarder est invalide. Veuillez réessayer.");
            }

            const dataToSend = {
                billId: billId,
                productId: productId,
                quantity: quantityToSave, 
            };

            await axios.patch(`${API_BASE_URL}/saved-products/save`, dataToSend);

            handleShowFeedbackModal('Succès', `La sauvegarde de ${dataToSend.quantity} bouteille(s) a été enregistrée avec succès.`, 'success');

        } else if (actionData.actionType === 'EDIT') {
            // Bloc de code responsable de la validation
            const { billId, updatedItems, cardDetails, actionDetails } = actionData;

            // --- CRITICAL FIX LINE 266: The validation remains important even if HTML required fails ---
            if (!billId || !actionDetails) {
                throw new Error("Données incomplètes: L'ID de la facture et les détails de l'action sont requis.");
            }
            
            // Map the updated items, ensuring 'name' and 'price' from the original bill are included
            const itemsWithFullDetails = updatedItems.map(updatedItem => {
                // Find the original item from the currentBill context
                const originalItem = currentBill.items.find(
                    i => (i.product?._id || i.product).toString() === updatedItem.productId.toString()
                );

                return {
                    // CRITICAL: Frontend sends 'items' array containing these fields:
                    productId: updatedItem.productId,
                    quantity: updatedItem.quantity,
                    name: updatedItem.name || originalItem?.name || 'N/A', // Send name
                    price: originalItem?.price || 0, // Send original price (should not be changed by client here)
                };
            });
            
            const dataToSend = {
                // FIX: The backend expects the array to be named 'items'
                items: itemsWithFullDetails, 
                cardDetails: cardDetails, // Include cardDetails
                actionDetails: actionDetails, // Include actionDetails
            };
            
            // API call now matches the updated backend route: PATCH /api/v1/bills/:id
            await axios.patch(`${API_BASE_URL}/${billId}`, dataToSend);

            handleShowFeedbackModal('Succès', `La facture FC {billId.substring(0, 8)}...** a été modifiée et mise à jour avec succès.`, 'success', true);
        } else {
            throw new Error("Type d'action non reconnu ou non spécifié.");
        }

        // Refresh the bills list
        fetchFinalBills();

    } catch (error) {
        console.error('Action échouée :', error);
        // This handles the new network error from a possible server crash/refusal
        const errorMessage = error.response?.data?.msg || error.message || 'Une erreur interne est survenue.';
        handleShowFeedbackModal(
            `Erreur lors de l'action ${actionData.actionType}`,
            `Erreur : ${errorMessage}. L'action n'a pas pu être traitée.`,
            'danger'
        );
        // Reopen the modal on error to allow user to correct the input
        setShowEditModal(true); 
    } finally {
        setIsLoading(false);
    }
}, [actionData, fetchFinalBills, currentBill]); // Include dependencies

    // --- Fonctions d'aide au rendu ---

    const renderStatusBadge = (status) => {
        let variant = 'success';
        let text = status || 'N/A';
        if (status === 'draft') variant = 'secondary';
        return <Badge bg={variant}>{(text === 'draft' ? 'BROUILLON' : text).toUpperCase()}</Badge>;
    };

  const renderBillDetails = (bill) => (
    <div>
        <Row className="mb-3">
            <Col md={6}>
                <Card.Text><strong>Client :</strong> {bill.customer?.name || bill.customerName || 'Client de passage'}</Card.Text>
                <Card.Text><strong>Serveur :</strong> {bill.waiterName || 'Système'}</Card.Text>
                <Card.Text><strong>Date de Création :</strong> {formatDate(bill.createdAt)}</Card.Text>
                <Card.Text><strong>Statut du Paiement :</strong> <Badge bg={bill.paymentStatus === 'paid' ? 'success' : 'warning'}>{bill.paymentStatus || 'N/A'}</Badge></Card.Text>
            </Col>
            <Col md={6}>
                <Card.Text>
                    <strong>Total Payé :</strong> 
                    <span className='fw-bold text-success'>
                        {/* Ensure we display 0.00 if the value is null/undefined */}
                        {(bill.amountPaid != null ? bill.amountPaid : 0).toFixed(0)} Fc
                    </span>
                </Card.Text>
                <Card.Text><strong>Méthode :</strong> {bill.paymentMethod || 'Non spécifié'}</Card.Text>
                <Card.Text>
                    <strong>Crédit Initial :</strong> 
                    {(bill.customerInitialCreditBalance != null ? bill.customerInitialCreditBalance : 0).toFixed(0)} Fc
                </Card.Text>
                <Card.Text>
                    <strong>Crédit Final :</strong> 
                    {(bill.customerFinalCreditBalance != null ? bill.customerFinalCreditBalance : 0).toFixed(0)} Fc
                </Card.Text>
            </Col>
        </Row>

        <h6 className="mt-3">Articles</h6>
        <Table striped bordered size="sm">
            <thead>
                <tr>
                    <th>Produit</th>
                    <th className='text-end'>Qté</th>
                    <th className='text-end'>Prix Unitaire</th>
                    <th className='text-end'>Total</th>
                </tr>
            </thead>
            <tbody>
                {bill.items.map((item, index) => {
                    // Calculate item total safely
                    const itemPrice = item.price || 0;
                    const itemQuantity = item.quantity || 0;
                    const itemTotal = itemQuantity * itemPrice;
                    
                    return (
                        <tr key={index}>
                            <td>{item.name || item.product?.name || 'N/A'}</td>
                            <td className='text-end'>{itemQuantity}</td>
                            <td className='text-end'>{itemPrice.toFixed(0)} Fc</td>
                            <td className='text-end fw-bold'>{itemTotal.toFixed(0)} FC</td>
                        </tr>
                    );
                })}
            </tbody>
        </Table>

        {bill.actionLog && bill.actionLog.length > 0 && (
            <>
                <h6 className="mt-3">Historique des Actions</h6>
                <div className="small bg-light p-2 border rounded" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    {bill.actionLog.slice().reverse()?.map((log, index) => { 
                        // Using log.adminName as suggested in your earlier context
                        const adminDisplay = log.adminName || (log.admin ? `${log.admin.substring(0, 8)}...` : 'Inconnu'); 

                        return (
                            <p key={index} className="mb-1 border-bottom pb-1">
                                <span className="fw-bold">{log.action}</span> par {adminDisplay} le {formatDate(log.timestamp || log.date)}
                                <br />
                                <em className="text-muted">{log.details}</em>
                            </p>
                        );
                    })}
                </div>
            </>
        )}
    </div>
);

    const renderBillRow = (bill) => (
        <tr key={bill._id}>
            <td className="align-middle" title={bill._id}>
                {bill._id.substring(0, 8)}...
            </td>
            <td className="align-middle">
                <Clock size={14} className="me-2 text-primary" />
                {formatDate(bill.createdAt)}
            </td>
            <td className="align-middle">
                <User size={14} className="me-2 text-info" />
                {bill.customer?.name || bill.customerName || 'Client de passage'}
            </td>
            <td className="align-middle">
                {bill.waiterName || 'Système'}
            </td>
            <td className="align-middle text-end fw-bold text-success">
                {bill.total?.toFixed(0) || '0.00'} Fc
            </td>
            <td className="align-middle">
                <CreditCard size={14} className="me-2 text-secondary" />
                {bill.paymentMethod || 'Non spécifié'}
            </td>
            <td className="align-middle">
                {renderStatusBadge(bill.status)}
            </td>
            <td className="align-middle text-center">
                <div className="d-flex justify-content-center gap-2">
                    {/* Bouton Modifier */}
                    <Button
                        variant="outline-primary"
                        size="sm"
                        title="Modifier la facture finalisée"
                        onClick={() => handleInitiateEditBill(bill)}
                        disabled={userRole !== 'MANAGER' && userRole !== 'ADMIN'}
                    >
                        <FileEdit size={16} />
                    </Button>

                    {/* Bouton Sauvegarder Bouteille */}
                    <Button
                        variant="outline-info"
                        size="sm"
                        title="Enregistrer la bouteille pour le client"
                        // disabled={(!bill.customerId) || (userRole !== 'MANAGER' && userRole !== 'ADMIN')}
                        onClick={() => handleInitiateSaveBottle(bill)}
                    >
                        <GlassWater size={16} />
                    </Button>

                    {/* Bouton Voir Détails */}
                    <Button
                        variant="outline-secondary"
                        size="sm"
                        title="Voir les détails"
                        // FIX 5: Pass renderBillDetails(bill) as the content, not a stringified version. isHtml: false is sufficient for React element.
                        onClick={() => handleShowFeedbackModal(`Détails de la facture ${bill._id.substring(0, 8)}...`, renderBillDetails(bill), 'info', false)}
                    >
                        <Wallet size={16} />
                    </Button>
                </div>
            </td>
        </tr>
    );

    // --- Fonctions de rendu des Modales ---

    const renderEditForm = () => (
        // FIX 6: Use handleSubmitAction in the Form onSubmit
        // Added id="edit-bill-form" to link the submit button in the footer
        <Form id="edit-bill-form" onSubmit={handleSubmitAction}>
            <p className="text-muted small">ID Facture : **{currentBill?._id.substring(0, 12)}...**</p>
            <Form.Group className="mb-3">
                <Form.Label className='fw-bold'>Détails du paiement par carte (terminal POS)</Form.Label>
                <Form.Control
                    type="text"
                    placeholder="ex: Code Auth: 123456, 4 derniers chiffres: 7890"
                    value={actionData.cardDetails}
                    onChange={(e) => setActionData({ ...actionData, cardDetails: e.target.value })}
                />
                <Form.Text className="text-muted">
                    Ceci enregistre les détails de la transaction pour la réconciliation.
                </Form.Text>
            </Form.Group>

            <hr />
            <h6 className='mt-3'>Mises à jour des articles (Ajustement manuel du stock)</h6>
            {actionData.updatedItems.map((item, index) => (
                <Row key={item.productId} className="mb-2 align-items-center">
                    <Col xs={8}>{item.name}</Col>
                    <Col xs={4}>
                        <Form.Control
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => {
                                const newItems = [...actionData.updatedItems];
                                newItems[index].quantity = parseInt(e.target.value) || 0;
                                setActionData({ ...actionData, updatedItems: newItems });
                            }}
                        />
                    </Col>
                </Row>
            ))}
            <Form.Group className="mt-3">
                <Form.Label className='fw-bold'>Raison de la modification (Détails de l'action)</Form.Label>
                <Form.Control
                    as="textarea"
                    rows={2}
                    placeholder="ex: Correction de prix, suppression d'article suite à une plainte."
                    value={actionData.actionDetails}
                    // 👇 CORRECTION DÉJÀ APPLIQUÉE
                    onChange={(e) => setActionData(prev => ({ ...prev, actionDetails: e.target.value }))}
                    required // This is what should prevent empty submission via HTML5 validation
                />
            </Form.Group>
            {/* The actual submit button is in the Modal.Footer, no need for button here */}
        </Form>
    );

    const renderSaveBottleForm = () => {
        const savableItems = currentBill?.items.filter(item => item.product);

        // FIX 6: Use handleSubmitAction in the Form onSubmit
        // Added id="save-bottle-form" to link the submit button in the footer
        return (
            <Form id="save-bottle-form" onSubmit={handleSubmitAction}>
                <p className="text-muted small">Client : **{currentBill?.customer?.name || currentBill?.customerName}** (ID : **{actionData.customerId.substring(0, 8)}...**)</p>
                <p className="text-muted small">ID Facture : **{currentBill?._id.substring(0, 12)}...**</p>

                <Form.Group className="mb-3">
                    <Form.Label className='fw-bold'>Produit à sauvegarder</Form.Label>
                    <Form.Select
                        value={actionData.productId}
                        onChange={(e) => {
                            // Logic to update maxQuantity when product changes
                            const selectedItem = savableItems?.find(item => (item.product?._id || item.product).toString() === e.target.value);
                            setActionData(prev => ({ 
                                ...prev, 
                                productId: e.target.value,
                                maxQuantity: selectedItem ? selectedItem.quantity : 1,
                                quantityToSave: selectedItem ? selectedItem.quantity : 1, // Reset quantity to max available
                            }));
                        }}
                        required
                    >
                        <option value="">Sélectionnez un produit de la facture</option>
                        {savableItems?.map(item => (
                            <option key={item.product?._id || item.product} value={item.product?._id || item.product}>
                                {item.name} (Qté: {item.quantity})
                            </option>
                        ))}
                    </Form.Select>
                    <Form.Text className="text-danger small">
                        **Important :** La sauvegarde d'un produit **n'ajuste pas** la quantité en stock **.
                    </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label className='fw-bold'>Quantité à sauvegarder</Form.Label>
                    <Form.Control
                        type="number"
                        min="1"
                        max={actionData.maxQuantity || 999}
                        value={actionData.quantityToSave}
                        onChange={(e) => setActionData({ ...actionData, quantityToSave: parseInt(e.target.value) || 1 })}
                        required // Ensure quantity is set
                    />
                    <Form.Text className="text-muted small">
                        Max disponible pour l'article sélectionné: {actionData.maxQuantity || 'N/A'}
                    </Form.Text>
                </Form.Group>
                {/* The actual submit button is in the Modal.Footer, no need for button here */}
            </Form>
        );
    };

    // --- Rendu principal ---

    if (isLoading) {
        return (
            <Container className="text-center py-5">
                <Spinner animation="border" variant="primary" role="status">
                    <span className="visually-hidden">Chargement des factures...</span>
                </Spinner>
                <p className="mt-2">Chargement des factures finalisées, veuillez patienter...</p>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="py-4">
                <Alert variant="danger" className="shadow-sm">
                    <h4 className="alert-heading">Erreur de récupération des données !</h4>
                    <p>{error}</p>
                    <hr />
                    <div className="d-flex justify-content-end">
                        <Button onClick={fetchFinalBills} variant="outline-danger">
                            <RefreshCw size={18} className="me-2" />
                            Réessayer
                        </Button>
                    </div>
                </Alert>
            </Container>
        );
    }

    return (
        <Container fluid className="py-4 px-2 px-md-5">
            <Card className="shadow-lg border-0">
                <Card.Header className="bg-primary text-white p-3 rounded-top">
                    <Row className="align-items-center">
                        <Col>
                            <h4 className="mb-0 fw-light">Tableau de bord des factures finalisées</h4>
                            <p className="mb-0 small opacity-75">Examiner et gérer les transactions finalisées.</p>
                        </Col>
                        <Col xs="auto">
                            <Button variant="light" size="sm" onClick={fetchFinalBills} title="Actualiser les données">
                                <RefreshCw size={18} className="text-primary" />
                            </Button>
                        </Col>
                    </Row>
                </Card.Header>
                <Card.Body className="p-3">
                    {/* --- Interface de recherche et de filtre --- */}
                    <Card className='mb-4 border-0 bg-light'>
                        <Card.Body className='p-3'>
                            <Row className="g-3 align-items-end">
                                {/* Champ de recherche */}
                                <Col md={12} lg={4}>
                                    <Form.Group controlId="filterSearchTerm">
                                        <Form.Label className='fw-bold'><Search size={14} className="me-2" />Rechercher des factures</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="ID, Client ou Nom du serveur"
                                            name="searchTerm"
                                            value={filterData.searchTerm}
                                            onChange={handleFilterChange}
                                        />
                                    </Form.Group>
                                </Col>
                                {/* Filtre par date */}
                                <Col xs={12} sm={4} lg={2}>
                                    <Form.Group controlId="filterDateRange">
                                        <Form.Label className='fw-bold'><Clock size={14} className="me-2" />Période</Form.Label>
                                        <Form.Select name="dateRange" value={filterData.dateRange} onChange={handleFilterChange}>
                                            <option value="all">Toutes les périodes</option>
                                            <option value="today">Aujourd'hui</option>
                                            <option value="last7days">7 derniers jours</option>
                                            <option value="last30days">30 derniers jours</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col xs={12} sm={4} lg={3}>
                                    <Form.Group controlId="filterCustomerName">
                                        <Form.Label className='fw-bold'><User size={14} className="me-2" />Client</Form.Label>
                                        <Form.Select name="customerName" value={filterData.customerName} onChange={handleFilterChange}>
                                            <option value="">Tous les clients</option>
                                            <option value="walk-in">Client de passage</option>
                                            {uniqueCustomers.map(name => <option key={name} value={name}>{name}</option>)}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col xs={12} sm={4} lg={3}>
                                    <Form.Group controlId="filterWaiterName">
                                        <Form.Label className='fw-bold'><GlassWater size={14} className="me-2" />Serveur</Form.Label>
                                        <Form.Select name="waiterName" value={filterData.waiterName} onChange={handleFilterChange}>
                                            <option value="">Tous les serveurs</option>
                                            <option value="System">Système</option>
                                            {uniqueWaiters.map(name => <option key={name} value={name}>{name}</option>)}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                    {filteredAndSortedBills.length === 0 && !isLoading ? (
                        <Alert variant="warning" className="m-3 text-center">
                            Aucune facture finalisée ne correspond aux filtres actuels.
                        </Alert>
                    ) : (
                        <div className="table-responsive">
                            <Table striped bordered hover className="mb-0 align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ width: '10%' }}>ID</th>
                                        <th style={{ width: '15%' }}>Date/Heure</th>
                                        <th style={{ width: '20%' }}>Client</th>
                                        <th style={{ width: '15%' }}>Caissier/Serveur</th>
                                        <th className="text-end" style={{ width: '10%' }}>Total</th>
                                        <th style={{ width: '15%' }}>Paiement</th>
                                        <th style={{ width: '10%' }}>Statut</th>
                                        <th className="text-center" style={{ width: '10%' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAndSortedBills.map(renderBillRow)}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Card.Body>
                <Card.Footer className="text-muted small">
                    Affichage de **{filteredAndSortedBills.length}** sur **{finalBills.length}** factures finalisées récentes.
                </Card.Footer>
            </Card>
            {/* Modal for Edit/SaveBottle Action Forms */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title>
                        {actionData.actionType === 'EDIT' ? 'Modifier la facture finalisée (Ajustements Stock & Paiement)' : 'Sauvegarder un produit (Crédit Bouteille)'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {/* The form components themselves render the form, but the onSubmit needs to be captured */}
                    {actionData.actionType === 'EDIT' ? renderEditForm() : renderSaveBottleForm()}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                        Annuler
                    </Button>
                    {/* FIX 7: Link the submit button to the corresponding form using type="submit" and form="[id]" */}
                    {actionData.actionType === 'EDIT' && (
                        <Button
                            variant="primary"
                            type="submit"
                            form="edit-bill-form" // Links button to the EDIT form
                            disabled={isLoading}
                        >
                            Appliquer les changements & Mettre à jour
                        </Button>
                    )}
                    {actionData.actionType === 'SAVE_BOTTLE' && (
                         <Button
                            variant="primary"
                            type="submit"
                            form="save-bottle-form" // Links button to the SAVE_BOTTLE form
                            disabled={isLoading}
                        >
                            Confirmer la sauvegarde de la bouteille
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>
            {/* Modal for Feedback/Details */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton className={`bg-${modalContent.type === 'danger' ? 'danger' : modalContent.type === 'success' ? 'success' : 'light'} ${modalContent.type === 'danger' || modalContent.type === 'success' ? 'text-white' : ''}`}>
                    <Modal.Title className="d-flex align-items-center">
                        {modalContent.type === 'success' ? <Check size={24} className="me-2" /> :
                            modalContent.type === 'danger' ? <X size={24} className="me-2" /> :
                                <CreditCard size={24} className="text-primary me-2" />
                        }
                        {modalContent.title}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {/* FIX 8: Conditional rendering: use dangerouslySetInnerHTML only for actual HTML/string messages (isHtml: true), otherwise render as a React node (which fixes [object Object]) */}
                    {modalContent.isHtml 
                        ? <div dangerouslySetInnerHTML={{ __html: modalContent.content }}></div>
                        : modalContent.content
                    }
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Fermer
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default FinalBills;
