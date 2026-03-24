import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Button, Table, Badge, Dropdown, Modal, Form, Alert, Spinner } from 'react-bootstrap';
// ** Import Toasting Library **
import toast, { Toaster } from 'react-hot-toast';
// Lucide Icons for modern UI
import { Users, PlusCircle, RotateCcw, Trash2, UserCheck, BarChart3, XCircle, Key, Edit3, CheckCircle2 } from 'lucide-react';
import API_URL from '../api/api'
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// --- Configuration Constants ---
// const API_URL = 'http://localhost:5000/api/v1'; 
// const API_URL = 'https://posbackend-usko.onrender.com/api/v1';

const ROLES = ['waiter', 'cashier', 'manager', 'admin'];
const ROLE_BADGE_MAP = {
  admin: 'danger',
  manager: 'warning',
  waiter: 'info',
  cashier: 'secondary', 
};

// --- Component 1: Header and Action Buttons ---
const UserManagementHeader = ({ userRole, onShowModal, onResetPoints }) => (
  <div className="d-flex justify-content-between align-items-center mb-4">
    <h2 className="d-flex align-items-center fw-light mb-0">
      <Users size={32} className="me-3 text-primary" /> **Gestion du Personnel**
    </h2>

    <div className="d-flex align-items-center">
      <Button variant="success" onClick={onShowModal} className="d-flex align-items-center me-3 shadow-sm">
        <PlusCircle size={20} className="me-2" /> Créer Employé
      </Button>
      {/* Assuming onResetPoints exists for a waiter point system */}
      {/* <Button variant="secondary" onClick={onResetPoints} className="d-flex align-items-center shadow-sm">
        <RotateCcw size={20} className="me-2" /> Réinitialiser Points
      </Button> */}
    </div>
  </div>
);

// --- Component 2: Create User Modal (Updated for PIN) ---
// ALERT/ERROR PROP is KEPT but now only used for MODAL INTERNAL ERRORS (like 4-digit PIN)
const CreateUserModal = ({ show, handleClose, handleCreateUser, roles, error, isUpdating }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState(''); 
  const [role, setRole] = useState('waiter');

  const isPinRequired = role === 'waiter' || role === 'cashier';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isPinRequired && pin && pin.length !== 4) {
      // Simple client-side validation
      toast.error('Le PIN doit avoir 4 chiffres.');
      return; 
    }
    handleCreateUser({ name, email, password, role, pin }); 
  };

  useEffect(() => {
    if (!show) {
      // Reset form on close
      setName('');
      setEmail('');
      setPassword('');
      setPin(''); 
      setRole('waiter');
    }
  }, [show]);

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title className='d-flex align-items-center'><PlusCircle size={24} className='me-2'/> Créer un nouvel employé</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* We keep the error Alert for submission errors coming from the parent */}
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Nom</Form.Label>
            <Form.Control type="text" value={name} onChange={(e) => setName(e.target.value)} required disabled={isUpdating} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isUpdating} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Rôle</Form.Label>
            <Form.Select value={role} onChange={(e) => setRole(e.target.value)} disabled={isUpdating}>
              {roles.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Mot de passe</Form.Label>
            <Form.Control type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isUpdating} />
          </Form.Group>
          
          {/* NEW: PIN Field for Waiter/Cashier */}
          {isPinRequired && (
            <Form.Group className="mb-3">
              <Form.Label className='d-flex align-items-center'>
                <Key size={16} className='me-1 text-success'/> PIN (4 Chiffres, optionnel, sera généré si vide)
              </Form.Label>
              <Form.Control 
                type="number" 
                placeholder="Ex: 1234" 
                value={pin} 
                onChange={(e) => {
                  const value = e.target.value.slice(0, 4);
                  setPin(value);
                }}
                maxLength={4} 
                isInvalid={pin.length > 0 && pin.length !== 4}
                disabled={isUpdating}
              />
              <Form.Control.Feedback type="invalid">Le PIN doit avoir 4 chiffres.</Form.Control.Feedback>
            </Form.Group>
          )}

          <Button variant="primary" type="submit" className='w-100 mt-3' disabled={isUpdating}>
            {isUpdating ? <><Spinner animation="border" size="sm" className="me-2" /> Création...</> : 'Créer'}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

