import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Container, Card, Table, Button, Spinner, Alert, Form, InputGroup, Badge, Modal } from 'react-bootstrap';
// Lucide Icons for a modern look
import { Receipt as ReceiptIcon, Search, Eye, Printer, X, ListOrdered } from 'lucide-react';
import API_URL from '../api/api'
import axios from 'axios';
import ReceiptComponent from '../components/Receipt'; 

// --- Configuration ---
// const API_URL = 'http://localhost:5000/api/v1'; 

// Function to handle thermal printing (unchanged)
const printContent = (elementId) => {
    const content = document.getElementById(elementId);
    if (!content) {
        console.error(`Error: Element with ID ${elementId} not found for printing.`);
        return false;
    }

    const printContents = content.innerHTML;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);

    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(`
        <html>
        <head>
            <title>Reçu</title>
            <style>
                @page { 
                    size: 80mm auto; 
                    margin: 0;
                }
                body {
                    margin: 0;
                    font-family: monospace;
                    background-color: white !important;
                }
                div { display: block !important; } 
            </style>
        </head>
        <body>
            ${printContents}
        </body>
        </html>
    `);
    iframe.contentWindow.document.close();

    iframe.contentWindow.print();

    setTimeout(() => {
        document.body.removeChild(iframe);
    }, 100);

    return true;
};
// --- END Configuration ---


