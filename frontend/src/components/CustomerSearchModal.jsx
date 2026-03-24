// components/CustomerSearchModal.js

import React, { useState, useEffect, useMemo } from 'react'; // Added useMemo
import { Modal, Button, Form, ListGroup, InputGroup, Spinner, Alert, Badge } from 'react-bootstrap';
import { FaSearch, FaUserCheck, FaUserPlus } from 'react-icons/fa';
import { User, Users } from 'lucide-react'; 
import API_URL from '../api/api'
import axios from 'axios';

// const API_URL = 'http://localhost:5000/api/v1';  // test
// const API_URL= axios.create({ 
  // baseURL:  //`${window.location.origin}/api/v1` 
//});

const CustomerSearchModal = ({ show, handleClose, onCustomerSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  // Use a separate state for the raw data returned by the API
  const [rawSearchResults, setRawSearchResults] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset search state when modal is closed
  useEffect(() => {
    if (!show) {
        setSearchTerm('');
        setRawSearchResults([]);
        setError(null);
    }
  }, [show]);

  // Debounced search: Only searches after a short pause AND when length >= 3
  useEffect(() => {
    if (!show) return;

    if (searchTerm.length < 3) {
      setRawSearchResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const delayDebounceFn = setTimeout(() => {
      searchCustomers(searchTerm);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, show]);

  const searchCustomers = async (query) => {
    setError(null);
    try {
      // Fetch results from the backend (which might be broad, e.g., 'fuzzy' search)
      const response = await axios.get(`${API_URL}/customers?search=${query}`);
      setRawSearchResults(response.data.customers); // Store the raw, unfiltered results
    } catch (err) {
      // TRADUIT: Message d'erreur
      setError('Échec de la recherche de clients.');
      setRawSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };
    
  /**
   * NEW CLIENT-SIDE FILTERING LOGIC
   * Filters the raw results to ensure the name/contact starts with the search term.
   */
  const filteredCustomers = useMemo(() => {
    if (searchTerm.length < 3) return [];

    const lowerCaseSearch = searchTerm.toLowerCase();

    return rawSearchResults.filter(customer => {
        // Check if the search term is at the beginning of the name
        if (customer.name && customer.name.toLowerCase().startsWith(lowerCaseSearch)) {
            return true;
        }
        // Check if the search term is at the beginning of the phone number
        if (customer.phone && customer.phone.toLowerCase().startsWith(lowerCaseSearch)) {
            return true;
        }
        // Check if the search term is at the beginning of the email
        if (customer.email && customer.email.toLowerCase().startsWith(lowerCaseSearch)) {
            return true;
        }
        return false;
    });
  }, [rawSearchResults, searchTerm]);


  const handleSelect = (customer) => {
    onCustomerSelect(customer);
    handleClose();
  };

  const handleSelectWalkIn = () => {
    onCustomerSelect(null);
    handleClose();
  }

  // Determine the content to display in the result area
  const renderContent = () => {
    if (error) {
        return <Alert variant="danger" className='small'>{error}</Alert>;
    }
    
    if (isLoading) {
        return <div className="text-center p-3"><Spinner animation="border" size="sm" className='me-2' /> Chargement...</div>;
    }

    if (searchTerm.length < 3) {
        // TRADUIT: Instruction pour l'utilisateur
        return (
            <Alert variant="info" className="text-center small my-4">
                Veuillez saisir au moins **3 caractères** pour lancer la recherche client.
            </Alert>
        );
    }

    if (filteredCustomers.length === 0) {
        // TRADUIT: Message "aucun client trouvé"
        return (
            <Alert variant="warning" className="text-center small my-4">
                Aucun client trouvé correspondant à "<b>{searchTerm}</b>".
            </Alert>
        );
    }

    // Display search results
    return (
        <ListGroup variant='flush' className='border rounded'>
            {/* Renders the client-side filtered list */}
            {filteredCustomers.map(customer => (
                <ListGroup.Item
                    key={customer._id}
                    action
                    onClick={() => handleSelect(customer)}
                    className="p-3 d-flex justify-content-between align-items-start border-bottom"
                >
                    <div className="flex-grow-1">
                        {/* Customer Name */}
                        <div className='fw-bold mb-1 d-flex align-items-center' style={{ fontSize: '1.1rem' }}>
                            <User size={20} className='me-2 text-primary' />
                            {customer.name}
                        </div>

                        {/* Contact Info (if available) */}
                        {(customer.phone || customer.email) && (
                            <small className='text-muted d-block ms-4'>
                                {customer.phone ? `Tél: ${customer.phone}` : `Email: ${customer.email}`}
                            </small>
                        )}

                        {/* Financial/Status Badges */}
                        <div className='mt-2 ms-4 d-flex flex-wrap gap-2'>
                            {customer.debtBalance > 0 && (
                                <Badge bg="danger" className="py-2 px-3 fw-bold">
                                    {/* TRADUIT: Détails de la dette */}
                                    Dette: ${customer.debtBalance.toFixed(0)}
                                </Badge>
                            )}
                            
                            {customer.creditBalance > 0 && (
                                <Badge bg="success" className="py-2 px-3 fw-bold">
                                    {/* TRADUIT: Détails du crédit */}
                                    Crédit: ${customer.creditBalance.toFixed(0)}
                                </Badge>
                            )}

                            {customer.pendingWithdrawals > 0 && (
                                <Badge bg="warning" text="dark" className="py-2 px-3 fw-bold">
                                    {/* TRADUIT: Détails de retrait */}
                                    {customer.pendingWithdrawals} Retrait(s) En Cours
                                </Badge>
                            )}
                        </div>
                    </div>
                    <Button variant='primary' size='sm' className='ms-3 mt-1'>
                        <FaUserCheck className='me-1' /> {/* TRADUIT: Bouton de sélection */}
                        
                    </Button>
                </ListGroup.Item>
            ))}
        </ListGroup>
    );
  }

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton className="bg-primary text-white">
        {/* TRADUIT: Titre */}
        <Modal.Title><Users className='me-2' size={22} /> Sélectionner un Client</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Search Input */}
        <InputGroup className="mb-3 shadow-sm">
          <InputGroup.Text className="bg-light"><FaSearch /></InputGroup.Text>
          <Form.Control
            // TRADUIT: Placeholder
            placeholder="Rechercher par Nom, Téléphone, ou Email (3+ caractères)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>

        {/* Dynamic Content based on search state */}
        <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {renderContent()}
        </div>
        
        {/* Action Buttons */}
        <div className='mt-4 d-grid gap-2'>
            <Button variant="outline-secondary" size="lg" onClick={handleSelectWalkIn}>
                {/* TRADUIT: Bouton invité */}
                Utiliser Client de Passage (Invité)
            </Button>
            <Button variant="link" onClick={() => alert('Redirection vers la gestion des clients pour le formulaire de nouveau client...')} className="text-primary fw-bold">
                <FaUserPlus className='me-1' /> {/* TRADUIT: Bouton nouveau client */}
                + Créer Nouveau Client
            </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default CustomerSearchModal;