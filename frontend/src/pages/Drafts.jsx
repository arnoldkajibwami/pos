import React, { useState, useEffect, useMemo, useCallback } from 'react';
// import { Container, Card, Table, Button, Spinner, Alert, Form, Badge, InputGroup, Modal } from 'react-bootstrap';
import { Container, Card, Alert, Button, Spinner, Table, Form, InputGroup, Badge, Modal } from 'react-bootstrap';
// Lucide Icons for a modern look
import { Layers, X, Search, User, Plus, Pencil, Printer, Trash2, CheckCircle } from 'lucide-react';
import API_URL from '../api/api'
import axios from 'axios';
import { useNavigate , Link} from 'react-router-dom';
// NOTE: Assuming DraftReceipt is imported from a separate file as per your original structure.
// import DraftReceipt from '../components/DraftReceipt'; 
import Receipt from '../components/Receipt';
import { FaHistory } from 'react-icons/fa';

// ... (Your printContent function remains unchanged)
const printContent = (elementId) => {
    const content = document.getElementById(elementId);
    if (!content) {
        console.error(`Error: Element with ID ${elementId} not found for printing.`);
        return false;
    }

    const printContents = content.innerHTML;

    // Create a temporary hidden iframe to isolate the print process
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);

    // Write content to the iframe with thermal styles
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(`
        <html>
        <head>
            <title>Receipt</title>
            <style>
                /* Thermal receipt size */
                @page { 
                    size: 80mm auto; 
                    margin: 0;
                }
                body {
                    margin: 0;
                    font-family: monospace;
                    background-color: white !important;
                }
                /* Ensure content is visible within the iframe print context */
                div { display: block !important; } 
            </style>
        </head>
        <body>
            ${printContents}
        </body>
        </html>
    `);
    iframe.contentWindow.document.close();

    // Print and remove the iframe after a short delay
    iframe.contentWindow.print();

    // The timeout ensures the print dialog has been initiated before removing the iframe
    setTimeout(() => {
        document.body.removeChild(iframe);
    }, 100);

    return true;
};

// const API_URL = 'http://localhost:5000/api/v1';  // test
// const API_URL= axios.create({ 
  // baseURL:  //`${window.location.origin}/api/v1` 
//});

