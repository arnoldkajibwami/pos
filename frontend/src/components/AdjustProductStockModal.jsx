// components/AdjustProductStockModal.jsx

import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Row, Col } from 'react-bootstrap';
import { FaEdit, FaPlus, FaMinus } from 'react-icons/fa';
import API_URL from '../api/api'
import axios from 'axios';

// const API_URL = 'http://localhost:5000/api/v1';  // test
const API_URL= axios.create({ 
  baseURL: `${window.location.origin}/api/v1`
});

const AdjustProductStockModal = ({ show, handleClose, product, refreshData }) => {
    const [adjustmentType, setAdjustmentType] = useState('add'); // 'add' or 'subtract'
    const [stockLocation, setStockLocation] = useState('stockGeneral'); // 'stockBar' or 'stockGeneral'
    const [quantity, setQuantity] = useState(0);
    const [reason, setReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Reset form when the modal opens/closes or product changes
    useEffect(() => {
        if (show) {
            setAdjustmentType('add');
            setStockLocation('stockGeneral');
            setQuantity(0);
            setReason('');
            setError(null);
        }
    }, [show, product]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!product || quantity <= 0) {
            setError('Please select a product and enter a valid quantity.');
            return;
        }

        setIsLoading(true);

        // Calculate the adjustment amount: positive for 'add', negative for 'subtract'
        let adjustmentAmount = quantity;
        if (adjustmentType === 'subtract') {
            adjustmentAmount *= -1;
            
            // Client-side check for subtraction
            const currentStock = stockLocation === 'stockGeneral' ? product.stockGeneral : product.stockBar;
            if (currentStock < quantity) {
                setError(`Cannot subtract ${quantity}. Only ${currentStock} available in ${stockLocation.replace('stock', '')}.`);
                setIsLoading(false);
                return;
            }
        }
        
        try {
            await axios.patch(`${API_URL}/inventory/adjust/${product._id}`, {
                adjustmentAmount: adjustmentAmount,
                stockLocation: stockLocation, // 'stockBar' or 'stockGeneral'
                reason: reason,
            });

            refreshData(); // Refresh the parent component's data
            handleClose();
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to adjust product stock.');
        } finally {
            setIsLoading(false);
        }
    };

    const modalTitle = product ? `Adjust Stock for: ${product.name}` : 'Adjust Stock';

    return (
        <Modal show={show} onHide={handleClose} backdrop="static" keyboard={false}>
            <Modal.Header closeButton className='bg-warning text-dark'>
                <Modal.Title><FaEdit className='me-2' />{modalTitle}</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {error && <Alert variant="danger">{error}</Alert>}
                    {!product && <Alert variant="info">Please select a product from the table.</Alert>}

                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group controlId="adjustmentType">
                                <Form.Label>Adjustment Type</Form.Label>
                                <Form.Select 
                                    value={adjustmentType} 
                                    onChange={(e) => setAdjustmentType(e.target.value)}
                                >
                                    <option value="add"><FaPlus className='me-1' /> Stock In (Delivery/Correction)</option>
                                    <option value="subtract"><FaMinus className='me-1' /> Stock Out (Loss/Damage)</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group controlId="stockLocation">
                                <Form.Label>Stock Location</Form.Label>
                                <Form.Select 
                                    value={stockLocation} 
                                    onChange={(e) => setStockLocation(e.target.value)}
                                >
                                    <option value="stockGeneral">General Stock ({product?.stockGeneral || 0})</option>
                                    <option value="stockBar">Bar Stock ({product?.stockBar || 0})</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                    
                    <Form.Group controlId="quantity" className="mb-3">
                        <Form.Label>Quantity</Form.Label>
                        <Form.Control
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            required
                        />
                    </Form.Group>

                    <Form.Group controlId="reason" className="mb-3">
                        <Form.Label>Reason/Notes</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g., Weekly delivery, Broken bottle, Inventory recount"
                            required
                        />
                    </Form.Group>

                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button variant="warning" type="submit" disabled={isLoading || !product}>
                        {isLoading ? 'Processing...' : `Confirm ${adjustmentType === 'add' ? 'Add' : 'Subtract'}`}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default AdjustProductStockModal;