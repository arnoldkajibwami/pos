// components/TransferProductStockModal.jsx

import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Row, Col } from 'react-bootstrap';
import { FaExchangeAlt, FaArrowRight } from 'react-icons/fa';
import API_URL from '../api/api'
import axios from 'axios';

// const API_URL = 'http://localhost:5000/api/v1';  // test
// const API_URL= axios.create({ 
  // baseURL:  //`${window.location.origin}/api/v1` 
//});

const TransferProductStockModal = ({ show, handleClose, product, refreshData }) => {
    const [fromLocation, setFromLocation] = useState('stockGeneral'); // 'stockGeneral' or 'stockBar'
    const [quantity, setQuantity] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Reset form when the modal opens/closes or product changes
    useEffect(() => {
        if (show) {
            setFromLocation('stockGeneral');
            setQuantity(0);
            setError(null);
        }
    }, [show, product]);

    const toLocation = fromLocation === 'stockGeneral' ? 'stockBar' : 'stockGeneral';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!product || quantity <= 0) {
            setError('Please select a product and enter a valid quantity.');
            return;
        }

        const currentStock = fromLocation === 'stockGeneral' ? product.stockGeneral : product.stockBar;
        if (currentStock < quantity) {
            setError(`Cannot transfer ${quantity}. Only ${currentStock} available in ${fromLocation.replace('stock', '')}.`);
            return;
        }

        setIsLoading(true);

        try {
            await axios.patch(`${API_URL}/inventory/transfer/${product._id}`, {
                transferQuantity: quantity,
                fromLocation: fromLocation, // 'stockGeneral' or 'stockBar'
                toLocation: toLocation,       // 'stockBar' or 'stockGeneral'
            });

            refreshData(); // Refresh the parent component's data
            handleClose();
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to transfer stock.');
        } finally {
            setIsLoading(false);
        }
    };

    const modalTitle = product ? `Transfer Stock for: ${product.name}` : 'Transfer Stock';
    const fromName = fromLocation === 'stockGeneral' ? 'General' : 'Bar';
    const toName = toLocation === 'stockGeneral' ? 'General' : 'Bar';

    return (
        <Modal show={show} onHide={handleClose} backdrop="static" keyboard={false}>
            <Modal.Header closeButton className='bg-primary text-white'>
                <Modal.Title><FaExchangeAlt className='me-2' />{modalTitle}</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {error && <Alert variant="danger">{error}</Alert>}
                    {!product && <Alert variant="info">Please select a product from the table.</Alert>}

                    <Row className="mb-3 align-items-center">
                        <Col md={5}>
                            <Form.Group controlId="fromLocation">
                                <Form.Label>Transfer **FROM**</Form.Label>
                                <Form.Select 
                                    value={fromLocation} 
                                    onChange={(e) => setFromLocation(e.target.value)}
                                >
                                    <option value="stockGeneral">General Stock ({product?.stockGeneral || 0})</option>
                                    <option value="stockBar">Bar Stock ({product?.stockBar || 0})</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={2} className='text-center'>
                            <FaArrowRight size={24} className="my-3 my-md-0" />
                        </Col>
                        <Col md={5}>
                            <Form.Group controlId="toLocation">
                                <Form.Label>Transfer **TO**</Form.Label>
                                <Form.Control 
                                    value={`${toName} Stock (${toLocation === 'stockGeneral' ? product?.stockGeneral : product?.stockBar})`} 
                                    disabled 
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    
                    <Form.Group controlId="quantity" className="mb-3">
                        <Form.Label>Quantity to Transfer</Form.Label>
                        <Form.Control
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            required
                            placeholder={`Max: ${currentStock}`}
                        />
                        <Form.Text className="text-muted">
                            Current stock in {fromName}: **{currentStock}**
                        </Form.Text>
                    </Form.Group>

                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button variant="primary" type="submit" disabled={isLoading || !product}>
                        {isLoading ? 'Processing...' : `Transfer ${quantity} from ${fromName} to ${toName}`}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default TransferProductStockModal;