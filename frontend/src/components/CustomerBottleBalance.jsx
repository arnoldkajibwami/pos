import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Alert, Spinner, Table, Modal, Row, Col } from 'react-bootstrap';
import { Bottle, DollarSign, Wallet, Search } from 'lucide-react';
import API_URL from '../api/api'
import axios from 'axios';

// const API_URL = 'http://localhost:5000/api/v1';  // test
// const API_URL= axios.create({ 
//   baseURL: `${window.location.origin}/api/v1` 
// });

const CustomerBottleBalance = () => {
    const [customerId, setCustomerId] = useState('');
    const [customerName, setCustomerName] = useState(''); // Name to display
    const [balanceHistory, setBalanceHistory] = useState([]);
    const [netBalance, setNetBalance] = useState(0); // Assuming bottles/debt are tracked as a single number
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState(0);

    // --- Search & Fetch Logic ---
    const fetchBalanceHistory = async (id) => {
        if (!id) return;
        setIsLoading(true);
        setError(null);
        setBalanceHistory([]);
        setNetBalance(0);

        try {
            // Step 1: Fetch the customer's balance/withdrawal history
            const historyResponse = await axios.get(`${API_URL}/bills/withdrawals/${id}`);
            const history = historyResponse.data.withdrawals || [];
            
            // Step 2: Calculate the net balance from the history
            // Assuming positive is debt/bottles DUE, negative is settled amount
            const calculatedNetBalance = history.reduce((acc, item) => {
                // If the item is a bill withdrawal (debt/bottle count), add it.
                // If the item is a payment (settlement), subtract it.
                return acc + (item.type === 'withdrawal' ? item.amount : -item.amount);
            }, 0);
            
            setBalanceHistory(history);
            setNetBalance(calculatedNetBalance);
            // NOTE: In a real system, you'd also fetch the customer's name based on ID
            setCustomerName(`Customer ID: ${id}`);

        } catch (err) {
            console.error('Error fetching balance:', err);
            setError(err.response?.data?.msg || 'Failed to fetch customer balance or ID is invalid.');
            setCustomerName('');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchBalanceHistory(customerId);
    };

    // --- Debt Payment Logic ---
    const handlePaymentSubmit = async () => {
        if (paymentAmount <= 0) {
            setError('Payment amount must be greater than zero.');
            return;
        }
        if (paymentAmount > netBalance) {
            setError(`Payment cannot exceed the net balance of $${netBalance.toFixed(0)}.`);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Assuming a new backend route to handle debt settlement
            // This payment should create a new transaction record that offsets the debt
            await axios.post(`${API_URL}/bills/settle-withdrawal`, {
                customerId: customerId,
                amount: paymentAmount,
                // paymentMethod: 'Cash', // Example: can be added to state
            });

            // Refresh data and close modal
            fetchBalanceHistory(customerId); 
            setShowPaymentModal(false);
            setPaymentAmount(0);

        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to process payment.');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Component JSX ---
    const DebtPaymentModal = () => (
        <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} centered>
            <Modal.Header closeButton className='bg-success text-white'>
                <Modal.Title><Wallet className='me-2' size={20} /> Settle Debt for {customerName}</Modal.Title>
            </Modal.Header>
            <Form onSubmit={(e) => { e.preventDefault(); handlePaymentSubmit(); }}>
                <Modal.Body>
                    <Alert variant="info">
                        Current Outstanding Balance: Fc{netBalance.toFixed(0)}
                    </Alert>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form.Group controlId="paymentAmount" className="mb-3">
                        <Form.Label>Payment Amount ($)</Form.Label>
                        <Form.Control 
                            type="number" 
                            min="0.01" 
                            max={netBalance}
                            step="0.01"
                            value={paymentAmount} 
                            onChange={(e) => setPaymentAmount(Number(e.target.value))} 
                            required 
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowPaymentModal(false)} disabled={isLoading}>Cancel</Button>
                    <Button variant="success" type="submit" disabled={isLoading || paymentAmount <= 0}>
                        {isLoading ? 'Processing...' : 'Confirm Payment'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );

    return (
        <Container className="py-5">
            <h2 className="mb-4 fw-bold text-dark"><Bottle className="me-2 text-primary-resto" /> Customer Debt & Balance</h2>

            <Card className="shadow-lg mb-4 modern-card">
                <Card.Header className='bg-primary text-white'>
                    <Search className='me-2' size={20} /> Find Customer
                </Card.Header>
                <Card.Body>
                    <Form onSubmit={handleSearch}>
                        <Row className='align-items-end'>
                            <Col md={9} className='mb-3 mb-md-0'>
                                <Form.Group controlId="customerId">
                                    <Form.Label className='fw-bold'>Customer ID</Form.Label>
                                    <Form.Control 
                                        type="text" 
                                        placeholder="Enter Customer ID" 
                                        value={customerId}
                                        onChange={(e) => setCustomerId(e.target.value)}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Button variant="primary" type="submit" className='w-100' disabled={isLoading || !customerId}>
                                    {isLoading ? <Spinner as="span" animation="border" size="sm" /> : 'Search'}
                                </Button>
                            </Col>
                        </Row>
                    </Form>
                </Card.Body>
            </Card>

            {/* Balance and Payment Section */}
            {customerName && (
                <Card className="shadow-lg modern-card">
                    <Card.Header className='bg-light d-flex justify-content-between align-items-center'>
                        <h5 className='mb-0 fw-bold'>Balance Summary: {customerName}</h5>
                        {netBalance > 0 && (
                            <Button variant="success" size="sm" onClick={() => setShowPaymentModal(true)}>
                                <DollarSign size={16} className='me-1' /> Settle Debt
                            </Button>
                        )}
                    </Card.Header>
                    <Card.Body>
                        {error && <Alert variant="danger">{error}</Alert>}
                        <Alert variant={netBalance > 0 ? "danger" : "success"} className='fw-bold text-center'>
                            Net Outstanding Balance: <span className='fs-4'>${netBalance.toFixed(0)}</span>
                        </Alert>

                        <h6 className='mt-4 mb-3 fw-bold'>Transaction History</h6>
                        {balanceHistory.length === 0 ? (
                            <Alert variant="info">No withdrawal or payment history found.</Alert>
                        ) : (
                            <Table striped bordered hover responsive size="sm">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Type</th>
                                        <th>Amount</th>
                                        <th>Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {balanceHistory.map((item) => (
                                        <tr key={item._id} className={item.type === 'payment' ? 'table-success' : 'table-danger'}>
                                            <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                <Badge bg={item.type === 'withdrawal' ? 'danger' : 'success'}>
                                                    {item.type.toUpperCase()}
                                                </Badge>
                                            </td>
                                            <td className='fw-bold'>${item.amount.toFixed(0)}</td>
                                            <td>{item.notes || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        )}
                    </Card.Body>
                </Card>
            )}

            {showPaymentModal && <DebtPaymentModal />}
        </Container>
    );
};

export default CustomerBottleBalance;