// --- Component 3: Edit User Modal (Updated for PIN) ---
// ALERT/ERROR PROP is KEPT but now only used for MODAL INTERNAL ERRORS
const EditUserModal = ({ show, handleClose, user, handleUpdateDetails, handleUpdateRole, roles, error, isUpdating }) => {
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [role, setRole] = useState(user?.role || 'waiter');
    const [pin, setPin] = useState(''); 

    const isPinFieldVisible = role === 'waiter' || role === 'cashier';

    useEffect(() => {
        if (user) {
            setName(user.name);
            setEmail(user.email);
            setRole(user.role);
            setPin(''); 
        }
    }, [user, show]);

    const handleDetailsSubmit = (e) => {
        e.preventDefault();
        if (pin.length > 0 && pin.length !== 4) {
             toast.error('Le nouveau PIN doit avoir 4 chiffres.');
             return;
        }

        // Only update if changes are made to name or email, or if a PIN is provided
        if (name !== user.name || email !== user.email || pin.length > 0) {
            handleUpdateDetails(user._id, { name, email, pin: pin.length === 4 ? pin : undefined });
        } else {
             toast.error('Aucune modification détectée dans les détails.');
        }
    };
    
    const handleRoleSubmit = () => {
        if (role !== user.role) {
            handleUpdateRole(user._id, { role });
        } else {
             toast.error('Le rôle est déjà défini sur ' + role + '.');
        }
    };


    return (
        <Modal show={show} onHide={handleClose} centered>
            <Modal.Header closeButton>
                <Modal.Title className='d-flex align-items-center'><Edit3 size={24} className='me-2'/> Modifier {user?.name}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                
                {/* Section: Update Details (Name, Email, PIN) */}
                <h5 className="mb-3 text-primary">Détails Personnels</h5>
                <Form onSubmit={handleDetailsSubmit}>
                    <Form.Group className="mb-3">
                        <Form.Label>Nom</Form.Label>
                        <Form.Control type="text" value={name} onChange={(e) => setName(e.target.value)} required disabled={isUpdating} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Email</Form.Label>
                        <Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isUpdating} />
                    </Form.Group>

                    {/* NEW: PIN Update Field */}
                    {isPinFieldVisible && (
                        <Form.Group className="mb-3">
                            <Form.Label className='d-flex align-items-center'>
                                <Key size={16} className='me-1 text-success'/> Nouveau PIN (4 Chiffres, Laissez vide pour ne pas changer)
                            </Form.Label>
                            <Form.Control 
                                type="number" 
                                placeholder="____" 
                                value={pin} 
                                onChange={(e) => {
                                    const value = e.target.value.slice(0, 4);
                                    setPin(value);
                                }}
                                maxLength={4} 
                                isInvalid={pin.length > 0 && pin.length !== 4}
                                disabled={isUpdating}
                            />
                            <Form.Control.Feedback type="invalid">Le PIN doit avoir 4 chiffres.</Form.Control.Feedback>
                        </Form.Group>
                    )}

                    <Button variant="info" type="submit" className='w-100 mt-3' disabled={isUpdating || (pin.length > 0 && pin.length !== 4) }>
                        {isUpdating ? <><Spinner animation="border" size="sm" className="me-2" /> Sauvegarde...</> : 'Sauvegarder les Détails'}
                    </Button>
                </Form>
                
                {/* Section: Update Role */}
                <hr className='my-4'/>
                <h5 className="mb-3 text-primary">Changer le Rôle</h5>
                <Form onSubmit={(e) => { e.preventDefault(); handleRoleSubmit(); }}>
                    <Form.Group className="mb-3">
                        <Form.Label>Rôle Actuel</Form.Label>
                        <Form.Select 
                            value={role} 
                            onChange={(e) => setRole(e.target.value)} 
                            disabled={isUpdating || user?.role === 'admin'}
                        >
                            {roles.filter(r => r !== 'admin').map(r => 
                                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                            )}
                        </Form.Select>
                    </Form.Group>
                    <Button 
                        variant="warning" 
                        type="submit" 
                        className='w-100 mt-3' 
                        disabled={isUpdating || role === user.role || user?.role === 'admin'}
                    >
                        Changer le Rôle
                    </Button>
                </Form>

            </Modal.Body>
        </Modal>
    );
}