// ... (Your DraftReceipt component remains unchanged)
const DraftReceipt = ({ draft, user }) => {
    if (!draft) return null;

    const totalAmount = draft.items.reduce((acc, item) => acc + item.price * item.quantity, 0);

    // Thermal Receipt Style: Small font, centered, 300px max width
    const receiptStyle = {
        maxWidth: '300px',
        margin: '0 auto',
        padding: '10px',
        fontSize: '10px', // Smaller font for thermal receipt feel
        fontFamily: 'monospace, "Courier New"',
        lineHeight: '1.4',
        color: '#000',
        backgroundColor: '#fff',
    };

    return (
        // Note: The print mechanism relies on the parent div having the correct ID
        <div style={receiptStyle}>
            <div className="text-center mb-2">
                <h6 className="fw-bold m-0" style={{ fontSize: '12px' }}>Wake up resto</h6>
                <p className="m-0">Avenue de la Bierre</p>
                <p className="m-0">Tel: (243) 999-888-777</p>
                <p className="mt-1 fw-bold">DRAFT BILL</p>
            </div>

            <hr style={{ border: '1px dashed #000', margin: '5px 0' }} />

            <div className="d-flex justify-content-around mb-1">
                <p className="m-0">Bill ID: {draft._id?.slice(-8)}</p>
                <p className="m-0">Date: {new Date(draft.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="d-flex justify-content-around mb-2">
                {/* ⭐ FIX: Changed draft.waiterId to draft.waiter */}
                <p className="m-0">Served By: {draft.waiter?.name || user?.name || 'Cashier'}</p>
                <p className="m-0">Time: {new Date(draft.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>

            <hr style={{ border: '1px dashed #000', margin: '5px 0' }} />

            {/* Customer Details */}
            <div className="mb-2">
                <p className="m-0 fw-bold">Customer: {draft.customer?.name || 'Walk-In Customer'}</p>
                {draft.customer?.phone && <p className="m-0">Phone: {draft.customer.phone}</p>}
            </div>

            <hr style={{ border: '1px dashed #000', margin: '5px 0' }} />

            {/* Items Table */}
            <Table size="sm" className="mb-2" style={{ fontSize: '10px' }}>
                <thead style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                    <tr>
                        <th className="text-start" style={{ padding: '2px 0' }}>DESCRIPTION</th>
                        <th className="text-center" style={{ padding: '2px 0' }}>QTY</th>
                        <th className="text-end" style={{ padding: '2px 0' }}>AMOUNT</th>
                    </tr>
                </thead>
                <tbody>
                    {draft.items.map((item, index) => (
                        <tr key={index}>
                            <td className="text-start">{item.name}</td>
                            <td className="text-center">{item.quantity}</td>
                            <td className="text-end">{(item.price * item.quantity).toFixed(0)}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <hr style={{ border: '1px dashed #000', margin: '5px 0' }} />

            {/* Totals Section */}
            <div className="d-flex center">
                <p className="m-0 fw-bold">SUBTOTAL:</p>
                <p className="m-0 fw-bold">${totalAmount.toFixed(0)}</p>
            </div>
            {/* <div className="d-flex justify-content-between">
                <p className="m-0">TAX (0% assumed):</p>
                <p className="m-0">$0.00</p>
            </div> */}

            <div className="d-flex center mt-1">
                <h6 className="m-0 fw-bolder" style={{ fontSize: '12px' }}>TOTAL (DRAFT):</h6>
                <h6 className="m-0 fw-bolder" style={{ fontSize: '12px' }}>${totalAmount.toFixed(0)}</h6>
            </div>

            <hr style={{ border: '1px dashed #000', margin: '5px 0' }} />

            <div className="text-center mt-3 mb-3">
                <p className="m-0 fw-bold">Thank you for drafting with us!</p>
                <p style={{ margin: '0', fontSize: '10px', color: 'black', fontWeight: "bold" }}>
                    Powered by www.auctux.com POS v1.0
                </p>
            </div>
            <hr />
        </div>
    );
};


const Drafts = ({ userId, user }) => {
    const [drafts, setDrafts] = useState([]);
    const [allUsers, setAllUsers] = useState([]); // NEW: Store all users with 'waiter' role
    const [selectedWaiterId, setSelectedWaiterId] = useState('ALL'); // NEW: Filter state
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null); // Added success state
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDraftIds, setSelectedDraftIds] = useState([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [draftToDelete, setDraftToDelete] = useState(null);
    const [draftToPrint, setDraftToPrint] = useState(null);
    const navigate = useNavigate();

    // Determine if the current user is a manager or admin
    const isAdminOrManager = user?.role === 'manager' || user?.role === 'admin';

    // --- NEW: Fetch Waiter Users ---
    const fetchWaiters = useCallback(async () => {
        if (!isAdminOrManager) return; // Only load for managers/admins

        try {
            const token = localStorage.getItem('token');
            // Assuming a dedicated endpoint for users/waiters or filtering all users
            const response = await axios.get(`${API_URL}/users?role=waiter`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Add a synthetic 'ALL' option for filtering
            setAllUsers([{ _id: 'ALL', name: 'Tous', draftCount: 0 }, ...response.data.users]);
        } catch (err) {
            console.error('Failed to fetch waiters:', err);
            setError('Failed to load user list for filtering.');
        }
    }, [isAdminOrManager]);


    // The fetchDrafts logic is now wrapped in useCallback for stability
const fetchDrafts = useCallback(async () => {
    if (!userId) {
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    setError(null);
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/bills/drafts`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const allDrafts = response.data.drafts || [];

        // FILTRAGE CONDITIONNEL SELON LE RÔLE
        const trueDrafts = allDrafts.filter(draft => {
            // On ne garde que les brouillons actifs
            if (draft.status !== 'draft') return false;

            const isBuffetDraft = 
                draft.waiter?.role === 'buffet' || 
                draft.draftName?.toLowerCase().includes('buffet');

            if (user?.role === 'buffet') {
                // 1. SI JE SUIS BUFFET : Je ne vois QUE les brouillons buffet
                return isBuffetDraft;
            } else {
                // 2. SI JE SUIS AUTRE (Admin/Waiter) : Je vois tout SAUF le buffet
                return !isBuffetDraft;
            }
        });

        setDrafts(trueDrafts);

        // Mise à jour des compteurs pour Admin/Manager
        if (isAdminOrManager && allUsers.length > 0) {
            const draftCounts = trueDrafts.reduce((acc, draft) => {
                const waiterId = draft.waiter?._id || draft.waiter;
                if (waiterId) {
                    acc[waiterId] = (acc[waiterId] || 0) + 1;
                }
                return acc;
            }, {});

            setAllUsers(prevUsers => prevUsers.map(u => ({
                ...u,
                draftCount: draftCounts[u._id] || 0
            })));
        }
    } catch (err) {
        console.error('Failed to fetch drafts:', err);
        setError('Failed to load draft bills.');
    } finally {
        setIsLoading(false);
    }
}, [userId, isAdminOrManager, allUsers.length, user?.role]); // Important d'inclure user.role ici// Depend on fetchDrafts memoized function

    useEffect(() => {
        fetchDrafts();
        if (isAdminOrManager) {
            fetchWaiters();
        }
    }, [fetchDrafts, fetchWaiters, isAdminOrManager]); // Depend on fetchDrafts memoized function

    const handleCheckboxChange = (id) => {
        setSelectedDraftIds(prev =>
            prev.includes(id) ? prev.filter(draftId => draftId !== id) : [...prev, id]
        );
    };

    const handleEditDraft = (draft) => {
        navigate(`/pos?draftId=${draft._id}`);
    };


    const handlePrintDraft = (draft) => {
        // 1. Set the draft data to the state
        setDraftToPrint(draft);

        // 2. Wait for the component to render (next tick)
        setTimeout(() => {
            // Trigger the generic print function for the draft ID
            const printed = printContent('print-draft-receipt-content');

            // 3. Clear the state after a slight delay
            // This prevents the receipt from flashing on the screen after printing is done/canceled
            if (printed) {
                setTimeout(() => setDraftToPrint(null), 100);
            } else {
                setDraftToPrint(null); // Clear immediately on error
            }
        }, 0);
    };

    const handleDeleteDraft = async () => {
        if (!draftToDelete) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/bills/drafts/${draftToDelete._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Update UI
            setDrafts(prev => prev.filter(d => d._id !== draftToDelete._id));
            setSelectedDraftIds(prev => prev.filter(id => id !== draftToDelete._id));
            setShowDeleteConfirm(false);
            setDraftToDelete(null);
            setSuccessMessage(`Brouillon ${draftToDelete._id.slice(-6)} supprimé avec succès.`);
        } catch (err) {
            console.error('Failed to delete draft:', err);
            setError('Failed to delete draft bill.');
        }
    };

    /**
     * @description Merges selected drafts into one single new draft and deletes the originals.
     */
    const handleMergeDrafts = async () => {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        if (selectedDraftIds.length < 2) {
            setError("Veuillez sélectionner au moins deux brouillons à fusionner.");
            setIsLoading(false);
            return;
        }

        const selectedDrafts = drafts.filter(d => selectedDraftIds.includes(d._id));
        const firstDraft = selectedDrafts[0];

        // 1. Validation Client: All must share the same customer ID or be null (walk-in)
        const firstCustomerId = firstDraft.customer?._id || null;
        const differentCustomerDraft = selectedDrafts.find(draft =>
            (draft.customer?._id || null) !== firstCustomerId
        );

        if (differentCustomerDraft) {
            setError("Erreur: Seuls les brouillons appartenant au **même client** peuvent être fusionnés.");
            setIsLoading(false);
            return;
        }

        // 2. Logique de fusion du panier et construction des données
        const mergedCustomerId = firstCustomerId;
        const mergedWaiterId = firstDraft.waiter?._id || null;
        const draftName = `Brouillon Fusionné - ${new Date().toLocaleTimeString()}`;

        const mergedCart = {};

        selectedDrafts.forEach(draft => {
            draft.items.forEach(item => {
                const itemQuantity = item.quantity || 0;
                // Use the unit price from the item object (item.price)
                const itemUnitPrice = item.price || 0; 
                const productId = (item.product._id || item.product.id || item.product).toString();

                if (mergedCart[productId]) {
                    mergedCart[productId].quantity += itemQuantity;
                } else {
                    mergedCart[productId] = {
                        product: productId,
                        name: item.name,
                        price: itemUnitPrice, 
                        quantity: itemQuantity,
                    };
                }
            });
        });

        // Final payload structure for the new draft (ready for API consumption)
        const finalMergedItems = Object.values(mergedCart).map(item => ({
            product: item.product,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
        }));
        
        const mergedTotal = finalMergedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        
        if (finalMergedItems.length === 0) {
            setError("Aucun article n'a pu être fusionné.");
            setIsLoading(false);
            return;
        }

        const token = localStorage.getItem('token');

        try {
            // STEP 3: Create the New Merged Draft (POST to existing API endpoint)
            const newDraftData = {
                items: finalMergedItems,
                customer: mergedCustomerId,
                totalAmount: mergedTotal,
                draftName: draftName,
                waiter: mergedWaiterId,
                mergedFrom: selectedDraftIds, // Optional audit trail
            };
            
            const newDraftResponse = await axios.post(`${API_URL}/bills/drafts`, newDraftData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // STEP 4: Delete the Original Drafts (DELETE to existing API endpoint)
            // Use Promise.all to delete all old drafts concurrently for speed
            const deletePromises = selectedDraftIds.map(id =>
                axios.delete(`${API_URL}/bills/drafts/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            );

            await Promise.all(deletePromises);

            // STEP 5: Success & UI Update
            const newDraftId = newDraftResponse.data.draftBill._id.slice(-6);
            setSuccessMessage(`Fusion réussie! Les ${selectedDraftIds.length} brouillons ont été remplacés par le nouveau brouillon ID: ${newDraftId}`);
            setSelectedDraftIds([]); 
            
            // Re-fetch the entire draft list to display the new draft and remove the old ones
            await fetchDrafts();

        } catch (err) {
            // Consolidated error handling
            let msg = err.response?.data?.msg || err.message;
            if (msg.includes('delete') || msg.includes('DELETE')) {
                // Creation succeeded, but deletion failed
                msg = "Erreur de suppression après la création. Le nouveau brouillon a été créé, mais les originaux pourraient exister.";
            } else if (msg.includes('post') || msg.includes('POST')) {
                // Creation failed
                msg = "Échec de la création du brouillon fusionné.";
            }
            setError("Échec de la fusion: " + msg);
        } finally {
            setIsLoading(false);
        }
    };


    const filteredDrafts = useMemo(() => {
        const lowerCaseSearch = searchTerm.toLowerCase();

        // 1. Filter by Waiter
        const waiterFiltered = selectedWaiterId === 'ALL'
            ? drafts
            // ⭐ FIX: Use 'draft.waiter'
            : drafts.filter(draft => draft.waiter?._id === selectedWaiterId);

        // 2. Filter by Search Term
        return waiterFiltered.filter(draft =>
            draft._id.toLowerCase().includes(lowerCaseSearch) ||
            draft.customer?.name?.toLowerCase().includes(lowerCaseSearch) ||
            draft.customer?.phone?.includes(searchTerm) ||
            // ⭐ FIX: Use 'draft.waiter'
            draft.waiter?.name?.toLowerCase().includes(lowerCaseSearch) ||
            draft.draftName?.toLowerCase().includes(lowerCaseSearch) // Search by draft name too
        );
    }, [drafts, searchTerm, selectedWaiterId]);


    if (isLoading) {
        return <Container className="text-center mt-5"><Spinner animation="border" /></Container>;
    }

    return (
        <>
            <Container className="my-5">
                {/* 💡 CHANGE: Title with strong icon and text color */}
                <h2 className="mb-4 d-flex align-items-center fw-light">
                    <Layers size={32} className="me-3 text-primary" /> **Gestion des Brouillons** (Draft Bills)
                </h2>

                {/* 💡 CHANGE: Alert style aligned with dashboard success/error */}
                {(error || successMessage) && (
                    <Alert variant={error ? 'danger' : 'success'} onClose={() => { setError(null); setSuccessMessage(null); }} dismissible className="d-flex align-items-center mb-4 shadow-sm">
                        {error ? <X size={20} className="me-2" /> : <CheckCircle size={20} className="me-2" />}
                        {error || successMessage}
                    </Alert>
                )}


                {/* 💡 CHANGE: Main Card uses card-modern for the lifted, dashboard look */}
                <Card className="shadow-xl card-modern border-0">
                    <Card.Header className="bg-light p-3 border-bottom-0">
                        <h5 className="mb-2 fw-bold text-secondary">Filtrer:</h5>

                        {/* Waiter Filter Buttons (Modernized) */}
                        {isAdminOrManager && allUsers.length > 1 && (
                            <div className='d-flex flex-wrap gap-2'>
                                {allUsers.map(user => (
                                    <Button
                                        key={user._id}
                                        variant={selectedWaiterId === user._id ? 'primary' : 'outline-primary'}
                                        onClick={() => setSelectedWaiterId(user._id)}
                                        // 💡 CHANGE: Apply action class for animation
                                        className='d-flex align-items-center fw-medium btn-pos-action'
                                        size='lg'
                                    >
                                        <User size={16} className='me-1' />
                                        {user.name}
                                        {user.draftCount > 0 &&
                                            <Badge
                                                bg={selectedWaiterId === user._id ? 'light' : 'primary'}
                                                text={selectedWaiterId === user._id ? 'primary' : 'light'}
                                                className='ms-2 fw-bold'
                                            >
                                                {user.draftCount}
                                            </Badge>
                                        }
                                    </Button>
                                ))}
                            </div>
                        )}
                        {!isAdminOrManager && <p className='text-muted m-0'>Affichage de vos brouillons uniquement.</p>}
                    </Card.Header>

                    <Card.Body className="p-0">
                        <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
                            {/* Search Input Group */}
                            <InputGroup style={{ maxWidth: '350px' }} className='shadow-sm'>
                                <InputGroup.Text><Search size={16} /></InputGroup.Text>
                                <Form.Control
                                    placeholder="Recherche par ID, Client ou Téléphone..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </InputGroup>

                            {/* Action Buttons */}
                            <div className='d-flex align-items-center gap-2'>
                                {/* Merge Button - Distinct color (Info) and animation */}
                                <span style={{background:"blue", color: "white", padding:"5px", borderRadius:"5px"}}>
                                    <Link to='/history' style={{background:"blue", color: "white", padding:"5px", textDecoration:"none"}}> <FaHistory/> Historique</Link>
                                </span>
                                <Button
                                    variant="info"
                                    className="d-flex align-items-center fw-bold btn-pos-action text-white"
                                    onClick={handleMergeDrafts}
                                    disabled={selectedDraftIds.length < 2 || isLoading}
                                >
                                    <Layers size={20} className='me-2' />
                                    Fusionner ({selectedDraftIds.length})
                                </Button>

                                {/* New Draft Button - Success color and animation */}
                                <Button
                                    variant="success"
                                    className="d-flex align-items-center fw-bold btn-pos-action"
                                    onClick={() => navigate('/pos')}
                                >
                                    <Plus size={20} className="me-2" /> Nouveau Brouillon
                                </Button>
                            </div>
                        </div>

                        {/* 💡 CHANGE: Table header uses primary color for stronger contrast */}
                        <Table striped hover responsive className="mb-0">
                            <thead className="table-primary text-white">
                                <tr>
                                    <th>
                                        <Form.Check
                                            type="checkbox"
                                        // Add a check/uncheck all logic here if needed
                                        />
                                    </th>
                                    <th>Nom / ID Brouillon</th>
                                    <th>Client</th>
                                    <th className='text-center'>Articles</th>
                                    <th className='text-end'>Total</th>
                                    <th>Serveur</th>
                                    <th>Créé le</th>
                                    <th className='text-center'>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDrafts.length > 0 ? (
                                    filteredDrafts.map((draft, index) => (
                                        <tr key={draft._id}>
                                            <td>
                                                <Form.Check
                                                    type="checkbox"
                                                    checked={selectedDraftIds.includes(draft._id)}
                                                    onChange={() => handleCheckboxChange(draft._id)}
                                                />
                                            </td>
                                            <td>
                                                <span className='fw-bold text-primary'>{draft.draftName || 'Brouillon Rapide'}</span>
                                                <small className='text-muted d-block'>ID: {draft._id.slice(-6)}</small>
                                            </td>
                                            <td>
                                                {draft.customer ? (
                                                    <Badge pill bg="secondary" className="d-flex align-items-center justify-content-start fw-medium">
                                                        <User size={12} className="me-1" />
                                                        {draft.customer.name}
                                                    </Badge>
                                                ) : (
                                                    <Badge pill bg="secondary" className='fw-medium'>Client de Passage</Badge>
                                                )}
                                            </td>
                                            <td className='text-center'>{draft.items.length}</td>
                                            <td className='fw-bolder fs-6 text-end ' style={{width:"150px"}}>{(draft.items.reduce((acc, item) => acc + item.price * item.quantity, 0)).toFixed(0)} Fc</td>
                                            <td>{draft.waiter?.name || 'Inconnu'}</td>
                                            <td>{new Date(draft.createdAt).toLocaleString()}</td>
                                            <td className='text-nowrap text-center'>
                                                {/* Action Buttons with defined variants and animation class */}
                                                <Button variant="outline-primary" size="sm" className="me-2 btn-pos-action" onClick={() => handleEditDraft(draft)} title="Éditer le Brouillon">
                                                    <Pencil size={16} />
                                                </Button>
                                                <Button variant="outline-secondary" size="sm" className="me-2 btn-pos-action" onClick={() => handlePrintDraft(draft)} title="Imprimer le Brouillon">
                                                    <Printer size={16} />
                                                </Button>
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    className="btn-pos-action"
                                                    onClick={() => { setDraftToDelete(draft); setShowDeleteConfirm(true); }}
                                                    title="Supprimer le Brouillon"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="text-center py-5">
                                            <Alert variant="info" className="m-0 border-0 d-flex align-items-center justify-content-center">
                                                <Search size={20} className='me-2' />
                                                Aucun brouillon trouvé correspondant aux filtres/recherche.
                                            </Alert>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </Card.Body>

                    {/* 💡 CHANGE: Footer style */}
                    <Card.Footer className="bg-light text-muted p-3 fw-medium">
                        Brouillons Affichés: **{filteredDrafts.length}** / Total: **{drafts.length}**
                    </Card.Footer>
                </Card>

                {/* Delete Confirmation Modal (Style update for better visual) */}
                <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)} backdrop="static" keyboard={false} centered>
                    <Modal.Header closeButton className='bg-danger text-white'>
                        <Modal.Title><Trash2 size={20} className='me-2' /> **Confirmer la Suppression**</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className='py-4'>
                        Êtes-vous sûr de vouloir supprimer définitivement le brouillon **ID {draftToDelete?._id?.slice(-6)}**? Cette action est **irréversible**.
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                            Annuler
                        </Button>
                        <Button variant="danger" onClick={handleDeleteDraft} className='fw-bold'>
                            <Trash2 size={18} className='me-1' /> Supprimer Définitivement
                        </Button>
                    </Modal.Footer>
                </Modal>
            </Container>

            {/* Hidden Receipt Component - visible only during print (No UI change needed here) */}
            <div className="receipt-wrapper screen-hide" id="print-draft-receipt-content">
                {draftToPrint && (
                    <DraftReceipt
                        draft={draftToPrint}
                        user={user}
                    />
                )}
            </div>
        </>
    );
};

export default Drafts;