const BillHistory = ({ user }) => {
    const [bills, setBills] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedBill, setSelectedBill] = useState(null);
    const [billToPrint, setBillToPrint] = useState(null);

    // --- Data Fetching ---
    const fetchBills = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            
            // CORRECTION: Appel à l'endpoint /bills/final
            const response = await axios.get(`${API_URL}/bills/final`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const billData = response.data.bills || response.data.finalBills || [];
            
            const sortedBills = billData.sort((a, b) => 
                new Date(b.createdAt) - new Date(a.createdAt)
            );
            setBills(sortedBills);

        } catch (err) {
            console.error('Failed to fetch finalized bills:', err);
            setError('Échec du chargement de l\'historique des factures finalisées. Vérifiez votre connexion API.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBills();
    }, [fetchBills]);
    
    // ⭐ EFFECT QUI GÈRE L'IMPRESSION APRÈS RENDU (pour résoudre le problème de timing)
    useEffect(() => {
        if (billToPrint) {
            // Délai pour laisser React mettre à jour le DOM
            const printTimer = setTimeout(() => {
                const printed = printContent('print-bill-receipt-content');
                
                // Réinitialiser l'état après l'impression
                if (printed) {
                     setTimeout(() => setBillToPrint(null), 200); 
                } else {
                     setBillToPrint(null);
                }
            }, 50);

            return () => clearTimeout(printTimer);
        }
    }, [billToPrint]);

    // --- Handlers ---
    const handleShowDetails = (bill) => {
        setSelectedBill(bill);
        setShowDetailsModal(true);
    };

    const handlePrintBill = (bill) => {
        // Déclenche le useEffect
        setBillToPrint(bill); 
    };

    // --- Filtering Logic ---
    const filteredBills = useMemo(() => {
        const lowerCaseSearch = searchTerm.toLowerCase();

        return bills.filter(bill =>
            bill._id.toLowerCase().includes(lowerCaseSearch) ||
            bill.customer?.name?.toLowerCase().includes(lowerCaseSearch) ||
            bill.customer?.phone?.includes(searchTerm) ||
            bill.waiter?.name?.toLowerCase().includes(lowerCaseSearch) ||
            bill.paymentMethod?.toLowerCase().includes(lowerCaseSearch)
        );
    }, [bills, searchTerm]);

    if (isLoading) {
        return <Container className="text-center mt-5"><Spinner animation="border" /></Container>;
    }

    return (
        <>
            <Container className="my-5">
                <h2 className="mb-4 d-flex align-items-center fw-light">
                    <ListOrdered size={32} className="me-3 text-primary" /> **Historique des Factures** (Archived Bills)
                </h2>

                {error && <Alert variant="danger" className="d-flex align-items-center shadow-sm"><X size={20} className="me-2" />**Erreur:** {error}</Alert>}

                <Card className="shadow-xl card-modern border-0">
                    <Card.Body className="p-0">
                        <div className="d-flex justify-content-between align-items-center p-3 border-bottom bg-light">
                            {/* Search Input Group */}
                            <InputGroup style={{ maxWidth: '400px' }} className='shadow-sm'>
                                <InputGroup.Text><Search size={16} /></InputGroup.Text>
                                <Form.Control
                                    placeholder="Rechercher par ID, Client, Serveur ou Paiement..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </InputGroup>

                            {/* Info */}
                            <p className="m-0 fw-bold text-secondary">
                                Factures Affichées: <Badge bg="primary">{filteredBills.length}</Badge> / Total: <Badge bg="secondary">{bills.length}</Badge>
                            </p>
                        </div>

                        <Table striped hover responsive className="mb-0">
                            <thead className="table-primary text-white">
                                <tr>
                                    <th>Facture #</th>
                                    <th>Date & Heure</th>
                                    <th>Client</th>
                                    <th className='text-center'>Articles</th>
                                    <th>Serveur</th>
                                    <th>Paiement</th>
                                    <th className='text-end'>Total Payé</th>
                                    <th className='text-center'>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBills.length > 0 ? (
                                    filteredBills.map((bill) => (
                                        <tr key={bill._id}>
                                            <td>
                                                <Badge bg="success" className="fw-bolder">
                                                    {bill._id.slice(-6)}
                                                </Badge>
                                            </td>
                                            <td>{new Date(bill.createdAt).toLocaleString()}</td>
                                            <td>{bill.customer?.name || 'Client de Passage'}</td>
                                            <td className='text-center'>{bill.items.length}</td>
                                            <td>{bill.waiter?.name || bill.cashier?.name || 'Inconnu'}</td>
                                            <td>
                                                <Badge bg="info" className='fw-medium'>
                                                    {bill.paymentMethod || 'Espèces'}
                                                </Badge>
                                            </td>
                                            {/* ⭐ CORRECTION: Utiliser bill.totalAmount ou bill.total en fallback */}
                                            <td className='fw-bolder fs-6 text-end text-success'>
                                                FC  {(bill.totalAmount || bill.total || 0).toFixed(0)}**
                                            </td>
                                            <td className='text-nowrap text-center'>
                                                {/* Action Buttons */}
                                                <Button variant="outline-primary" size="sm" className="me-2 btn-pos-action" onClick={() => handleShowDetails(bill)} title="Voir les Détails">
                                                    <Eye size={16} />
                                                </Button>
                                                <Button variant="outline-secondary" size="sm" className="btn-pos-action" onClick={() => handlePrintBill(bill)} title="Réimprimer le Reçu">
                                                    <Printer size={16} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="text-center py-5">
                                            <Alert variant="info" className="m-0 border-0 d-flex align-items-center justify-content-center">
                                                <Search size={20} className='me-2' />
                                                Aucune facture finalisée trouvée.
                                            </Alert>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            </Container>

            {/* BILL DETAILS MODAL (INLINE COMPONENT) */}
            <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg" centered>
                <Modal.Header closeButton className='bg-primary text-white'>
                    <Modal.Title><ReceiptIcon size={20} className='me-2' /> **Détails de la Facture #{selectedBill?._id?.slice(-6)}**</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedBill && (
                        <div>
                            <h5 className='fw-bold mb-3'>Information Générale</h5>
                            <dl className="row">
                                <dt className="col-sm-4">Client:</dt>
                                <dd className="col-sm-8">{selectedBill.customer?.name || 'Client de Passage'}</dd>

                                <dt className="col-sm-4">Date de Paiement:</dt>
                                <dd className="col-sm-8">{new Date(selectedBill.createdAt).toLocaleString()}</dd>

                                <dt className="col-sm-4">Serveur/Caissier:</dt>
                                <dd className="col-sm-8">{selectedBill.waiter?.name || selectedBill.cashier?.name || 'N/A'}</dd>

                                <dt className="col-sm-4">Méthode de Paiement:</dt>
                                <dd className="col-sm-8"><Badge bg="info">{selectedBill.paymentMethod || 'Inconnu'}</Badge></dd>
                            </dl>

                            <h5 className='fw-bold mb-3 mt-4'>Articles Achetés</h5>
                            <Table striped bordered hover size="sm">
                                <thead>
                                    <tr>
                                        <th>Article</th>
                                        <th className='text-center'>Qté</th>
                                        <th className='text-end'>Prix Unitaire</th>
                                        <th className='text-end'>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedBill.items.map((item, index) => (
                                        <tr key={index}>
                                            <td>{item.name}</td>
                                            <td className='text-center'>{item.quantity}</td>
                                            <td className='text-end'>${(item.price || 0).toFixed(0)}</td>
                                            <td className='text-end fw-bold'>${((item.price || 0) * (item.quantity || 0)).toFixed(0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                            <h4 className='text-end mt-4 text-success fw-bolder'>
                                **TOTAL PAYÉ : ${(selectedBill.totalAmount || selectedBill.total || 0).toFixed(0)}**
                            </h4>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>Fermer</Button>
                </Modal.Footer>
            </Modal>
            
            {/* Hidden Receipt Component for Printing */}
            <div className="receipt-wrapper screen-hide" id="print-bill-receipt-content">
                {billToPrint && (
                    <ReceiptComponent
                        cart={billToPrint.items.map(item => ({ 
                            name: item.name, 
                            price: item.price, 
                            quantity: item.quantity 
                        }))}
                        cartTotal={billToPrint.totalAmount || billToPrint.total}
                        customer={billToPrint.customer}
                        user={billToPrint.cashier || billToPrint.waiter || user} 
                        billId={billToPrint._id}
                    />
                )}
            </div>
        </>
    );
};

export default BillHistory;