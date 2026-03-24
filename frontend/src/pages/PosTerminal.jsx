import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { UserPlus, Save, DollarSign, XCircle, ShoppingCart as ShoppingCartLucide } from 'lucide-react';
import { FaRestroom, FaWineGlass, FaCashRegister, FaHamburger, FaBox, FaSearch, FaMinus, FaPlus, FaTrash, FaUsers, FaShoppingCart, FaBan, FaListUl, FaTimesCircle, FaCheckCircle } from 'react-icons/fa';
import { Container, Row, Col, Card, Alert, InputGroup, Spinner, Form, Button, ListGroup, Badge, OverlayTrigger, Tooltip, Toast, ToastContainer, Modal } from 'react-bootstrap';
import { User, Users } from 'lucide-react';

import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import CustomerSearchModal from '../components/CustomerSearchModal';
import FinalizePaymentModal from '../components/FinalizePaymentModal';
import { useAuth } from '../context/AuthContext';
import Receipt from '../components/Receipt';
import Image1 from '../../public/logo.png'

const DEFAULT_IMAGE_URL = Image1;
// const API_URL = 'http://localhost:5000/api/v1';
const API_URL = 'https://posbackend-usko.onrender.com/api/v1';


// Define Categories for easy filtering
const PRODUCT_CATEGORIES = {
    DRINK: 'Drink',
    FOOD: 'Nourriture',
    OTHER: 'Other',
};
const CATEGORY_BUTTONS = [
    { key: 'ALL', icon: FaListUl, title: 'Tous les produits' },
    { key: PRODUCT_CATEGORIES.DRINK, icon: FaWineGlass, title: 'Boissons' },
    { key: PRODUCT_CATEGORIES.FOOD, icon: FaHamburger, title: 'Nourriture' },
    { key: PRODUCT_CATEGORIES.OTHER, icon: FaBox, title: 'Autres articles' },
];

