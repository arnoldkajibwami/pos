// Fichier : Inventory.jsx

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Container, Row, Col, Card, Alert, Spinner, Table, Button,
    Modal, Form, Badge, InputGroup, Accordion, Tab, Tabs, Pagination
} from 'react-bootstrap';
import {
    MoveHorizontal, Pencil, Package, ArrowRight, LineChart, Redo,
    History, Calendar, Wallet, Printer, Filter, User, UserCheck, RefreshCw, AlertTriangle, DollarSign,
    ChevronLeft, Zap, ChevronRight, Search, TrendingUp, HandHelping, ClipboardList
} from 'lucide-react'; // Added HandHelping for Credit/Debt

import API_URL from '../api/api'
import axios from 'axios';
import { FaPlus, FaMinus, FaChartArea, FaChartBar } from 'react-icons/fa';
import DetailedInventoryReport from './DetailedInventoryReport';


// ====================================================================\
// UTILITAIRES ET SIMULATIONS DE DÉPENDANCES EXTERNES
// ====================================================================\

// Simulation d'une URL d'API
// const API_URL = 'http://localhost:5000/api/v1';  // test
// const API_URL= axios.create({ 
  // baseURL:  //`${window.location.origin}/api/v1` 
//});

// Utilitaire pour le formatage de la devise
const formatCurrency = (amount) => `${Number(amount).toFixed(0)} Fc`;

// Utilitaire pour formater la date en YYYY-MM-DD
const formatDateForApi = (date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
};

// SIMULATION DE DÉPENDANCE EXTERNE (useAuth)
const useAuth = () => ({
    // Données utilisateur fictives pour les tests de permissions
    user: {
        name: "Utilisateur Manager",
        role: "Manager",
        id: "U_MGR_001"
    },
    // Simulation de vérification de permission
    isManagerOrAdmin: true
});

// SIMULATION DE DÉPENDANCE EXTERNE (useReactToPrint)
const useReactToPrint = ({ content, documentTitle }) => {
    // Fonction d'impression simulée
    return () => {
        console.log(`Impression du document : ${documentTitle}`);
        // Dans une application réelle, cela déclencherait la boîte de dialogue d'impression du navigateur
        alert(`Simulation d'impression pour : ${documentTitle}`);
    };
};


