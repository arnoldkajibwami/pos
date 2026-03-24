import React, { useState, useEffect, useMemo } from 'react';
import {
    Container, Row, Col, Card, Alert, Spinner, Table, Button,
    Modal, Form, Badge, InputGroup
} from 'react-bootstrap';
import axios from 'axios';
import { 
    Package, Pencil, PlusCircle, ShoppingCart, Trash2, 
    Warehouse, AlertTriangle, Upload, X, CheckCircle 
} from 'lucide-react';

import API_URL from '../api/api';

const formatCurrency = (amount) => 
    new Intl.NumberFormat('fr-CD', { style: 'currency', currency: 'CDF' })
        .format(amount)
        .replace('CDF', 'Fc');

const ProductManagement = () => {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const defaultProductForm = useMemo(() => ({
        _id: null,
        name: '',
        price: 0,
        buyPrice: 0,
        category: 'Food',
        image: '',
        imageFile: null,
        stockBar: 0,
        stockGeneral: 0,
        isStockTracked: true,
        isAvailable: true,
        lowStockThreshold: 5,
    }), []);

    const [productForm, setProductForm] = useState(defaultProductForm);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setIsLoading(true);
        try {
            const { data } = await axios.get(`${API_URL}/products`);
            setProducts(data.products);
            setError(null);
        } catch (err) {
            setError('Incapable de charger la liste des produits.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (product = null) => {
        if (product) {
            setIsEditing(true);
            setProductForm({ ...product, imageFile: null });
        } else {
            setIsEditing(false);
            setProductForm(defaultProductForm);
        }
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Voulez-vous vraiment supprimer ce produit ?')) {
            try {
                await axios.delete(`${API_URL}/products/${id}`);
                setProducts(products.filter(p => p._id !== id));
            } catch (err) {
                setError('Erreur lors de la suppression.');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const formData = new FormData();
        
        Object.keys(productForm).forEach(key => {
            if (key === 'imageFile' && productForm[key]) {
                formData.append('image', productForm[key]);
            } else if (key !== 'imageFile') {
                formData.append(key, productForm[key]);
            }
        });

        try {
            const config = { headers: { 'Content-Type': 'multipart/form-data' } };
            if (isEditing) {
                await axios.patch(`${API_URL}/products/${productForm._id}`, formData, config);
            } else {
                await axios.post(`${API_URL}/products`, formData, config);
            }
            setShowModal(false);
            fetchProducts();
        } catch (err) {
            setError(err.response?.data?.msg || "Erreur d'enregistrement.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Container fluid className="py-4 px-lg-5">
            {/* --- Header Section --- */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                <div>
                    <h2 className="fw-bold text-dark mb-1">Catalogue Produits</h2>
                    <p className="text-muted mb-0">Gérez votre inventaire, vos prix et vos alertes de stock.</p>
                </div>
                <Button 
                    variant="primary" 
                    className="d-flex align-items-center justify-content-center px-4 py-2 shadow-sm rounded-pill fw-bold"
                    onClick={() => handleOpenModal()}
                >
                    <PlusCircle size={20} className="me-2" /> Nouveau Produit
                </Button>
            </div>

            {/* --- Status Messaging --- */}
            {error && <Alert variant="danger" onClose={() => setError(null)} dismissible className="border-0 shadow-sm">{error}</Alert>}

            {/* --- Main Content Card --- */}
            <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                <Card.Body className="p-0">
                    {isLoading ? (
                        <div className="py-5 text-center">
                            <Spinner animation="border" variant="primary" />
                            <p className="mt-3 text-muted">Synchronisation de l'inventaire...</p>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="py-5 text-center">
                            <Package size={48} className="text-muted mb-3 opacity-20" />
                            <h5 className="text-muted">Aucun produit en rayon</h5>
                            <Button variant="link" onClick={() => handleOpenModal()}>Créer votre premier article</Button>
                        </div>
                    ) : (
                        <Table hover responsive className="align-middle mb-0">
                            <thead className="bg-light border-bottom">
                                <tr>
                                    <th className="ps-4 py-3 text-uppercase fs-xs fw-bold text-muted">Produit</th>
                                    <th className="text-center py-3 text-uppercase fs-xs fw-bold text-muted">Prix</th>
                                    <th className="text-center py-3 text-uppercase fs-xs fw-bold text-muted">Stock Bar</th>
                                    <th className="text-center py-3 text-uppercase fs-xs fw-bold text-muted">Stock Dépôt</th>
                                    <th className="text-center py-3 text-uppercase fs-xs fw-bold text-muted">Statut</th>
                                    <th className="pe-4 text-end py-3 text-uppercase fs-xs fw-bold text-muted">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product) => {
                                    const isLow = product.isStockTracked && (product.stockBar <= product.lowStockThreshold);
                                    return (
                                        <tr key={product._id}>
                                            <td className="ps-4 py-3">
                                                <div className="d-flex align-items-center">
                                                    <div className="me-3 position-relative">
                                                        <img 
                                                            src={product.image || 'https://via.placeholder.com/50'} 
                                                            alt={product.name}
                                                            className="rounded-3 border shadow-xs"
                                                            style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <div className="fw-bold text-dark">{product.name}</div>
                                                        <small className="text-muted">{product.category}</small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <div className="fw-bold">{formatCurrency(product.price)}</div>
                                                <small className="text-muted">Achat: {formatCurrency(product.buyPrice)}</small>
                                            </td>
                                            <td className="text-center">
                                                <Badge bg={isLow ? 'danger' : 'light'} text={isLow ? 'white' : 'dark'} className="px-3 py-2 rounded-pill border">
                                                    <ShoppingCart size={14} className="me-1" /> {product.stockBar}
                                                </Badge>
                                            </td>
                                            <td className="text-center">
                                                <Badge bg="light" text="dark" className="px-3 py-2 rounded-pill border">
                                                    <Warehouse size={14} className="me-1" /> {product.stockGeneral}
                                                </Badge>
                                            </td>
                                            <td className="text-center">
                                                {product.isAvailable ? (
                                                    <span className="text-success d-flex align-items-center justify-content-center">
                                                        <CheckCircle size={16} className="me-1" /> Actif
                                                    </span>
                                                ) : (
                                                    <span className="text-muted d-flex align-items-center justify-content-center">
                                                        <X size={16} className="me-1" /> Inactif
                                                    </span>
                                                )}
                                            </td>
                                            <td className="pe-4 text-end">
                                                <Button variant="link" className="text-primary p-2" onClick={() => handleOpenModal(product)}>
                                                    <Pencil size={18} />
                                                </Button>
                                                <Button variant="link" className="text-danger p-2" onClick={() => handleDelete(product._id)}>
                                                    <Trash2 size={18} />
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>

            {/* --- Modern Modal --- */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
                <Form onSubmit={handleSubmit}>
                    <Modal.Header closeButton className="border-0 pb-0">
                        <Modal.Title className="fw-bold">{isEditing ? 'Éditer le produit' : 'Nouveau produit'}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="pt-4">
                        <Row className="g-3">
                            <Col md={8}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-semibold">Désignation</Form.Label>
                                    <Form.Control 
                                        required 
                                        placeholder="Nom de l'article..." 
                                        value={productForm.name}
                                        onChange={e => setProductForm({...productForm, name: e.target.value})}
                                    />
                                </Form.Group>
                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="fw-semibold">Prix de vente</Form.Label>
                                            <InputGroup>
                                                <Form.Control type="number" step="0.01" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} />
                                                <InputGroup.Text>Fc</InputGroup.Text>
                                            </InputGroup>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="fw-semibold">Prix d'achat</Form.Label>
                                            <InputGroup>
                                                <Form.Control type="number" step="0.01" value={productForm.buyPrice} onChange={e => setProductForm({...productForm, buyPrice: e.target.value})} />
                                                <InputGroup.Text>Fc</InputGroup.Text>
                                            </InputGroup>
                                        </Form.Group>
                                    </Col>
                                </Row>
                            </Col>
                            <Col md={4} className="text-center border-start">
                                <Form.Label className="fw-semibold">Image</Form.Label>
                                <div 
                                    className="bg-light rounded-4 d-flex align-items-center justify-content-center mb-2 overflow-hidden border" 
                                    style={{ height: '140px', cursor: 'pointer', position: 'relative' }}
                                    onClick={() => document.getElementById('imageUpload').click()}
                                >
                                    {productForm.image || productForm.imageFile ? (
                                        <img 
                                            src={productForm.imageFile ? URL.createObjectURL(productForm.imageFile) : productForm.image} 
                                            className="w-100 h-100 object-fit-cover" 
                                            alt="Preview"
                                        />
                                    ) : (
                                        <Upload className="text-muted" />
                                    )}
                                </div>
                                <Form.Control 
                                    id="imageUpload" 
                                    type="file" 
                                    hidden 
                                    onChange={e => setProductForm({...productForm, imageFile: e.target.files[0]})} 
                                />
                                <small className="text-muted">Cliquez pour changer</small>
                            </Col>
                        </Row>
                        <hr className="my-4 opacity-10" />
                        <Row>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-semibold">Stock Bar</Form.Label>
                                    <Form.Control type="number" value={productForm.stockBar} onChange={e => setProductForm({...productForm, stockBar: e.target.value})} />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-semibold">Stock Dépôt</Form.Label>
                                    <Form.Control type="number" value={productForm.stockGeneral} onChange={e => setProductForm({...productForm, stockGeneral: e.target.value})} />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-semibold text-danger">Seuil d'alerte</Form.Label>
                                    <Form.Control type="number" value={productForm.lowStockThreshold} onChange={e => setProductForm({...productForm, lowStockThreshold: e.target.value})} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <div className="d-flex gap-4 mt-2">
                            <Form.Check type="switch" label="Suivi de stock" checked={productForm.isStockTracked} onChange={e => setProductForm({...productForm, isStockTracked: e.target.checked})} />
                            <Form.Check type="switch" label="Disponible" checked={productForm.isAvailable} onChange={e => setProductForm({...productForm, isAvailable: e.target.checked})} />
                        </div>
                    </Modal.Body>
                    <Modal.Footer className="border-0">
                        <Button variant="light" onClick={() => setShowModal(false)} className="px-4">Annuler</Button>
                        <Button variant="primary" type="submit" disabled={isSaving} className="px-4 shadow-sm">
                            {isSaving ? <Spinner size="sm" /> : 'Confirmer'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default ProductManagement;