// Utility function remains the same
const printContent = (elementId) => {
    const content = document.getElementById(elementId);
    if (!content) {
        console.error(`Erreur : L'élément avec l'ID ${elementId} n'a pas été trouvé pour l'impression.`);
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

const PosTerminal = () => {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [customer, setCustomer] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [draftName, setDraftName] = useState('');

    const [draftIdsToFinalize, setDraftIdsToFinalize] = useState([]);
    const [isDraftLoading, setIsDraftLoading] = useState(false);
    
    // ⭐ NOUVEAU: État pour capturer les données de la transaction finalisée (brouillon) pour l'impression
    const [receiptDataForPrint, setReceiptDataForPrint] = useState(null); 
    // ⭐ FIN NOUVEAU

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');


    // --- Calculations ---
    const cartTotal = useMemo(() =>
        cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        , [cart]);

    // --- Handlers (clearCart DOIT être déclaré en premier) ---
    const clearCart = useCallback(() => {
        setCart([]);
        setCustomer(null);
        setDraftIdsToFinalize([]);
        setDraftName('');
        setError(null);
        setSuccessMessage('Nouvelle transaction démarrée.');
    }, []);

    const fetchCustomerDetails = useCallback(async (customerId) => {
        if (!customerId) return null;
        try {
            const response = await axios.get(`${API_URL}/customers/${customerId}`);
            return response.data.customer;
        } catch (error) {
            console.error("Erreur lors de la récupération des détails client:", error);
            setError("Impossible de charger le dernier solde de crédit du client.");
            return null;
        }
    }, [setError]);


    // --- Utility Function to Load a Draft by ID (Peut maintenant utiliser clearCart) ---
    const loadDraft = useCallback(async (billId) => {
        if (!billId) return;

        setIsDraftLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await axios.get(`${API_URL}/bills/drafts/${billId}`);

            let draft;
            if (response.data.drafts && response.data.drafts.length > 0) {
                draft = response.data.drafts[0];
            } else if (response.data._id) {
                draft = response.data;
            }

            if (!draft) {
                throw new Error('Facture brouillon introuvable.');
            }

            const newCart = draft.items.map(item => ({
                _id: item.product?._id || item.product,
                name: item.name || item.product?.name,
                price: item.price || item.product?.price,
                quantity: item.quantity
            }));
            setCart(newCart);

            setDraftIdsToFinalize([draft._id]);
            setDraftName(draft.draftName || '');

            let draftCustomer = null;
            if (draft.customer) {
                const customerId = draft.customer._id || draft.customer;
                draftCustomer = {
                    _id: customerId,
                    name: draft.customer.name || 'Chargement...',
                    creditBalance: 0
                };
                const fullCustomerDetails = await fetchCustomerDetails(customerId);
                if (fullCustomerDetails) {
                    draftCustomer = fullCustomerDetails;
                }
            }
            setCustomer(draftCustomer);

            setSuccessMessage(`Brouillon ${draft._id.slice(-6)} chargé avec succès.`);

        } catch (err) {
            console.error("Erreur détaillée lors du chargement du brouillon:", err);
            setError(err.response?.data?.msg || `Échec du chargement du brouillon. L'ID: ${billId} est peut-être invalide.`);
            clearCart();
        } finally {
            setIsDraftLoading(false);
        }
    }, [clearCart, fetchCustomerDetails, setError, setSuccessMessage, setDraftIdsToFinalize, setCart, setCustomer, setDraftName, setIsDraftLoading]);


    const handleCustomerSelect = useCallback(async (selectedCustomer) => {
        const customerId = selectedCustomer?._id;

        if (!customerId) {
            // Client de Passage (Walk-in)
            setCustomer(null);
            setShowCustomerModal(false);
            setSuccessMessage(`Client de Passage sélectionné.`);
            return;
        }

        const fullCustomerDetails = await fetchCustomerDetails(customerId);

        if (fullCustomerDetails) {
            setCustomer(fullCustomerDetails);
            setShowCustomerModal(false);
            const balance = fullCustomerDetails.creditBalance?.toFixed(2) || '0.00';
            setSuccessMessage(`Client : ${fullCustomerDetails.name} sélectionné. Solde de crédit actuel : $${balance}`);
        } else {
            setCustomer(selectedCustomer);
            setShowCustomerModal(false);
            const balance = selectedCustomer.creditBalance?.toFixed(2) || '0.00';
            setSuccessMessage(`Client : ${selectedCustomer.name} sélectionné. Impossible de vérifier le dernier crédit. Affiché : $${balance}`);
        }
    }, [fetchCustomerDetails, setCustomer, setShowCustomerModal, setSuccessMessage]);


    const addToCart = (product) => {
        const currentStock = product.isStockTracked ? product.stockBar : Infinity;

        if (product.isStockTracked && currentStock <= 0) {
            setError(`Erreur: Stock épuisé pour ${product.name}.`);
            return;
        }

        setCart(prevCart => {
            const existingItem = prevCart.find(item => item._id === product._id);
            if (existingItem) {
                if (product.isStockTracked && existingItem.quantity + 1 > currentStock) {
                    setError(`Erreur: Seulement ${currentStock} unités de ${product.name} en stock.`);
                    return prevCart;
                }
                return prevCart.map(item =>
                    item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
                );
            } else {
                if (product.isStockTracked && 1 > currentStock) {
                    setError(`Erreur: Seulement ${currentStock} unités de ${product.name} en stock.`);
                    return prevCart;
                }
                return [...prevCart, {
                    _id: product._id,
                    name: product.name,
                    price: product.price,
                    quantity: 1
                }];
            }
        });
        setSuccessMessage(`Ajouté ${product.name} au panier.`);
    };

    const updateQuantity = (productId, change) => {
        setCart(prevCart => {
            const product = products.find(p => p._id === productId);
            const existingItem = prevCart.find(item => item._id === productId);

            if (!existingItem) return prevCart;

            const newQuantity = existingItem.quantity + change;
            const currentStock = product.isStockTracked ? product.stockBar : Infinity;

            if (change > 0 && product.isStockTracked && newQuantity > currentStock) {
                setError(`Erreur: Seulement ${currentStock} unités de ${product.name} en stock.`);
                return prevCart;
            }

            const newCart = prevCart.map(item =>
                item._id === productId ? { ...item, quantity: newQuantity } : item
            ).filter(item => item.quantity > 0);
            return newCart;
        });
    };

    const removeItem = (productId) => {
        setCart(prevCart => prevCart.filter(item => item._id !== productId));
        setSuccessMessage('Article retiré du panier.');
    };


    const handlePrintReceipt = () => {
        return printContent('print-receipt-content');
    }

    const handleSaveDraft = async () => {
        if (cart.length === 0) {
            setError('Impossible d\'enregistrer un panier vide comme brouillon.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        const activeDraftId = draftIdsToFinalize[0];

        const billData = {
            items: cart.map(item => ({
                product: item._id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
            })),
            totalAmount: cartTotal,
            customer: customer ? customer._id : null,
            draftName: draftName || `Brouillon n°${Date.now() % 10000}`,
        };

        let url = `${API_URL}/bills/drafts`;
        let method = axios.post;

        if (activeDraftId) {
            url = `${API_URL}/bills/drafts/${activeDraftId}`;
            method = axios.patch;
        }

        try {
            const response = await method(url, billData);
            const savedBill = response.data.draftBill || response.data.updatedDraft;

            if (!savedBill) {
                throw new Error('La réponse ne contenait pas l\'objet de facture brouillon enregistré.');
            }
            
            // ⭐ CORRECTION: Capturez les données pour l'impression avant d'effacer le panier.
            const finalDraftIds = activeDraftId ? draftIdsToFinalize : [savedBill._id];
            const receiptSnapshot = {
                cart: cart,
                cartTotal: cartTotal,
                customer: customer,
                user: user,
                draftIds: finalDraftIds,
                // Note: billId can be derived from finalDraftIds if needed in Receipt.jsx
            };

            if (!activeDraftId) {
                setDraftIdsToFinalize(finalDraftIds); // Update the state with the new ID
            }
            
            clearCart(); // Efface maintenant l'état principal
            setIsLoading(false);

            setSuccessMessage(`Facture brouillon ${finalDraftIds[0].slice(-6)} enregistrée/mise à jour avec succès. Préparation de l'impression du reçu...`);

            // Déclenchez l'impression via l'effet
            setReceiptDataForPrint(receiptSnapshot);

        } catch (err) {
            setError(err.response?.data?.msg || 'Échec de l\'enregistrement/mise à jour du brouillon de facture.');
            setIsLoading(false);
        }
    };
    
    // ⭐ MODIFICATION: useEffect modifié pour n'imprimer qu'une seule fois
    useEffect(() => {
        if (receiptDataForPrint) {
            // Un petit délai pour s'assurer que le DOM a mis à jour le contenu du reçu avec les données snapshot
            setTimeout(() => {
                const printSuccess = handlePrintReceipt(); // Une seule impression

                if (printSuccess) {
                    const draftId = receiptDataForPrint.draftIds[0].slice(-6);
                    setSuccessMessage(`Brouillon ${draftId} enregistré. Impression du reçu terminée.`);
                } else {
                    setSuccessMessage(prev =>
                        `${prev}. ATTENTION: Échec de l'impression du reçu. Vérifiez le contenu d'impression ou le périphérique.`
                    );
                    console.warn("Printing failed: Receipt content not found or printer inaccessible.");
                }
                
                // Toujours réinitialiser l'état de l'impression après l'opération (succès ou échec)
                setReceiptDataForPrint(null); 
            }, 100); 
        }
    }, [receiptDataForPrint, setSuccessMessage]);
    // ⭐ FIN MODIFICATION useEffect


    const handleFinalizeBillClick = async (e) => {
        e.preventDefault()
        if (cart.length === 0) {
            setError('Le panier est vide. Impossible de finaliser la facture.');
            return;
        }

        setIsLoading(true);
        setError(null);

        if (customer && customer._id) {
            const latestCustomerDetails = await fetchCustomerDetails(customer._id);
            if (latestCustomerDetails) {
                setCustomer(latestCustomerDetails);
            }
        }

        if (draftIdsToFinalize.length > 0) {
            setIsLoading(false);
            setShowPaymentModal(true);
            return;
        }

        try {
            const billData = {
                items: cart.map(item => ({
                    product: item._id,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price
                })),
                customer: customer ? customer._id : null,
                totalAmount: cartTotal,
                draftName: draftName || 'Paiement Rapide - ' + new Date().toLocaleTimeString(),
            };

            const response = await axios.post(`${API_URL}/bills/drafts`, billData);
            const createdBill = response.data.draftBill;

            if (!createdBill) {
                throw new Error('Échec de la création du brouillon : l\'objet de réponse manque draftBill.');
            }

            setDraftIdsToFinalize([createdBill._id]);
            setSuccessMessage(`Nouveau brouillon rapide créé (${createdBill._id.slice(-6)}) et prêt pour le paiement.`);
            setShowPaymentModal(true);


        } catch (err) {
            setError(err.response?.data?.msg || 'Échec de la création du brouillon avant la finalisation.');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Effects ---
    useEffect(() => {
        if (isLoading || cart.length > 0 || isDraftLoading) return;

        const draftState = location.state;

        if (draftState?.mergedCart) {
            setCart(draftState.mergedCart);
            setCustomer(draftState.customer || null);
            setDraftName(draftState.draftName || '');
            setDraftIdsToFinalize(draftState.draftIdsToFinalize || []);
            setSuccessMessage(`Brouillon ${draftState.draftIdsToFinalize[0].slice(-6)} chargé depuis l'édition.`);
            navigate(location.pathname, { replace: true, state: {} });
        }

        const queryParams = new URLSearchParams(location.search);
        const draftIdFromUrl = queryParams.get('draftId');

        if (draftIdFromUrl && cart.length === 0 && !isDraftLoading) {
            loadDraft(draftIdFromUrl);
        }
    }, [isLoading, isDraftLoading, location.state, location.search, navigate, loadDraft]);


useEffect(() => {
    const fetchProducts = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`${API_URL}/products/sellable`);
            const allFetchedProducts = response.data.products;

            // Apply a strict filter
            const filteredProducts = allFetchedProducts.filter(p => {
                const isPortion = p.isBuffetPortion === true;
                const isBuffetCategory = p.category?.toLowerCase().includes('buffet');
                
                // Return TRUE only if it is NOT a portion AND NOT in a buffet category
                return !isPortion && !isBuffetCategory;
            });

            setProducts(filteredProducts);
        } catch (err) {
            setError('Échec du chargement.');
        } finally {
            setIsLoading(false);
        }
    };
    fetchProducts();
}, []);
    const filteredProducts = useMemo(() => {
        const lowerCaseSearch = searchTerm.toLowerCase();
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(lowerCaseSearch);
            const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchTerm, selectedCategory]);

    if (isLoading || isDraftLoading) {
        return (
            <Container className="text-center py-5">
                <Spinner animation="border" />
                <p>{isDraftLoading ? 'Chargement du brouillon...' : 'Chargement des produits...'}</p>
            </Container>
        );
    }

    const handleQuantityChange = (productId, rawValue) => {
        let newQuantity = parseInt(rawValue, 10);

        if (isNaN(newQuantity) || newQuantity < 1) {
            // Si l'entrée est vide ou non numérique, on ne fait rien ou on pourrait mettre 1
            // Pour l'instant, on attend une valeur valide.
            return; 
        }

        setCart(prevCart => {
            const product = products.find(p => p._id === productId);
            const currentStock = product?.isStockTracked ? product.stockBar : Infinity;
            const existingItem = prevCart.find(item => item._id === productId);

            if (!existingItem) return prevCart;

            // 1. Appliquer la limite de stock
            if (product?.isStockTracked && newQuantity > currentStock) {
                setError(`Erreur: Seulement ${currentStock} unités de ${product.name} en stock. Quantité limitée à ${currentStock}.`);
                newQuantity = currentStock; // Limiter la quantité au stock disponible
            }

            // 2. Mettre à jour le panier, en filtrant si la quantité devient 0 (ce qui ne devrait pas arriver avec min="1")
            const newCart = prevCart.map(item =>
                item._id === productId ? { ...item, quantity: newQuantity } : item
            ).filter(item => item.quantity > 0);

            // Ne pas mettre à jour le message de succès si la valeur est juste ajustée au stock
            if (newQuantity >= 1) {
                 setSuccessMessage(`Quantité de ${product.name} définie à ${newQuantity}.`);
            }
            return newCart;
        });
    };

    return (
        <Container fluid className="pos-terminal-container p-4">
            {/* TOAST CONTAINER for Error and Success Messages */}
            <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1050 }}>
                {error && (
                    <Toast onClose={() => setError(null)} show={!!error} delay={4000} autohide bg="danger" className="text-white">
                        <Toast.Header closeButton={true} className="bg-danger text-white border-0 fw-bold">
                            <FaTimesCircle className="me-2" size={16} /> Erreur
                        </Toast.Header>
                        <Toast.Body>{error}</Toast.Body>
                    </Toast>
                )}
                {successMessage && (
                    <Toast onClose={() => setSuccessMessage(null)} show={!!successMessage} delay={3000} autohide bg="success" className="text-white">
                        <Toast.Header closeButton={true} className="bg-success text-white border-0 fw-bold">
                            <FaCheckCircle className="me-2" size={16} /> Succès
                        </Toast.Header>
                        <Toast.Body>{successMessage}</Toast.Body>
                    </Toast>
                )}
            </ToastContainer>

            <Row className='g-4'>
                {/* LEFT COLUMN: Products Panel (Unchanged) */}
                <Col lg={8} md={12}>
                    <Card className="shadow-xl h-100 card-modern border-0">
                        <Card.Header className="bg-primary text-white p-3 rounded-top d-flex flex-column">
                            <div className='d-flex align-items-center justify-content-between mb-3'>
                                <span className='fw-bold fs-5'>Catalogue Produits</span>
                                <InputGroup className="w-50 shadow-sm" >
                                    <InputGroup.Text className='rechercherpare'><FaSearch /></InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder="Rechercher par nom ou code..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </InputGroup>
                            </div>
                            <div className='d-flex justify-content-between'>
                                <div className='d-flex gap-2 flex-wrap'>
                                    {CATEGORY_BUTTONS.map(cat => {
                                        const Icon = cat.icon;
                                        return (
                                            <OverlayTrigger
                                                key={cat.key}
                                                placement="top"
                                                overlay={<Tooltip id={`tooltip-${cat.key}`}>{cat.title}</Tooltip>}
                                            >
                                                <Button
                                                    variant={selectedCategory === cat.key ? 'light' : 'outline-light'}
                                                    size='sm'
                                                    onClick={() => setSelectedCategory(cat.key)}
                                                    className={`d-flex align-items-center fw-medium btn-modern-category ${selectedCategory !== cat.key ? '' : 'text-primary'}`}
                                                >
                                                    <Icon size={18} />
                                                </Button>
                                            </OverlayTrigger>
                                        );
                                    })}
                                </div>
                                {/* Customer Info Card */}
                                <div className="mb-3 p-3 bg-white rounded shadow-sm d-flex justify-content-between align-items-center customercard border-start border-primary border-4 flex-shrink-0">
                                    <div className='d-flex justify-content-between align-items-center'>
                                        <FaUsers className='me-2 text-primary' />
                                        <span className='fw-bold text-primary '>{customer ? customer.name : 'Client de Passage'}</span>
                                        {customer && (
                                            <div style={{ fontSize: '0.8rem' }} className='text-muted'>
                                                Crédit: <span className=' text-success' style={{ fontWeight: "900" }}>${customer.creditBalance?.toFixed(2) || '0.00'}</span>
                                            </div>
                                        )}
                                    </div>
                                    <Button size='sm' variant='outline-primary' onClick={() => setShowCustomerModal(true)} className='btn-modern-category'>
                                        <UserPlus size={16} />
                                    </Button>
                                </div>
                            </div>
                        </Card.Header>

                        <Card.Body className="d-flex flex-wrap gap-3 p-3" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', background: '#f8f9fa' }}>
                            {filteredProducts.length > 0 ? (
                                filteredProducts.map(product => {
                                    const currentStock = product.isStockTracked ? (product.stockBar || 0) : Infinity;
                                    const isStockTracked = product.isStockTracked;
                                    const defaultLowStockThreshold = 5;
                                    const productThreshold = Number(product.lowStockThreshold);
                                    const lowStockThreshold = productThreshold > 0 ? productThreshold : defaultLowStockThreshold;
                                    const isOutofStock = isStockTracked && currentStock <= 0;
                                    const isLowStock = !isOutofStock && isStockTracked && currentStock <= lowStockThreshold;
                                    const priceBarColor = isOutofStock ? 'bg-danger' : isLowStock ? 'bg-warning text-dark' : 'bg-primary';
                                    const disabled = isOutofStock;

                                    return (
                                        <div
                                            key={product._id}
                                            className={`product-tile-custom card shadow-sm text-center border ${disabled ? 'opacity-50 border-danger' : 'border-light-subtle'}`}
                                            onClick={() => !disabled && addToCart(product)}
                                            style={{
                                                cursor: disabled ? 'not-allowed' : 'pointer',
                                                flex: '1 1 120px',
                                                maxWidth: '100px',
                                                // maxWidth: '100px',
                                                borderRadius: '0.75rem',
                                                overflow: 'hidden',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                maxHeight: '180px',
                                            }}
                                        >
                                            <div className="product-image-container bg-light" style={{ height: '150px', overflow: 'hidden', position: 'relative' }}>
                                                <Card.Img
                                                    variant="top"
                                                    src={product.image || DEFAULT_IMAGE_URL}
                                                    alt={product.name}
                                                    onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_IMAGE_URL; }}
                                                    style={{ height: '100%', width: '100%', objectFit: 'cover' }}
                                                />
                                            </div>

                                            <div className='p-2 flex-grow-1 d-flex flex-column justify-content-between '>
                                                <h6 className="fw-bold text-truncate mb-1" title={product.name} style={{ fontSize: '0.9rem' }}>
                                                    {product.name}
                                                </h6>

                                                {isStockTracked ? (
                                                    (isLowStock || isOutofStock) ? (
                                                        <small className={`fw-bold  ${isOutofStock ? 'text-danger' : 'text-warning'}`} style={{ fontSize: '0.75rem' }}>
                                                            {isOutofStock ? 'ÉPUISÉ' : `STOCK BAS: ${currentStock}`}
                                                        </small>
                                                    ) : (
                                                        <small className='text-success fw-medium ' style={{ fontSize: '0.75rem' }}>En Stock</small>
                                                    )
                                                ) : (
                                                    <small className='text-muted ' style={{ fontSize: '0.75rem' }}>Stock Non Suivi</small>
                                                )}
                                            </div>

                                            <div className={`p-2 text-white fw-bolder ${priceBarColor}`} style={{ fontSize: '0.9rem' }}>
                                                ${product.price.toFixed(2)}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-center w-100 p-5 text-muted">
                                    <FaBan size={30} className='d-block mx-auto mb-2' />
                                    Aucun produit trouvé.
                                </p>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* RIGHT COLUMN: Cart Panel (Modified) */}
                <Col lg={4} md={12}>
                    <Card className="shadow-xl h-100 card-modern border-0 d-flex flex-column">

                        {/* ⭐ MODIFICATION 1: Moved "Vider la Commande" to Header */}
                        <Card.Header className="bg-secondary text-white d-flex align-items-center p-3 rounded-top justify-content-between">
                            <div className='d-flex align-items-center'>
                                <ShoppingCartLucide className='me-2' size={20} /> **Panier Client**
                            </div>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={clearCart}
                                disabled={cart.length === 0}
                                className='btn-pos-action text-white fw-bold'
                            >
                                <FaTrash className='me-1' />
                            </Button>
                        </Card.Header>

                        <Card.Body className="d-flex flex-column p-3 flex-grow-1" style={{ maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}>

                            {/* Draft Info */}
                            {draftIdsToFinalize.length > 0 && (
                                <div className="mb-3 p-2 bg-warning bg-opacity-10 border-start border-warning border-5 rounded flex-shrink-0">
                                    <span className='fw-bold text-warning'>Brouillon : </span>
                                    <span>{draftIdsToFinalize[0].slice(-6)}...</span>
                                    <Form.Control
                                        type="text"
                                        placeholder="Nom du brouillon (Optionnel)"
                                        value={draftName}
                                        onChange={(e) => setDraftName(e.target.value)}
                                        className="mt-1 form-control-sm"
                                    />
                                </div>
                            )}

                            {/* Cart List */}
                            <ListGroup variant="flush" className="flex-grow-1 border rounded-3 overflow-hidden bg-white">
                                {cart.length === 0 ? (
                                    <ListGroup.Item className="text-center text-muted p-4">
                                        <ShoppingCartLucide size={30} className='d-block mx-auto mb-2' />
                                        Le panier est vide.
                                    </ListGroup.Item>
                                ) : (
                                    cart.map(item => (
                                        <ListGroup.Item key={item._id} className="d-flex justify-content-between align-items-center p-2 border-bottom hover-bg-light">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <div className='fw-medium text-truncate' style={{ maxWidth: '140px', fontSize: "12px" }}>{item.name}</div>
                                                <span className='fw-semibold text-muted' style={{ marginLeft: "5px", fontSize: "12px" }}> @{item.price.toFixed(2)} $</span>
                                            </div>
                                            <div className='d-flex align-items-center'>
                                                <Button
                                                    variant='outline-secondary'
                                                    size='sm'
                                                    onClick={() => updateQuantity(item._id, -1)}
                                                    className='p-1 btn-pos-action'
                                                >
                                                    <FaMinus size={10} />
                                                </Button>
                                                <Form.Control
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => handleQuantityChange(item._id, e.target.value)}
                                                    className='mx-1 fw-bold text-center '
                                                    style={{ width: '60px', padding: '0.25rem', background:"blue",color:"white", height: 'auto', fontSize: '0.9rem', border: '1px solid var(--bs-primary)' }}
                                                />
                                                <Button
                                                    variant='outline-secondary'
                                                    size='sm'
                                                    onClick={() => updateQuantity(item._id, 1)}
                                                    className='me-2 p-1 btn-pos-action'
                                                >
                                                    <FaPlus size={10} />
                                                </Button>
                                                <Button
                                                    variant='danger'
                                                    size='sm'
                                                    onClick={() => removeItem(item._id)}
                                                    className='p-1 btn-pos-action'
                                                >
                                                    <XCircle size={14} />
                                                </Button>
                                            </div>
                                        </ListGroup.Item>
                                    ))
                                )}
                            </ListGroup>
                        </Card.Body>

                        {/* Totals & Action Buttons: Accentuated Total and Clear Action Hierarchy */}
                        <Card.Footer className='p-4 bg-light flex-shrink-0'>
                            <div className="d-flex justify-content-between mb-4 fw-bold fs-3 border-bottom border-success border-2 pb-2">
                                <span>Total :</span>
                                <span className='text-success'>${cartTotal.toFixed(2)}</span>
                            </div>

                            <div className='d-flex gap-2'>
                                {/* ⭐ MODIFICATION 2: Button Payer is smaller */}
                                {user && ['admin', 'manager', 'cashier'].includes(user.role) && (
                                    <Button
                                        variant="success"
                                        onClick={handleFinalizeBillClick}
                                        disabled={cart.length === 0}
                                        className='btn-pos-action fw-bolder shadow'
                                        style={{fontSize:"15px"}}
                                    >
                                        <DollarSign size={16} className='me-2' /> <br/> CONFIRMER (${cartTotal.toFixed(2)})
                                    </Button>
                                )}

                                {/* ⭐ MODIFICATION 3: Button Enregistrer Brouillon is default size */}
                                <Button
                                    variant="outline-primary"
                                    onClick={handleSaveDraft}
                                    disabled={cart.length === 0}
                                    className='btn-pos-action'
                                        style={{fontSize:"15px"}}
                                    
                                >
                                    <Save size={16} className='me-2' /> <br/>Enregistrer Brouillon
                                </Button>
                            </div>
                        </Card.Footer>
                    </Card>
                </Col>
            </Row>

            {/* Modals and Receipt */}
            <CustomerSearchModal
                show={showCustomerModal}
                handleClose={() => setShowCustomerModal(false)}
                onCustomerSelect={handleCustomerSelect}
            />
            <FinalizePaymentModal
                show={showPaymentModal}
                handleClose={() => setShowPaymentModal(false)}
                cart={cart}
                cartTotal={cartTotal}
                customer={customer}
                user={user}
                clearCart={clearCart}
                setError={setError}
                draftIds={draftIdsToFinalize}
            />
            {/* ⭐ CORRECTION: Utilise receiptDataForPrint si disponible pour l'impression */}
            <div id="print-receipt-content" className="receipt-wrapper screen-hide" >
                <Receipt
                    cart={receiptDataForPrint?.cart || cart}
                    cartTotal={receiptDataForPrint?.cartTotal || cartTotal}
                    customer={receiptDataForPrint?.customer || customer}
                    user={receiptDataForPrint?.user || user}
                    draftIds={receiptDataForPrint?.draftIds || draftIdsToFinalize}
                    // billId will be used if set inside receiptDataForPrint (e.g. for finalized bills)
                    billId={receiptDataForPrint?.billId || undefined} 
                />
            </div>
        </Container>
    );
};

export default PosTerminal;