const ModalAjustementStockProduit = ({ show, onHide, product, refreshData }) => {
    const [typeAjustement, setTypeAjustement] = useState('add'); // 'add' ou 'subtract'
    const [emplacementStock, setEmplacementStock] = useState('stockBar'); // 'stockBar' ou 'stockGeneral'
    const [quantite, setQuantite] = useState('');
    const [raison, setRaison] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [erreur, setErreur] = useState(null);

    useEffect(() => {
        if (show) {
            setTypeAjustement('add');
            setEmplacementStock('stockGeneral');
            setQuantite('');
            setRaison('');
            setErreur(null);
        }
    }, [show]);

    const gererAjustementStock = async (e) => {
        e.preventDefault();
        if (!product?._id) return;
        setErreur(null);
        setIsLoading(true);

        const montantAjustement = (typeAjustement === 'subtract' ? -1 : 1) * Number(quantite);

        try {
            await axios.patch(`${API_URL}/inventory/product/adjust/${product._id}`, {
                adjustmentAmount: montantAjustement,
                stockField: emplacementStock,
                reason: raison,
            });

            refreshData();
            onHide();
        } catch (err) {
            console.error('Échec de l\'ajustement :', err.response?.data || err.message);
            setErreur(err.response?.data?.msg || 'Échec de l\'ajustement du stock. Vérifiez les logs du serveur.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide}>
            <Form onSubmit={gererAjustementStock}>
                <Modal.Header closeButton>
                    <Modal.Title><Pencil size={20} className='me-2' /> Ajuster le Stock pour : **{product?.name}**</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Stock Actuel (Bar) : **{product?.stockBar || 0}** | Stock Actuel (Général) : **{product?.stockGeneral || 0}**</p>

                    <Form.Group className="mb-3">
                        <Form.Label>Type d'Ajustement</Form.Label>
                        <Form.Select value={typeAjustement} onChange={(e) => setTypeAjustement(e.target.value)}>
                            <option value="add">Ajouter du Stock (Augmenter)</option>
                            <option value="subtract">Soustraire du Stock (Diminuer)</option>
                        </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Emplacement du Stock</Form.Label>
                        <Form.Select value={emplacementStock} onChange={(e) => setEmplacementStock(e.target.value)}>
                            <option value="stockGeneral">Stockage Général (stockGeneral)</option>
                            <option value="stockBar">Bar/Comptoir (stockBar)</option>
                        </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Quantité</Form.Label>
                        <InputGroup>
                            <InputGroup.Text>{typeAjustement === 'add' ? <FaPlus /> : <FaMinus />}</InputGroup.Text>
                            <Form.Control
                                type="number"
                                min="0.01"
                                step="any"
                                value={quantite}
                                onChange={(e) => setQuantite(e.target.value)}
                                required
                                autoFocus
                            />
                        </InputGroup>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Raison (Obligatoire pour la soustraction)</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            value={raison}
                            onChange={(e) => setRaison(e.target.value)}
                            required={typeAjustement === 'subtract'}
                        />
                    </Form.Group>

                    {erreur && <Alert variant="danger" className="mt-3">{erreur}</Alert>}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide}>Annuler</Button>
                    <Button variant="primary" type="submit" disabled={isLoading || !quantite || Number(quantite) <= 0 || (typeAjustement === 'subtract' && !raison)}>
                        {isLoading ? <Spinner animation="border" size="sm" /> : `${typeAjustement === 'add' ? 'Ajouter' : 'Soustraire'} Stock`}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

const ModalTransfertStockProduit = ({ show, onHide, product, refreshData }) => {
    const [emplacementDepart, setEmplacementDepart] = useState('stockGeneral');
    const [emplacementArrivee, setEmplacementArrivee] = useState('stockBar');
    const [quantite, setQuantite] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [erreur, setErreur] = useState(null);

    const getStockValue = useCallback((location) => product?.[location] || 0, [product]);

    useEffect(() => {
        if (show) {
            setEmplacementDepart('stockGeneral');
            setEmplacementArrivee('stockBar');
            setQuantite('');
            setErreur(null);
        }
    }, [show]);

    useEffect(() => {
        if (emplacementDepart === 'stockGeneral') {
            setEmplacementArrivee('stockBar');
        } else {
            setEmplacementArrivee('stockGeneral');
        }
    }, [emplacementDepart]);


    const gererTransfertStock = async (e) => {
        e.preventDefault();
        if (!product?._id) return;
        setErreur(null);
        setIsLoading(true);

        const quantiteNum = Number(quantite);
        if (quantiteNum > getStockValue(emplacementDepart)) {
            setErreur('La quantité de transfert dépasse le stock disponible.');
            setIsLoading(false);
            return;
        }

        try {
            await axios.patch(`${API_URL}/inventory/product/transfer/${product._id}`, {
                quantity: quantiteNum,
                fromLocation: emplacementDepart,
                toLocation: emplacementArrivee,
            });

            refreshData();
            onHide();
        } catch (err) {
            console.error('Échec du Transfert :', err.response?.data || err.message);
            setErreur(err.response?.data?.msg || 'Échec du transfert de stock. Vérifiez le stock disponible.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide}>
            <Form onSubmit={gererTransfertStock}>
                <Modal.Header closeButton>
                    <Modal.Title><MoveHorizontal size={20} className='me-2' /> Transférer le Stock pour : **{product?.name}**</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Alert variant="info" className="p-2">
                        <Row className="text-center fw-bold">
                            <Col>Stock Bar : {getStockValue('stockBar')}</Col>
                            <Col>Stock Général : {getStockValue('stockGeneral')}</Col>
                        </Row>
                    </Alert>

                    <Form.Group className="mb-3">
                        <Form.Label>Transférer Depuis</Form.Label>
                        <Form.Select
                            value={emplacementDepart}
                            onChange={(e) => setEmplacementDepart(e.target.value)}
                            disabled={isLoading}
                        >
                            <option value="stockGeneral">Stockage Général (stockGeneral)</option>
                            <option value="stockBar">Bar/Comptoir (stockBar)</option>
                        </Form.Select>
                        <Form.Text className="text-muted">Disponible : **{getStockValue(emplacementDepart)}**</Form.Text>
                    </Form.Group>

                    <div className='d-flex justify-content-center my-3'>
                        <ArrowRight size={30} className='text-primary' />
                    </div>

                    <Form.Group className="mb-3">
                        <Form.Label>Transférer Vers</Form.Label>
                        <Form.Control type="text" value={emplacementArrivee === 'stockGeneral' ? 'Stockage Général (stockGeneral)' : 'Bar/Comptoir (stockBar)'} disabled />
                    </Form.Group>


                    <Form.Group className="mb-3">
                        <Form.Label>Quantité à Transférer</Form.Label>
                        <InputGroup>
                            <InputGroup.Text><MoveHorizontal /></InputGroup.Text>
                            <Form.Control
                                type="number"
                                min="1"
                                step="any"
                                value={quantite}
                                onChange={(e) => setQuantite(e.target.value)}
                                required
                                autoFocus
                            />
                        </InputGroup>
                    </Form.Group>

                    {erreur && <Alert variant="danger" className="mt-3">{erreur}</Alert>}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide}>Annuler</Button>
                    <Button variant="success" type="submit" disabled={isLoading || !quantite || Number(quantite) <= 0 || Number(quantite) > getStockValue(emplacementDepart)}>
                        {isLoading ? <Spinner animation="border" size="sm" /> : `Confirmer le Transfert de ${quantite} unité(s)`}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

// ====================================================================\
// --- COMPOSANTS MODAUX (Stock d'Inventaire - Matières Premières - SIMULATIONS) ---
// ====================================================================\

const ModalAjustementStockInventaire = ({ show, onHide, item, refreshData }) => {
    return (
        <Modal show={show} onHide={onHide}>
            <Modal.Header closeButton><Modal.Title>Ajuster l'Inventaire : **{item?.name}**</Modal.Title></Modal.Header>
            <Modal.Body>
                <Alert variant="warning">
                    Ce modal est une **simulation** pour ajuster le stock de matières premières/ingrédients (`InventoryModel`).
                </Alert>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Fermer</Button>
            </Modal.Footer>
        </Modal>
    );
};

const ModalTransfertStockInventaire = ({ show, onHide, item, refreshData }) => {
    return (
        <Modal show={show} onHide={onHide}>
            <Modal.Header closeButton><Modal.Title>Transférer l'Inventaire : **{item?.name}**</Modal.Title></Modal.Header>
            <Modal.Body>
                <Alert variant="warning">
                    Ce modal est une **simulation** pour transférer le stock de matières premières/ingrédients (`InventoryModel`).
                </Alert>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Fermer</Button>
            </Modal.Footer>
        </Modal>
    );
};

// ====================================================================\
// --- COMPOSANTS DE RAPPORT ---
// ====================================================================\

const RenduSommaireRevenus = React.memo(({ totalRevenueByDay, formatCurrency }) => {
    // Assuming formatCurrency is passed as a prop or imported
    const totalRevenue = totalRevenueByDay.reduce((acc, curr) => acc + curr.totalRevenue, 0);
    const totalBills = totalRevenueByDay.reduce((acc, curr) => acc + curr.totalBills, 0);

    return (
        <Card className="shadow-lg rounded-3 h-100 report-card border-0">
            <Card.Header as="h5" className="bg-success text-white rounded-top-3 py-3">
                <LineChart className='me-2' size={20} /> **Sommaire des Revenus**
            </Card.Header>
            <Card.Body className="p-3">
                <Row className="mb-3">
                    {/* Total Revenue Card */}
                    <Col md={6} className='mb-3 mb-md-0'>
                        <div className="border border-success p-3 rounded text-center bg-light">
                            <p className="text-uppercase text-muted mb-1 small">Revenu Total Global</p>
                            <h3 className="fw-bolder text-success mb-0">{formatCurrency(totalRevenue)}</h3>
                        </div>
                    </Col>
                    {/* Total Bills Card */}
                    <Col md={6}>
                        <div className="border p-3 rounded text-center bg-light">
                            <p className="text-uppercase text-muted mb-1 small">Total des Transactions</p>
                            <h3 className="fw-bolder mb-0">{totalBills}</h3>
                        </div>
                    </Col>
                </Row>

                <h6 className='mt-3 border-bottom pb-1 text-primary'>Performance Quotidienne (30 Derniers Jours)</h6>
                <div className="table-responsive">
                    <Table striped hover size="sm" className="mb-0">
                        <thead>
                            <tr className="bg-light">
                                <th>Date</th>
                                <th className="text-end">Revenu Total</th>
                                <th className="text-end">Factures</th>
                            </tr>
                        </thead>
                        <tbody>
                            {totalRevenueByDay.slice(0, 30).map(item => (
                                <tr key={item._id}>
                                    <td>{item._id}</td>
                                    <td className="text-end fw-bold">{formatCurrency(item.totalRevenue)}</td>
                                    <td className="text-end">{item.totalBills}</td>
                                </tr>
                            ))}
                            {totalRevenueByDay.length === 0 && <tr><td colSpan="3" className="text-center text-muted">Aucune donnée de revenu récente n'est disponible.</td></tr>}
                        </tbody>
                    </Table>
                </div>
            </Card.Body>
        </Card>
    );
});

// --- 2. Produits les Plus Vendus (RenduMeilleursProduitsVendues) ---

const RenduMeilleursProduitsVendues = React.memo(({ totalSalesByProduct, formatCurrency }) => (
    <Card className="shadow-lg rounded-3 h-100 report-card border-0">
        <Card.Header as="h5" className="bg-primary text-white rounded-top-3 py-3">
            <Package className='me-2' size={20} /> **Top 10 des Produits Vendus**
        </Card.Header>
        <Card.Body className="p-3">
            <div className="table-responsive">
                <Table striped hover size="sm" className="mb-0">
                    <thead>
                        <tr className="bg-light">
                            <th>Produit</th>
                            <th className="text-end">Quantité Vendue</th>
                            <th className="text-end">Revenu Généré</th>
                        </tr>
                    </thead>
                    <tbody>
                        {totalSalesByProduct.slice(0, 10).map(item => (
                            <tr key={item._id}>
                                <td>{item.productName}</td>
                                <td className="text-end fw-bold text-primary">{item.totalQuantitySold}</td>
                                <td className="text-end">{formatCurrency(item.totalRevenue)}</td>
                            </tr>
                        ))}
                        {totalSalesByProduct.length === 0 && <tr><td colSpan="3" className="text-center text-muted">Aucune donnée de vente de produit.</td></tr>}
                    </tbody>
                </Table>
            </div>
        </Card.Body>
    </Card>
));

// --- 3. Rapport de Dette Client (RapportDetteClient) ---

const RapportDetteClient = ({ debtData, refresh, formatCurrency }) => {
    const { customers, totalOutstandingDebt, isLoading, error } = debtData;
    // Use Math.abs for totalDebt to display a positive amount, as it represents a liability (debt)
    const totalDebt = Math.abs(totalOutstandingDebt);

    return (
        <Card className="shadow-lg border-0 h-100 rounded-3">
            <Card.Header className="bg-danger text-white d-flex justify-content-between align-items-center py-3">
                <Card.Title className="mb-0 text-white">
                    <DollarSign size={20} className='me-2' /> **Rapport de Solde Client**
                </Card.Title>
                <Button variant="light" size="sm" onClick={refresh} disabled={isLoading} className="shadow-sm">
                    {isLoading ? <Spinner animation="border" size="sm" /> : <RefreshCw size={14} />}
                </Button>
            </Card.Header>
            <Card.Body className="p-3">
                {error && <Alert variant="danger">{error}</Alert>}

                <Alert variant={totalOutstandingDebt < 0 ? "warning" : "info"} className="p-3 text-center mb-4 border-0">
                    <p className="text-uppercase small mb-1">Dette Totale En Cours</p>
                    <h4 className="mb-0">
                        **{formatCurrency(totalDebt)}**
                    </h4>
                </Alert>

                <p className="text-muted small border-bottom pb-1">Nombre de clients avec dette : **{customers.length}**</p>

                <div className="table-responsive">
                    <Table striped hover responsive size="sm" className="mt-3 mb-0">
                        <thead>
                            <tr className="bg-light">
                                <th>Client</th>
                                <th>Téléphone</th>
                                <th className='text-end'>Solde Dû</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td col colspan="3" className="text-center py-3"><Spinner animation="border" size="sm" /> Chargement des données...</td></tr>
                            ) : customers.length === 0 ? (
                                <tr><td col colspan="3" className="text-center py-3 text-success">Aucun client actuellement endetté. 🎉</td></tr>
                            ) : (
                                customers.map((customer) => (
                                    <tr key={customer._id}>
                                        <td>{customer.name}</td>
                                        <td>{customer.phone || 'N/A'}</td>
                                        {/* Display the absolute value as a debt, formatted as currency */}
                                        <td className='text-end fw-bold text-danger'>
                                            {formatCurrency(Math.abs(customer.creditBalance))}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </div>
            </Card.Body>
        </Card>
    );
};

const ALL_ACTIONS = [
    'BILL_FINALIZED',
    'DRAFT_CLEANED_UP',
    'DRAFT_CREATED',
    'DRAFT_UPDATED',
    'CUSTOMER_BALANCE_ADJUSTED',
    'BOTTLE_SAVED',
    'BOTTLE_WITHDRAWN',
    'INVENTORY_ADJUSTED',
    // Add any other action types you use
];


// Utility to format timestamp
const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    // Format to '19 oct. 2025, 19:20:39' style
    return new Date(timestamp).toLocaleString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
};

const getActionBadge = (actionType) => {
    const type = (actionType ?? '').toLowerCase()
    if (type.includes('finalized') || type.includes('create') || type.includes('register') || type.includes('add')) return 'success';
    if (type.includes('delete') || type.includes('remove') || type.includes('error') || type.includes('void')) return 'danger';
    if (type.includes('update') || type.includes('adjust') || type.includes('patch') || type.includes('edit') || type.includes('draft')) return 'warning';
    if (type.includes('login') || type.includes('logout') || type.includes('auth')) return 'primary';
    if (type.includes('bottle') || type.includes('save') || type.includes('withdraw')) return 'info';
    return 'secondary';
};

// =========================================================================
// !!! AUDIT LOG READABILITY FIX IMPLEMENTED HERE !!!
// =========================================================================
const formatLogDetails = (details, action) => {
    if (!details || Object.keys(details).length === 0) {
        return 'Aucun détail supplémentaire.';
    }

    const actionLower = action.toLowerCase();

    // --- Credit/Balance Adjustment ---
    if (details.adjustmentAmount !== undefined) {
        const reason = details.reason ? `pour FC {details.reason}**` : '';
        const sign = details.adjustmentAmount > 0 ? 'créditée' : 'débitée';
        const amount = formatCurrency(Math.abs(details.adjustmentAmount));

        return `Compte client FC {details.customerName || details.customerId?.slice(-6).toUpperCase()}** : solde FC {sign}** de ${amount} ${reason}. (Solde actuel: ${details.newBalance})`;
    }

    // --- Draft/Bill Creation/Update (with Items) ---
    if (details.items && Array.isArray(details.items)) {
        const count = details.items.length;
        const actionType = actionLower.includes('finalized') ? 'Facture Finalisée' : actionLower.includes('draft_created') ? 'Brouillon Créé' : 'Facture/Brouillon Modifié';
        const total = details.total ? ` (Total: ${formatCurrency(details.total)})` : '';
        const billId = details.billId ? details.billId.slice(-6).toUpperCase() : 'N/A';

        // Check if any item has a friendly name
        const hasNames = details.items.some(i => i.name && i.name.length > 0);

        if (hasNames) {
            // Use names for a clean display (User-friendly)
            const summaryItems = details.items.map(i => {
                // Prioritize name, but if only name is available, use "article" to simplify
                const itemName = i.name || 'article';
                return `${i.quantity}x FC {itemName}**`;
            }).join(', ');

            return `${actionType} (**Facture: ${billId}**)${total}. Articles: ${summaryItems}`;
        } else {
            // Simplified message when product names are missing (avoids showing raw product IDs)
            return `${actionType} (**Facture: ${billId}**)${total}. FC {count}** article(s) concerné(s) (Noms non disponibles).`;
        }
    }

    // --- Draft Cleanup ---
    if (details.finalBillId && details.draftIds) {
        const draftCount = details.draftIds.length;
        return `Nettoyage de FC {draftCount}** brouillon(s). Finalisé dans la facture: FC {details.finalBillId.slice(-6).toUpperCase()}**`;
    }

    // --- Inventory/Stock Adjustment (Product/Raw Material) ---
    if (actionLower.includes('inventory_adjusted') || actionLower.includes('product_adjusted')) {
        const location = details.stockField || 'stock';
        const reason = details.reason ? ` - Raison: FC {details.reason}**` : '';
        const item = details.productName || details.itemName || details.itemId?.slice(-6).toUpperCase() || 'Article Inconnu';

        return `Stock de FC {item}** ajusté de ${details.adjustmentAmount} unités dans l'emplacement FC {location}**. ${reason}`;
    }

    // --- Bottle Save/Withdrawal ---
    if (actionLower.includes('bottle_saved') || actionLower.includes('bottle_withdrawn')) {
        const customerName = details.customerName ? `Client FC {details.customerName}**` : `Client ID: ${details.customerId?.slice(-6).toUpperCase()}`;
        const actionText = actionLower.includes('saved') ? 'Bouteille(s) Sauvegardée(s)' : 'Bouteille(s) Retirée(s)';
        return `${actionText} (${details.quantity}x FC {details.productName || details.productId?.slice(-6).toUpperCase()}**) pour ${customerName}.`;
    }

    // --- General ID References ---
    if (details.billId) {
        return `Référence Facture: FC {details.billId.slice(-6).toUpperCase()}**`;
    }

    // --- Fallback for unrecognized JSON structures ---
    return 'Détails non formatés: ' + JSON.stringify(details);
};

// =========================================================================
// AuditLogs Component (Updated for better detail, pagination, and latest logs first)
// =========================================================================
const AuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const LOGS_PER_PAGE = 20;

    const fetchAuditLogs = useCallback(async (page, search, action) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_URL}/auditlogs`, {
                params: {
                    page,
                    limit: LOGS_PER_PAGE,
                    search,
                    action: action || undefined,
                }
            });

            // Parse the JSON string details and ensure logs are sorted descending by createdAt on the backend
            const parsedLogs = response.data.logs.map(log => ({
                ...log,
                // Robust parsing: handles null or non-string details
                details: typeof log.details === 'string' && log.details ? JSON.parse(log.details) : log.details || {},
                actionType: log.action || 'INCONNU'
            }));

            setLogs(parsedLogs);
            setTotalPages(response.data.totalPages);
            setCurrentPage(response.data.currentPage);
        } catch (err) {
            console.error('Error fetching audit logs:', err);
            setError('Échec du chargement des journaux d\'audit. Vérifiez l\'implémentation du backend.');
            setLogs([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Reset to page 1 when filters change, then fetch
        const handler = setTimeout(() => {
            setCurrentPage(1); // Important: reset to 1 when filters change
            fetchAuditLogs(1, searchTerm, actionFilter);
        }, 300);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm, actionFilter, fetchAuditLogs]);


    const handlePageChange = (page) => {
        if (page > 0 && page <= totalPages) {
            setCurrentPage(page);
            fetchAuditLogs(page, searchTerm, actionFilter);
        }
    };


    return (
        <Container fluid className="mt-4">
            <Row className="mb-4">
                <Col>
                    <h2><History className="me-2" /> Journaux d'Audit (Audit Logs)</h2>
                    <p className="text-muted">Vue des activités système pour le suivi des opérations critiques.</p>
                </Col>
            </Row>

            <Card className="shadow">
                <Card.Body>
                    <Row className="mb-3">
                        {/* Search Input */}
                        <Col md={8}>
                            <InputGroup>
                                <InputGroup.Text><Search size={20} /></InputGroup.Text>
                                <Form.Control
                                    placeholder="Rechercher par utilisateur, ID ou action..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </InputGroup>
                        </Col>
                        {/* Action Filter Dropdown */}
                        <Col md={4}>
                            <InputGroup>
                                <InputGroup.Text><Filter size={20} /></InputGroup.Text>
                                <Form.Select
                                    value={actionFilter}
                                    onChange={(e) => setActionFilter(e.target.value)}
                                    className="form-control"
                                >
                                    <option value="">-- Toutes les Actions --</option>
                                    {ALL_ACTIONS.map(action => (
                                        <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>
                                    ))}
                                </Form.Select>
                            </InputGroup>
                        </Col>
                    </Row>
                    {isLoading && <div className="text-center"><Spinner animation="border" /></div>}
                    {error && <Alert variant="danger">{error}</Alert>}
                    {!isLoading && !error && (
                        <>
                            <Table striped bordered hover responsive className="mt-3">
                                <thead>
                                    <tr className='table-dark'>
                                        <th><Calendar size={16} className='me-1' /> Date/Heure</th>
                                        <th><User size={16} className='me-1' /> Utilisateur</th>
                                        <th><Zap size={16} className='me-1' /> Action</th>
                                        <th>Détails</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <tr key={log._id}>
                                            <td>{formatTimestamp(log.createdAt)}</td>
                                            <td>**{log.userRole}** - {log.userName || log.userId?.slice(-6).toUpperCase()}</td>
                                            <td>
                                                <Badge bg={getActionBadge(log.actionType)}>
                                                    {log.actionType.replace(/_/g, ' ')}
                                                </Badge>
                                            </td>
                                            <td>
                                                <small style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                                                    {formatLogDetails(log.details, log.actionType)}
                                                </small>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                            {/* Pagination */}
                            <div className="d-flex justify-content-between align-items-center mt-3">
                                <small className="text-muted">
                                    Page {currentPage} de {totalPages}
                                </small>
                                <Pagination size="sm" className="mb-0">
                                    <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
                                    {/* Simplified pagination display */}
                                    {currentPage > 2 && <Pagination.Ellipsis />}
                                    {currentPage > 1 && <Pagination.Item onClick={() => handlePageChange(currentPage - 1)}>{currentPage - 1}</Pagination.Item>}
                                    <Pagination.Item active>{currentPage}</Pagination.Item>
                                    {currentPage < totalPages && <Pagination.Item onClick={() => handlePageChange(currentPage + 1)}>{currentPage + 1}</Pagination.Item>}
                                    {currentPage < totalPages - 1 && <Pagination.Ellipsis />}
                                    <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
                                </Pagination>
                            </div>
                        </>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
};


// =========================================================================
// DailySummary Component
// =========================================================================
const DailySummary = () => {
    // 1. Déclaration des States
    const [selectedDate, setSelectedDate] = useState(formatDateForApi(new Date()));
    const [summary, setSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // 2. Fonction de Fetching
    const fetchDailySummary = useCallback(async (date) => {
        setIsLoading(true);
        setError(null);
        setSummary(null);
        // Assumed new backend endpoint
        const endpoint = `${API_URL}/inventory/reports/daily-summary?date=${date}`;
        try {
            const response = await axios.get(endpoint);
            setSummary(response.data);
            console.log("Daily Summary Data:", response.data);
        } catch (err) {
            console.error("Erreur lors de la récupération du résumé quotidien:", err.response?.data || err.message);
            setError("Échec du chargement du résumé quotidien. Assurez-vous que le backend implémente la route `/inventory/reports/daily-summary`.");
        } finally {
            setIsLoading(false);
        }
    }, [API_URL]);

    // 3. Effect Hook pour le Fetching
    useEffect(() => {
        if (selectedDate) {
            fetchDailySummary(selectedDate);
        }
    }, [selectedDate, fetchDailySummary]);

    // 4. Fonctions de Rendu des Métriques
    const renderMetricCard = (title, value, icon, variant = 'primary') => (
        <Col md={3} sm={6} xs={12} className="mb-4">
            <Card className={`shadow-sm border-start border-5 border-${variant}`}>
                <Card.Body>
                    <div className="d-flex align-items-center">
                        <div className="me-3">
                            {React.cloneElement(icon, { size: 28, className: `text-${variant}` })}
                        </div>
                        <div>
                            <p className="text-uppercase text-muted mb-1 small">{title}</p>
                            <h4 className="fw-bold mb-0 text-dark">
                                {typeof value === 'number' ? formatCurrency(value) : value}
                            </h4>
                        </div>
                    </div>
                </Card.Body>
            </Card>
        </Col>
    );

    const renderListDetails = (title, list, keyField, displayField, format = v => v) => (
        <Col md={6} className="mb-4">
            <Card className="shadow-sm h-100">
                <Card.Header className="bg-light fw-bold">{title} ({list?.length || 0})</Card.Header>
                <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <Table hover size="sm" className='mb-0'>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>{title.includes('Client') ? 'Client' : 'Produit'}</th>
                                <th className='text-end'>Valeur</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list?.length > 0 ? (
                                list.map((item, index) => (
                                    <tr key={item[keyField] || index}>
                                        <td>{index + 1}</td>
                                        <td>{item[displayField]}</td>
                                        <td className='text-end fw-bold'>
                                            {format(item.value)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="3" className='text-center text-muted'>Aucune donnée trouvée.</td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </div>
            </Card>
        </Col>
    );

    // 5. Rendu Principal
    return (
        <Container fluid className="mt-4">
            <h2 className="mb-4"><Calendar className="me-2" /> Résumé Quotidien de l'Activité</h2>
            <Card className="shadow">
                <Card.Header as="h5" className="bg-primary text-white">
                    Sélectionner la Date:
                </Card.Header>
                <Card.Body>
                    <Form.Group as={Row} className="mb-4" controlId="dailyDate">
                        <Form.Label column sm="2">Date:</Form.Label>
                        <Col sm="4">
                            <Form.Control
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                max={formatDateForApi(new Date())}
                            />
                        </Col>
                        <Col sm="6" className="d-flex align-items-center">
                            <Button onClick={() => fetchDailySummary(selectedDate)} disabled={isLoading}>
                                <RefreshCw size={16} className="me-2" /> Actualiser
                            </Button>
                        </Col>
                    </Form.Group>

                    {isLoading && <div className="text-center py-5"><Spinner animation="border" /> Chargement...</div>}
                    {error && <Alert variant="danger">{error}</Alert>}
                    {!isLoading && !error && summary && (
                        <>
                            <h5 className="border-bottom pb-2 mb-4 text-success"><FaChartArea className="me-2" size={18} /> Statistiques Financières Clés</h5>
                            <Row>
                                {renderMetricCard('Revenu Total', summary.totalRevenue || 0, <DollarSign />, 'success')}
                                {renderMetricCard('Montant Payé', summary.totalAmountPaid || 0, <Wallet />, 'primary')}
                                {renderMetricCard('Bénéfice Net Estimé', summary.totalProfit || 0, <TrendingUp />, 'info')}
                                {renderMetricCard('Nouveaux Crédits/Dettes', summary.totalNewCredit || 0, <HandHelping />, 'danger')}
                            </Row>

                            <h5 className="border-bottom pb-2 mb-4 text-primary"><FaChartBar className="me-2" size={18} /> Détails des Opérations</h5>
                            <Row>
                                {renderListDetails(
                                    "Clients ayant pris du crédit",
                                    summary.customersWithCredit || [],
                                    'customerId',
                                    'customerName',
                                    (v) => formatCurrency(Math.abs(v))
                                )}
                                {renderListDetails(
                                    "Bouteilles / Articles Sauvegardés",
                                    summary.bottlesSaved || [],
                                    'productId',
                                    'productName',
                                    (v) => `${v} unités`
                                )}
                            </Row>

                            <h5 className="border-bottom pb-2 mb-4 text-info"><Package className="me-2" size={18} /> Stock et Inventaire</h5>
                            <Row>
                                <Col md={6} className="mb-4">
                                    <Card className="shadow-sm h-100">
                                        <Card.Header className="bg-light fw-bold"><Package className="me-1" size={16} /> Mouvement de Stock (Bar)</Card.Header>
                                        <Card.Body>
                                            <Row className='text-center'>
                                                <Col>
                                                    <p className='small text-muted mb-1'>Stock Bar (Début)</p>
                                                    <h4 className='fw-bold text-dark'>{summary.stockBarStart || 0}</h4>
                                                </Col>
                                                <Col>
                                                    <p className='small text-muted mb-1'>Stock Bar (Fin)</p>
                                                    <h4 className='fw-bold text-dark'>{summary.stockBarEnd || 0}</h4>
                                                </Col>
                                                <Col>
                                                    <p className='small text-muted mb-1'>Mouvement Net</p>
                                                    <h4 className='fw-bold text-dark'>{(summary.stockBarEnd - summary.stockBarStart) || 0}</h4>
                                                </Col>
                                            </Row>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                {renderListDetails(
                                    "Liste des produits en faible stock (Seuil: < 10)",
                                    summary.lowStockProducts || [],
                                    'productId',
                                    'productName',
                                    (v) => `${v} unités`
                                )}
                            </Row>
                        </>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
};


// =========================================================================
// RenduRapportVentesProduit Component (Sales Report by Staff)
// =========================================================================
const RenduRapportVentesProduit = ({ totalSalesByProduct, allUsers, API_URL, formatCurrency }) => {
    // 1. Déclaration des States
    const [selectedStaff, setSelectedStaff] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filteredSales, setFilteredSales] = useState(totalSalesByProduct || []);
    const [isLoading, setIsLoading] = useState(false);
    const [salesError, setSalesError] = useState(null);

    // 2. Initialisation des Dates (Current Month)
    useEffect(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(formatDateForApi(firstDay));
        setEndDate(formatDateForApi(today));
    }, []);

    // 3. Update filteredSales when totalSalesByProduct updates (Initial load)
    useEffect(() => {
        // Only update on initial mount or when the parent's default data changes and no filters are set
        if (!selectedStaff && !startDate && !endDate && totalSalesByProduct.length > 0) {
            setFilteredSales(totalSalesByProduct);
        }
    }, [totalSalesByProduct, selectedStaff, startDate, endDate]);


    // 4. Fonction de Fetching/Filtrage
    const fetchStaffSalesLocal = useCallback(async (staffId, start, end) => {
        setIsLoading(true);

        // Case 1: No staff or date filter selected, use global data passed by prop
        if (!staffId && !start && !end) {
            // NOTE: This assumes totalSalesByProduct is the unfiltered report.
            // If the prop is already filtered by date in the parent, this is fine.
            const salesToFilter = totalSalesByProduct;
            setFilteredSales(salesToFilter);
            setIsLoading(false);
            return;
        }

        // Case 2: Only date filter set, re-fetch global report (if needed) or filter locally (less ideal)
        if (!staffId && start && end) {
            // NOTE: A robust solution requires refetching the main report with date filters.
            setFilteredSales(totalSalesByProduct);
            return;
        }

        try {
            // Assuming this API returns rich product sales data (name, category, price, quantity, revenue)
            const response = await axios.get(`${API_URL}/inventory/reports/product-sales-by-staff`, {
                params: {
                    waiterId: staffId,
                    startDate: start,
                    endDate: end
                }
            });
            // Assumer que la nouvelle route retourne le format attendu
            setFilteredSales(response.data.staffProductSales || []);
            setSalesError(null);
        } catch (err) {
            console.error('Erreur de Récupération des Ventes par Personnel et Date :', err);
            setSalesError('Échec de la récupération des données de vente filtrées. Assurez-vous que la route backend /reports/product-sales-by-staff retourne les champs Catégorie et Prix.');
            setFilteredSales([]);
        } finally {
            setIsLoading(false);
        }
    }, [API_URL, totalSalesByProduct]);

    // 5. Effect Hook for Filtering
    useEffect(() => {
        // Trigger fetch whenever filters change
        fetchStaffSalesLocal(selectedStaff, startDate, endDate);
    }, [selectedStaff, startDate, endDate, fetchStaffSalesLocal]);

    // 6. Helper for Staff Name Display
    const staffName = selectedStaff ? allUsers.find(u => u._id === selectedStaff)?.name || 'Personnel Filtré' : 'Tout le Personnel Combiné';

    const totalRevenue = filteredSales.reduce((acc, item) => acc + (item.totalRevenue || 0), 0);

    const reportTitle = (
        <h6 className='mb-3 text-info border-bottom pb-2'>
            <Package size={16} className='me-2' /> **{staffName}** Performance des Produits
            {startDate && endDate && (
                <small className="ms-3 text-muted">
                    (Du **{new Date(startDate).toLocaleDateString()}** au **{new Date(endDate).toLocaleDateString()}**)
                </small>
            )}
        </h6>
    );

    // 7. Render Method
    return (
        <Card className="shadow-lg mt-4 modern-card">
            <Card.Header as="h5" className="bg-light fw-bold text-dark d-flex align-items-center justify-content-between">
                <div><LineChart className='me-2 text-dark' size={20} /> Analyse des Ventes de Produits</div>
                <Button variant="outline-dark" size="sm" onClick={() => fetchStaffSalesLocal(selectedStaff, startDate, endDate)} disabled={isLoading}>
                    <RefreshCw size={14} className='me-1' /> {isLoading ? 'Chargement...' : 'Actualiser'}
                </Button>
            </Card.Header>
            <Card.Body>
                <Form className="mb-4">
                    <Row className="g-3">
                        <Col md={5}>
                            <Form.Group controlId="staffFilter">
                                <Form.Label>Filtrer par Personnel</Form.Label>
                                <Form.Select
                                    value={selectedStaff}
                                    onChange={(e) => setSelectedStaff(e.target.value)}
                                >
                                    <option value="">-- Tout le Personnel --</option>
                                    {allUsers.map(user => (
                                        <option key={user._id} value={user._id}>{user.name}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group controlId="startDateFilter">
                                <Form.Label>Date Début</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group controlId="endDateFilter">
                                <Form.Label>Date Fin</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={1} className='d-flex align-items-end'>
                            <Button variant="outline-danger" onClick={() => { setSelectedStaff(''); setStartDate(''); setEndDate(''); }} title="Effacer Filtres">
                                <Filter size={16} />
                            </Button>
                        </Col>
                    </Row>
                </Form>

                {salesError && <Alert variant="danger">{salesError}</Alert>}

                <div className="table-responsive">
                    {reportTitle}

                    {filteredSales.length === 0 && !isLoading ? (
                        <Alert variant="info" className="text-center">Aucune donnée de vente trouvée pour cette sélection.</Alert>
                    ) : (
                        <>
                            <h4 className='text-end text-success mb-3'>Revenu Total: {formatCurrency(totalRevenue)}</h4>
                            <Table striped bordered hover responsive size="sm" className="caption-top">
                                <caption>Détails des Ventes par Produit (Total: {filteredSales.length} produits)</caption>
                                <thead className='table-secondary'>
                                    <tr>
                                        <th>Nom du Produit</th>
                                        <th>Catégorie</th> {/* Display Category */}
                                        <th className='text-end'>Prix Unitaire Actuel</th> {/* Display Price */}
                                        <th className='text-end'>Qté Totale Vendue</th>
                                        <th className='text-end'>Revenu Total Généré</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSales.map((item, index) => (
                                        <tr key={item._id || index}>
                                            <td className='fw-semibold'>{item.productName || item.name || 'Produit Inconnu'}</td>
                                            <td>{item.category || <Badge bg="secondary">N/A</Badge>}</td>
                                            <td className='text-end'>{formatCurrency(item.price || item.unitPrice || 0)}</td>
                                            <td className='text-end fw-bold'>{item.totalQuantitySold || item.totalQuantity || 0}</td>
                                            <td className='text-end fw-bold text-success'>{formatCurrency(item.totalRevenue || 0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan="4" className='text-end fw-bold table-light'>Grand Total du Revenu :</td>
                                        <td className='text-end fw-bold text-success table-light'>
                                            {formatCurrency(totalRevenue)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </Table>
                        </>
                    )}
                </div>
            </Card.Body>
        </Card>
    );
};

// ====================================================================\
// --- COMPOSANT PRINCIPAL ---
// ====================================================================\
const Inventory = () => {
    // =======================================================
    // 1. DÉCLARATION DE TOUS LES HOOKS (S.U.I.T.E)
    // =======================================================
    // 🎯 FIX: Déclaration de la clé active pour les onglets (pour résoudre le ReferenceError)
    const [activeKey, setActiveKey] = useState('stock'); // Utilisation de 'stock' comme onglet par défaut

    const { isManagerOrAdmin } = useAuth();
    const componentRef = useRef(); // For printing Gain Potentiel report

    // États Principaux
    const [products, setProducts] = useState([]);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [allUsers, setAllUsers] = useState([]); // List of users (staff) for filtering reports

    // États de Chargement et Erreur
    const [isLoading, setIsLoading] = useState(false);
    const [erreur, setErreur] = useState(null);

    // États des Rapports (Contient tous les données des rapports par défaut)
    const [reportsData, setReportsData] = useState(null);

    // États des Filtres
    const [filtreProduit, setFiltreProduit] = useState('');
    const [filtreDateDebut, setFiltreDateDebut] = useState('');
    const [filtreDateFin, setFiltreDateFin] = useState('');
    const [filtreTransaction, setFiltreTransaction] = useState({
        dateDebut: '',
        dateFin: '',
        methodePaiement: '',
        statut: '',
    });

    // États des Modals
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const [showAdjustInventoryModal, setShowAdjustInventoryModal] = useState(false);
    const [showTransferInventoryModal, setShowTransferInventoryModal] = useState(false);
    const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);

    // État spécifique pour la dette client
    const [customerDebt, setCustomerDebt] = useState({
        customers: [],
        totalOutstandingDebt: 0,
        isLoading: false,
        error: null,
    });


    // =======================================================
    // 2. FONCTIONS DE FETCHING
    // =======================================================

    const fetchAllUsers = useCallback(async () => {
        try {
            // Assume the backend provides a simple list of users (staff)
            const response = await axios.get(`${API_URL}/users/staff-list`);
            setAllUsers(response.data);
        } catch (err) {
            console.error('Échec de la récupération de la liste du personnel :', err);
            // Set error state if necessary
        }
    }, [API_URL]);

    const fetchCustomerDebt = useCallback(async () => {
        setCustomerDebt(prev => ({ ...prev, isLoading: true, error: null }));
        try {
            const response = await axios.get(`${API_URL}/customers/debt-report`);
            setCustomerDebt({
                customers: response.data.customers || [],
                totalOutstandingDebt: response.data.totalOutstandingDebt || 0,
                isLoading: false,
                error: null,
            });
        } catch (err) {
            console.error('Échec de la récupération de la dette client :', err);
            setCustomerDebt(prev => ({ ...prev, isLoading: false, error: 'Échec du chargement des données de dette client.' }));
        }
    }, []);

    const refreshData = useCallback(async () => {
        setIsLoading(true);
        setErreur(null);
        try {
            // 1. Récupérer les données de rapport (tous les rapports agrégés)
            const reportsResponse = await axios.get(`${API_URL}/inventory/reports`);
            setReportsData(reportsResponse.data);

            // 2. Récupérer les transactions (historique des factures)
            const transactionsResponse = await axios.get(`${API_URL}/inventory/transactions`);
            setTransactions(transactionsResponse.data.transactions);

            // 3. Récupérer les données spécifiques
            await Promise.all([
                fetchAllUsers(),
                fetchCustomerDebt(),
            ]);

        } catch (err) {
            console.error('Erreur de Récupération des Données :', err.response?.data || err.message);
            setErreur('Échec de la récupération des données d\'inventaire et de ventes.');
        } finally {
            setIsLoading(false);
        }
    }, [fetchAllUsers, fetchCustomerDebt]);

    // Effet useEffect
    useEffect(() => {
        refreshData();
    }, [refreshData]);


    // =======================================================
    // 3. MEMOS / LOGIQUE DE FILTRAGE
    // =======================================================

    // Mémos (Utilisation de reportsData directement dans la logique pour éviter la déstructuration intermédiaire)

    // Logique de filtrage pour le tableau de Gain Potentiel (Produit)
    const stockFiltre = useMemo(() => {
        // Accéder aux données directement depuis reportsData pour éviter la déstructuration entre les hooks
        const remainingProductStock = reportsData?.remainingProductStock || [];
        let list = remainingProductStock;
        if (filtreProduit) {
            list = list.filter(product => product.name.toLowerCase().includes(filtreProduit.toLowerCase())
            );
        }
        return list;
    }, [reportsData, filtreProduit]); // Nouvelle dépendance: reportsData

    // Simulation de données pour le Bénéfice Réalisé par Jour (A remplacer par une vraie route si possible)
    const totalProfitByDay = useMemo(() => {
        // Accéder aux données directement depuis reportsData
        const totalRevenueByDay = reportsData?.totalRevenueByDay || [];
        // Simulation : profit = 20% du revenu brut, pour des fins de démonstration
        return totalRevenueByDay.map(day => ({
            ...day,
            totalProfit: day.totalRevenue * 0.2, // REMPLACER PAR LE VRAI CALCUL DE BÉNÉFICE
        }));
    }, [reportsData]);

    // Logique de filtrage des transactions
    const transactionsFiltrees = useMemo(() => {
        let list = transactions;

        if (filtreTransaction.dateDebut) {
            const start = new Date(filtreTransaction.dateDebut);
            list = list.filter(t => new Date(t.createdAt) >= start);
        }
        if (filtreTransaction.dateFin) {
            const end = new Date(filtreTransaction.dateFin);
            // Ajout d'une journée pour inclure la date de fin
            end.setDate(end.getDate() + 1);
            list = list.filter(t => new Date(t.createdAt) < end);
        }
        if (filtreTransaction.methodePaiement) {
            list = list.filter(t => t.paymentMethod === filtreTransaction.methodePaiement);
        }
        if (filtreTransaction.statut) {
            list = list.filter(t => t.paymentStatus === filtreTransaction.statut);
        }

        return list;
    }, [transactions, filtreTransaction]);


    // Destructuration des données de rapport pour plus de clarté dans le JSX
    const {
        totalRevenueByDay = [],
        totalSalesByProduct = [],
        remainingProductStock = [],
        remainingInventoryStock = [], // Non utilisé ici, mais gardé pour clarté
        totalPotentialGain
    } = reportsData || {};


    // =======================================================
    // 4. GESTIONNAIRES DE MODAL
    // =======================================================

    // Gestionnaires pour les Modals Produits
    const handleAdjustProductClick = (product) => {
        setSelectedProduct(product);
        setShowAdjustModal(true);
    };

    const handleTransferProductClick = (product) => {
        setSelectedProduct(product);
        setShowTransferModal(true);
    };

    // Gestionnaires pour les Modals Inventaire (Matières Premières)
    const handleAdjustInventoryClick = (item) => {
        setSelectedInventoryItem(item);
        setShowAdjustInventoryModal(true);
    };

    const handleTransferInventoryClick = (item) => {
        setSelectedInventoryItem(item);
        setShowTransferInventoryModal(true);
    };

    // =======================================================
    // 5. FONCTIONS D'AIDE AU RENDU DE TABLEAUX
    // =======================================================

    // Fonction d'aide pour rendre une ligne de produit
    const renderProductRow = (product) => (
        <tr key={product._id} className={product.stockBar < 10 ? 'table-warning' : ''}>
            <td>**{product.name}**</td>
            <td>{product.category}</td>
            <td className={product.stockBar < 10 ? 'text-danger fw-bold' : ''}>
                <Badge bg={product.stockBar < 10 ? 'danger' : 'success'}>{product.stockBar || 0}</Badge>
            </td>
            <td>{product.stockGeneral || 0}</td>
            <td>
                <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleAdjustProductClick(product)} title="Ajuster le Stock"><Pencil size={14} /></Button>
                <Button variant="outline-secondary" size="sm" onClick={() => handleTransferProductClick(product)} title="Transférer le Stock"><MoveHorizontal size={14} /></Button>
            </td>
        </tr>
    );

    // Fonction d'aide pour rendre une ligne d'article d'inventaire (matières premières)
    const renderInventoryRow = (item) => (
        <tr key={item._id} className={(item.generalStock + item.storeStock) < item.minThreshold ? 'table-warning' : ''}>
            <td>**{item.name}**</td>
            <td>{item.unit}</td>
            <td>{item.storeStock || 0}</td>
            <td>{item.generalStock || 0}</td>
            <td><Badge bg='info'>{(item.storeStock || 0) + (item.generalStock || 0)}</Badge></td>
            <td>
                <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleAdjustInventoryClick(item)} title="Ajuster le Stock (Matière Première)"><Pencil size={14} /></Button>
                <Button variant="outline-secondary" size="sm" onClick={() => handleTransferInventoryClick(item)} title="Transférer le Stock (Matière Première)"><MoveHorizontal size={14} /></Button>
            </td>
        </tr>
    );

    // Fonction d'aide pour rendre le badge de statut de paiement
    const getPaymentBadge = (status, amountPaid, total) => {
        if (status === 'PAID') return <Badge bg="success">Payée</Badge>;
        if (status === 'PENDING') {
            if (amountPaid > 0 && amountPaid < total) return <Badge bg="warning">Partiel</Badge>;
            return <Badge bg="danger">Impayée</Badge>;
        }
        return <Badge bg="secondary">{status || 'N/A'}</Badge>;
    };


    // =======================================================
    // 6. FONCTION D'IMPRESSION (Gain Potentiel)
    // =======================================================

    // Préparation pour l'impression (utilise la simulation useReactToPrint)
    const handlePrintReport = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `Rapport de Bénéfice Potentiel - ${new Date().toLocaleDateString()}`,
    });


    // ====================================================================
    // NOUVELLE RENDER FUNCTION: Intègre le composant de rapport détaillé
    // ====================================================================
    const renderDetailedInventoryTab = () => {
        return (
            <Tab
                eventKey="detailed_report"
                title={
                    <>
                        {/* Utilisation de l'icône Package pour l'Inventaire */}
                        <ClipboardList size={18} className="me-2" />
                        Rapport Détaillé/Bénéfice
                    </>
                }
            >
                <DetailedInventoryReport />
            </Tab>
        );
    };

    // =======================================================
    // 7. RENDU PRINCIPAL DU COMPOSANT
    // =======================================================

    return (
        <Container fluid className="py-4">
            <h2 className="mb-4">Gestion d'Inventaire et Rapports</h2>

            {erreur && (
                <Alert variant="danger" className="mb-4">
                    <AlertTriangle size={20} className="me-2" /> {erreur}
                </Alert>
            )}

            <Tabs
                id="inventory-tabs"
                activeKey={activeKey}
                onSelect={(k) => setActiveKey(k)}
                className="mb-3"
            >
                {/* ONGLET 1: Rapports Complets (Financiers et Ventes) */}
                <Tab eventKey="report" title={<span><FaChartArea size={18} className='me-2' /> Rapports Ventes</span>}>
                    <h4 className="mt-3 mb-4">Aperçu Général des Rapports</h4>
                    {isLoading ? (
                        <div className="text-center py-5"><Spinner animation="border" /> Chargement des rapports...</div>
                    ) : (
                        <Row className="g-4">
                            <Col lg={6}>
                                <RenduSommaireRevenus totalRevenueByDay={totalRevenueByDay || []} formatCurrency={formatCurrency} />
                            </Col>
                            <Col lg={6}>
                                <RenduMeilleursProduitsVendues totalSalesByProduct={totalSalesByProduct || []} formatCurrency={formatCurrency} />
                            </Col>
                            <Col lg={12}>
                                <RapportDetteClient debtData={customerDebt} refresh={fetchCustomerDebt} formatCurrency={formatCurrency} />
                            </Col>
                            <Col lg={12}>
                                {/* Rapport Détaillé des Ventes de Produits (Filtré par Personnel) */}
                                <Accordion defaultActiveKey="0">
                                    <Accordion.Item eventKey="0">
                                        <Accordion.Header><LineChart className="me-2 text-success" size={20} /> Rapport de Performance du Personnel et des Produits</Accordion.Header>
                                        <Accordion.Body>
                                            <RenduRapportVentesProduit
                                                totalSalesByProduct={totalSalesByProduct || []}
                                                allUsers={allUsers}
                                                API_URL={API_URL}
                                                formatCurrency={formatCurrency}
                                            />
                                        </Accordion.Body>
                                    </Accordion.Item>
                                </Accordion>
                            </Col>
                        </Row>
                    )}
                </Tab>

                {/* NOUVEL ONGLET: Rapport Détaillé/Bénéfice (Utilise le nouveau composant) */}
                {renderDetailedInventoryTab()}

                {/* ONGLET 2: Gain Potentiel (Stock - Ventes) */}
                <Tab eventKey="potentialGain" title={<span><DollarSign size={18} className='me-2' /> Rapport de Bénéfice Potentiel</span>}>
                    <div className='d-flex justify-content-end align-items-center mb-3'>
                        <Button variant="outline-primary" onClick={handlePrintReport}>
                            <Printer size={16} className='me-2' />
                        </Button>
                    </div>
                    <div ref={componentRef}>
                        {/* SECTION DE FILTRES */}
                        <Row className="mb-4">
                            <Col md={12}>
                                <Card className="shadow-sm">
                                    <Card.Header as="h5" className="bg-info text-white"><Filter size={18} className='me-2' /> Filtres</Card.Header>
                                    <Card.Body>
                                        <Form>
                                            <Row className="g-3 align-items-end">
                                                <Col md={4}>
                                                    <Form.Group>
                                                        <Form.Label>Filtrer par Produit (Gain Potentiel)</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            placeholder="Nom du produit..."
                                                            value={filtreProduit}
                                                            onChange={(e) => setFiltreProduit(e.target.value)}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={3}>
                                                    <Form.Group>
                                                        <Form.Label>Date de Début (Bénéfice Réalisé)</Form.Label>
                                                        <Form.Control
                                                            type="date"
                                                            value={filtreDateDebut}
                                                            onChange={(e) => setFiltreDateDebut(e.target.value)}
                                                        />
                                                        <Form.Text muted>Filtre le Bénéfice Réalisé par Jour.</Form.Text>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={3}>
                                                    <Form.Group>
                                                        <Form.Label>Date de Fin (Bénéfice Réalisé)</Form.Label>
                                                        <Form.Control
                                                            type="date"
                                                            value={filtreDateFin}
                                                            onChange={(e) => setFiltreDateFin(e.target.value)}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={2}>
                                                    <Button variant="outline-danger" onClick={() => { setFiltreProduit(''); setFiltreDateDebut(''); setFiltreDateFin(''); }}>
                                                        <Filter size={16} className='me-1' /> Effacer
                                                    </Button>
                                                </Col>
                                            </Row>
                                        </Form>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>

                        {isLoading ? (
                            <div className="text-center py-5"><Spinner animation="border" /> Chargement...</div>
                        ) : (
                            <Row className='g-4 mt-1'>
                                {/* Section 1: Bénéfice Réalisé par Jour (Graphique ou Tableau) */}
                                <Col lg={12}>
                                    <Card className="shadow-sm">
                                        <Card.Header as="h5" className="bg-success text-white">
                                            <LineChart size={18} className='me-2' /> Bénéfice Réalisé par Jour
                                        </Card.Header>
                                        <Card.Body>
                                            <Alert variant='warning'>
                                                **NOTE:** Le Bénéfice Réalisé est actuellement une **simulation** (20% du Revenu Brut) car le calcul exact nécessite les Prix d'Achat par jour sur les factures.
                                            </Alert>
                                            <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                                <Table striped bordered hover size='sm'>
                                                    <thead>
                                                        <tr className='table-success'>
                                                            <th>Date</th>
                                                            <th className='text-end'>Revenu (Simulé)</th>
                                                            <th className='text-end'>Bénéfice (Simulé)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {totalProfitByDay.filter(day => {
                                                            const date = new Date(day._id);
                                                            const debut = filtreDateDebut ? new Date(filtreDateDebut) : null;
                                                            const fin = filtreDateFin ? new Date(filtreDateFin) : null;
                                                            return (!debut || date >= debut) && (!fin || date <= fin);
                                                        }).map(day => (
                                                            <tr key={day._id}>
                                                                <td>{day._id}</td>
                                                                <td className='text-end'>{formatCurrency(day.totalRevenue)}</td>
                                                                <td className='text-end fw-bold text-success'>{formatCurrency(day.totalProfit)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </Table>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>

                                {/* Section 2: Gain Potentiel (Stock Actuel * Bénéfice/Unité) */}
                                <Col lg={12}>
                                    <Card className="shadow-sm">
                                        <Card.Header as="h5" className="bg-primary text-white">
                                            <DollarSign size={18} className='me-2' /> Gain Potentiel Total du Stock: **{formatCurrency(totalPotentialGain || 0)}**
                                        </Card.Header>
                                        <Card.Body>
                                            {stockFiltre.length > 0 ? (
                                                <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                                    <Table striped bordered hover size='sm' className='mb-0'>
                                                        <thead className='table-secondary'>
                                                            <tr>
                                                                <th>Produit</th>
                                                                <th>Prix de Vente</th>
                                                                <th>Prix d'Achat</th>
                                                                <th>Bénéfice/Unité</th>
                                                                <th>Stock Total</th>
                                                                <th>Gain Potentiel</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {stockFiltre.map(product => (
                                                                <tr key={product._id}>
                                                                    <td>{product.name}</td>
                                                                    <td>{formatCurrency(product.price)}</td>
                                                                    <td>{formatCurrency(product.buyPrice)}</td>
                                                                    <td>
                                                                        {/* Ensure calculation is accurate and badge color reflects logic */}
                                                                        <Badge bg={product.gainPerUnit > 0 ? "success" : "danger"}>
                                                                            {formatCurrency(product.gainPerUnit)}
                                                                        </Badge>
                                                                    </td>
                                                                    <td>{product.totalStock}</td>
                                                                    <td className={product.potentialGain < 0 ? 'text-danger fw-bold' : 'text-success fw-bold'}>
                                                                        {formatCurrency(product.potentialGain)}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </Table>
                                                </div>
                                            ) : (
                                                <Alert variant="info" className="mt-3 text-center">
                                                    Aucune donnée de stock de produit disponible ou correspondant aux filtres.
                                                </Alert>
                                            )}
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        )}
                    </div>
                </Tab>

                {/* ONGLET 3: Gestion de Stock (Produits & Matières Premières) */}
                <Tab eventKey="stock" title={<span><Package size={18} className='me-2' /> Gestion de Stock</span>}>
                    <Accordion defaultActiveKey="0" className="mt-3">
                        {/* Section 3.1: Gestion des Stocks de Produits */}
                        <Accordion.Item eventKey="0">
                            <Accordion.Header>
                                <Package size={18} className='me-2' /> Stocks de Produits (Produits Finis)
                            </Accordion.Header>
                            <Accordion.Body>
                                {isLoading ? (
                                    <div className="text-center py-5"><Spinner animation="border" /> Chargement du stock produit...</div>
                                ) : (
                                    <>
                                        <Alert variant="info">
                                            Stock Bar : Stock disponible à la vente immédiate. | Stock Général : Réserve.
                                        </Alert>
                                        <div className="table-responsive">
                                            <Table striped bordered hover responsive className='align-middle'>
                                                <thead>
                                                    <tr className='table-dark'>
                                                        <th>Nom du Produit</th>
                                                        <th>Catégorie</th>
                                                        <th>Stock Bar</th>
                                                        <th>Stock Général</th>
                                                        <th>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {remainingProductStock.map(renderProductRow)}
                                                </tbody>
                                            </Table>
                                        </div>
                                    </>
                                )}
                            </Accordion.Body>
                        </Accordion.Item>

                        {/* Section 3.2: Gestion des Stocks d'Inventaire (Matières Premières) */}
                        <Accordion.Item eventKey="1">
                            <Accordion.Header>
                                <Redo size={18} className='me-2' /> Stocks d'Inventaire (Matières Premières)
                            </Accordion.Header>
                            <Accordion.Body>
                                {isLoading ? (
                                    <div className="text-center py-5"><Spinner animation="border" /> Chargement du stock inventaire...</div>
                                ) : (
                                    <>
                                        <Alert variant="info">
                                            Store Stock : Stock dans le magasin. | General Stock : Réserve principale.
                                        </Alert>
                                        <div className="table-responsive">
                                            <Table striped bordered hover responsive className='align-middle'>
                                                <thead>
                                                    <tr className='table-dark'>
                                                        <th>Nom de l'Article</th>
                                                        <th>Unité</th>
                                                        <th>Store Stock</th>
                                                        <th>General Stock</th>
                                                        <th>Total</th>
                                                        <th>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {remainingInventoryStock.map(renderInventoryRow)}
                                                </tbody>
                                            </Table>
                                        </div>
                                    </>
                                )}
                            </Accordion.Body>
                        </Accordion.Item>
                    </Accordion>
                </Tab>

                {/* ONGLET 4: Transactions */}
                <Tab eventKey="transactions" title={<span><Wallet size={18} className='me-2' /> Transactions ({transactions.length})</span>}>
                    <h4 className="mt-3 mb-4">Historique des Transactions (Factures)</h4>
                    <Card className="shadow mb-4">
                        <Card.Header as="h5" className="bg-light"><Filter size={18} className='me-2' /> Filtres des Transactions</Card.Header>
                        <Card.Body>
                            <Form>
                                <Row className="g-3">
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label>Date de Début</Form.Label>
                                            <Form.Control type="date" value={filtreTransaction.dateDebut} onChange={(e) => setFiltreTransaction({ ...filtreTransaction, dateDebut: e.target.value })} />
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label>Date de Fin</Form.Label>
                                            <Form.Control type="date" value={filtreTransaction.dateFin} onChange={(e) => setFiltreTransaction({ ...filtreTransaction, dateFin: e.target.value })} />
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label>Méthode de Paiement</Form.Label>
                                            <Form.Select value={filtreTransaction.methodePaiement} onChange={(e) => setFiltreTransaction({ ...filtreTransaction, methodePaiement: e.target.value })}>
                                                <option value="">-- Toutes --</option>
                                                <option value="CASH">Espèces</option>
                                                <option value="CREDIT">Crédit Client</option>
                                                <option value="MOBILE">Mobile Money</option>
                                                {/* Add other payment methods */}
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label>Statut</Form.Label>
                                            <Form.Select value={filtreTransaction.statut} onChange={(e) => setFiltreTransaction({ ...filtreTransaction, statut: e.target.value })}>
                                                <option value="">-- Tous --</option>
                                                <option value="PAID">Payée</option>
                                                <option value="PENDING">Impayée/Partielle</option>
                                                {/* Add other statuses if needed */}
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                </Row>
                            </Form>
                        </Card.Body>
                    </Card>

                    {isLoading ? (
                        <div className="text-center py-5"><Spinner animation="border" /> Chargement des transactions...</div>
                    ) : (
                        <div className="table-responsive">
                            <Table striped hover responsive className='align-middle'>
                                <thead>
                                    <tr>
                                        <th># Facture</th>
                                        <th>Date</th>
                                        <th>Client</th>
                                        <th>Méthode</th>
                                        <th>Statut</th>
                                        <th className='text-end'>Montant Payé</th>
                                        <th className='text-end'>Total Facture</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactionsFiltrees.map((t) => (
                                        <tr key={t._id}>
                                            <td>**{t.billNumber || t._id.slice(-6).toUpperCase()}**</td>
                                            <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                                            <td>{t.customerName || 'Client de Passage'}</td>
                                            <td>{t.paymentMethod || 'N/A'}</td>
                                            <td>{getPaymentBadge(t.paymentStatus, t.amountPaid, t.total)}</td>
                                            <td className='text-end'>{formatCurrency(t.amountPaid)}</td>
                                            <td className='text-end fw-bold'>{formatCurrency(t.total)}</td>
                                        </tr>
                                    ))}
                                    {transactionsFiltrees.length === 0 && (
                                        <tr><td colSpan="7" className="text-center">Aucune transaction trouvée pour le filtre sélectionné.</td></tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Tab>

                {/* ONGLET 5: Résumé Quotidien */}
                <Tab eventKey="dailySummary" title={<span><Calendar size={18} className='me-2' /> Résumé Quotidien</span>}>
                    <DailySummary />
                </Tab>

                {/* ONGLET 6: Performance du Personnel */}
                {isManagerOrAdmin && (
                    <Tab eventKey="staffPerformance" title={<span><UserCheck size={18} className='me-2' /> Performance Personnel</span>}>
                        {/* Note: The detailed staff report is already integrated into the main 'report' tab, 
                                this tab can be removed or dedicated to another aspect. */}
                        <Alert variant="warning" className="mt-3">
                            Le rapport détaillé de performance par produit et par personnel se trouve dans l'onglet **Rapports Ventes**.
                        </Alert>
                    </Tab>
                )}

                {/* ONGLET 7: Journaux d'Audit */}
                {isManagerOrAdmin && (
                    <Tab eventKey="auditLogs" title={<span><History size={18} className='me-2' /> Audit Logs</span>}>
                        <AuditLogs />
                    </Tab>
                )}
            </Tabs>

            {/* Modals pour la Gestion du Stock de Produits */}
            {selectedProduct && (
                <>
                    <ModalAjustementStockProduit
                        show={showAdjustModal}
                        onHide={() => setShowAdjustModal(false)}
                        product={selectedProduct}
                        refreshData={refreshData}
                    />
                    <ModalTransfertStockProduit
                        show={showTransferModal}
                        onHide={() => setShowTransferModal(false)}
                        product={selectedProduct}
                        refreshData={refreshData}
                    />
                </>
            )}

            {/* Modals pour la Gestion de l'Inventaire de Matières Premières (Simulations) */}
            {selectedInventoryItem && (
                <>
                    <ModalAjustementStockInventaire
                        show={showAdjustInventoryModal}
                        onHide={() => setShowAdjustInventoryModal(false)}
                        item={selectedInventoryItem}
                        refreshData={refreshData}
                    />
                    <ModalTransfertStockInventaire
                        show={showTransferInventoryModal}
                        onHide={() => setShowTransferInventoryModal(false)}
                        item={selectedInventoryItem}
                        refreshData={refreshData}
                    />
                </>
            )}
        </Container>
    );
};

export default Inventory;