// --- Main Component ---
const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  // We keep error for modal-specific errors only, but use toast for general feedback
  const [error, setError] = useState(null); 
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/users`);
      setUsers(response.data.users);
      setError(null);
    } catch (err) {
      // ** Use toast for fetch error **
      toast.error(err.response?.data?.msg || 'Échec du chargement des utilisateurs.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (userData) => {
    setIsUpdating(true);
    setError(null);
    try {
      const response = await axios.post(`${API_URL}/users`, userData);
      
      // ** Replace alert() with toast.success() **
      const successMessage = `Employé ${userData.name} créé avec succès.`;

      // If a PIN was auto-generated, show it to the manager via toast
      if (response.data.generatedPin) {
        toast((t) => (
          <div className='d-flex flex-column'>
            <span className='fw-bold'>Création Réussie!</span>
            <span>{successMessage}</span>
            <span className='text-danger mt-1'>
                PIN Généré pour {userData.name}: <span className='fw-bold fs-5'>{response.data.generatedPin}</span>
            </span>
            <button className='btn btn-sm btn-outline-primary mt-2' onClick={() => toast.dismiss(t.id)}>Fermer</button>
          </div>
        ), { duration: 10000 }); // Longer duration for important info
      } else {
        toast.success(successMessage);
      }
      
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      // ** Use toast.error() for creation failure and set modal error **
      const errorMessage = err.response?.data?.msg || 'Échec de la création de l\'employé.';
      setError(errorMessage); 
      toast.error(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateDetails = async (id, updates) => {
    setIsUpdating(true);
    setError(null);
    try {
        await axios.patch(`${API_URL}/users/${id}/details`, updates);
        // ** Use toast.success() for update success **
        toast.success('Détails de l\'employé mis à jour.');
        setShowEditModal(false);
        fetchUsers();
    } catch (err) {
        // ** Use toast.error() for update failure and set modal error **
        const errorMessage = err.response?.data?.msg || 'Échec de la mise à jour des détails.';
        setError(errorMessage); 
        toast.error(errorMessage);
    } finally {
        setIsUpdating(false);
    }
  };


  const handleUpdateRole = async (id, { role }) => {
    setIsUpdating(true);
    setError(null);
    try {
        await axios.patch(`${API_URL}/users/${id}/role`, { role });
        // ** Use toast.success() for role update success **
        toast.success(`Rôle de l'employé mis à jour à ${role}.`);
        setShowEditModal(false);
        fetchUsers();
    } catch (err) {
        // ** Use toast.error() for role update failure and set modal error **
        const errorMessage = err.response?.data?.msg || 'Échec de la mise à jour du rôle.';
        setError(errorMessage);
        toast.error(errorMessage);
    } finally {
        setIsUpdating(false);
    }
  };
  
  const handleDeleteUser = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur?')) return;
    setIsUpdating(true);
    setError(null);
    try {
        await axios.delete(`${API_URL}/users/${id}`);
        // ** Use toast.success() for delete success **
        toast.success('Utilisateur supprimé avec succès.');
        fetchUsers();
    } catch (err) {
        // ** Use toast.error() for delete failure **
        toast.error(err.response?.data?.msg || 'Échec de la suppression de l\'utilisateur.');
    } finally {
        setIsUpdating(false);
    }
  };

  const handleResetPoints = () => {
    // ** Replace alert() with toast.info() **
    toast('Points réinitialisés (fonctionnalité non implémentée).', { icon: '📊' });
  };

  if (isLoading) {
    return <Container className="my-5 text-center"><Spinner animation="border" /> Chargement...</Container>;
  }

  const availableRoles = ROLES.filter(r => user.role === 'admin' || r !== 'admin');

  return (
    <Container className="my-5">
      
      {/* 0. Toast Container - IMPORTANT! Add this at the top level of the component */}
      <Toaster position="top-right" reverseOrder={false} />

      {/* 1. Header & Actions */}
      <UserManagementHeader
        userRole={user.role}
        onShowModal={() => {
            setShowModal(true);
            setError(null); // Clear error when opening modal
        }}
        onResetPoints={handleResetPoints}
      />

      {/* 2. Feedback - REMOVED general error alert, using toasts now. Kept Spinner for loading. */}
      {/* The Alert is kept *inside* the modals for form-specific errors */}
      {isUpdating && (
        <div className="text-center mb-3">
          <Spinner animation="border" variant="primary" size="sm" /> 
          {' '}Opération en cours...
        </div>
      )}

      {/* 3. Main Staff Table (assuming UserTable is defined elsewhere) */}
      {users.length > 0 ? (
        <UserTable
          users={users}
          currentUser={user}
          handleDeleteUser={handleDeleteUser}
          onEdit={(u) => {setSelectedUser(u); setShowEditModal(true); setError(null);}} // Clear error on edit
        />
      ) : (
        <Alert variant="info" className="text-center shadow-sm mt-4">
          Aucun employé trouvé.
        </Alert>
      )}

      {/* 4. Create Staff Modal */}
      <CreateUserModal
        show={showModal}
        handleClose={() => setShowModal(false)}
        handleCreateUser={handleCreateUser}
        roles={availableRoles}
        // Error prop is kept to display server-side errors inside the modal body
        error={error} 
        isUpdating={isUpdating}
      />
      
      {/* 5. Edit Staff Modal */}
      {selectedUser && (
        <EditUserModal
          show={showEditModal}
          handleClose={() => {setShowEditModal(false); setSelectedUser(null);}}
          user={selectedUser}
          handleUpdateDetails={handleUpdateDetails}
          handleUpdateRole={handleUpdateRole}
          roles={availableRoles}
          // Error prop is kept to display server-side errors inside the modal body
          error={error} 
          isUpdating={isUpdating}
        />
      )}
    </Container>
  );
};


// DUMMY/EXISTING UserTable to avoid breaking the file (No changes needed here)
const UserTable = ({ users, currentUser, handleDeleteUser, onEdit }) => (
    <Table striped bordered hover responsive className="shadow-sm">
        <thead>
            <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th className='text-center'>Points (Mois Actuel)</th>
                <th className='text-center'>Actions</th>
            </tr>
        </thead>
        <tbody>
            {users.map(user => (
                <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td><Badge bg={ROLE_BADGE_MAP[user.role]}>{user.role}</Badge></td>
                    <td className='text-center'>{user.performancePoints}</td>
                    <td className='text-center'>
                        <Button variant="info" size="sm" className="me-2" onClick={() => onEdit(user)}>
                            <Edit3 size={16}/> Modifier
                        </Button>
                        <Button 
                            variant="danger" 
                            size="sm" 
                            onClick={() => handleDeleteUser(user._id)}
                            disabled={user._id === currentUser.userId || user.role === 'admin'}
                        >
                            <Trash2 size={16}/> Supprimer
                        </Button>
                    </td>
                </tr>
            ))}
        </tbody>
    </Table>
);


export default UserManagement;