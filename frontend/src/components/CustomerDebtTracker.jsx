import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Spinner, Alert, Button, Badge } from 'react-bootstrap';
import { Users, DollarSign, CheckCircle, XCircle, Clock } from 'lucide-react';
import API_URL from '../api/api'
import axios from 'axios';

// const API_URL = 'http://localhost:5000/api/v1';  // test
// const API_URL= axios.create({ 
  // baseURL:  //`${window.location.origin}/api/v1` 
//});

const CustomerDebtTracker = () => {
    const [debtors, setDebtors] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isUpdating, setIsUpdating] = useState(null); // billId being updated

    const fetchDebtors = async () => {
        setIsLoading(true);
        try {
            // API call to fetch bills that are NOT 'paid'
            const response = await axios.get(`${API_URL}/bills/debtors`);
            
            // Mocking the data structure assuming the API returns only half-pay or credit bills
            const mockDebtors = (response.data.bills || []).filter(b => b.paymentStatus !== 'paid');

            // Fallback mock data if API returns empty
            if (mockDebtors.length === 0) {
                setDebtors([
                    { _id: 'BILL_001A', customerName: 'Alice Johnson', total: 150.00, amountPaid: 50.00, paymentStatus: 'half-pay', createdAt: new Date().toISOString() },
                    { _id: 'BILL_002B', customerName: 'Bob Williams', total: 95.50, amountPaid: 0.00, paymentStatus: 'credit', createdAt: new Date().toISOString() },
                ]);
            } else {
                setDebtors(mockDebtors);
            }

        } catch (err) {
            console.error('Error fetching debtors:', err);
            setError('Failed to load customer debt list. Check server connection.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDebtors();
    }, []);
    
    // Function to settle the debt
    const settleDebt = async (bill) => {
        const debtAmount = bill.total - bill.amountPaid;
        
        setIsUpdating(bill._id);
        setError(null);

        try {
            // API call to update the bill status and amount paid
            await axios.put(`${API_URL}/bills/settle-debt/${bill._id}`, {
                // New amount paid is old amount paid + debt amount
                amountPaid: bill.total.toFixed(0), 
                paymentStatus: 'paid'
            });

            // Success: Refresh the list
            alert(`Debt settled successfully for ${bill.customerName}. $${debtAmount.toFixed(0)} received.`);
            fetchDebtors();

        } catch (err) {
            console.error('Error settling debt:', err);
            setError(`Failed to settle debt for ${bill.customerName}.`);
        } finally {
            setIsUpdating(null);
        }
    };

    if (isLoading) {
        return (
            <Container className="mt-5 text-center">
                <Spinner animation="border" role="status" variant="danger" />
                <p>Loading Debtors...</p>
            </Container>
        );
    }

    if (error) {
        return <Container className="mt-5"><Alert variant="danger">{error}</Alert></Container>;
    }

    return (
        <Container className="py-5">
            <Card className="shadow-lg modern-card">
                <Card.Header as="h3" className="d-flex align-items-center bg-danger text-white">
                    <DollarSign className="me-2" /> Customer Debt Tracker
                </Card.Header>
                <Card.Body>
                    {debtors.length === 0 ? (
                        <Alert variant="success" className='d-flex align-items-center'>
                            <CheckCircle className='me-2'/> Fantastic! No outstanding customer debts currently recorded.
                        </Alert>
                    ) : (
                        <Table striped bordered hover responsive className="mb-0">
                            <thead>
                                <tr>
                                    <th>Bill ID</th>
                                    <th>Customer Name</th>
                                    <th>Total Due</th>
                                    <th>Amount Paid</th>
                                    <th>Remaining Debt</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {debtors.map((bill) => {
                                    const debt = bill.total - bill.amountPaid;
                                    const statusBadge = bill.paymentStatus === 'half-pay' ? { bg: 'warning', text: 'Partial' } : { bg: 'danger', text: 'Credit' };

                                    return (
                                        <tr key={bill._id}>
                                            <td>{bill._id.substring(bill._id.length - 6).toUpperCase()}</td>
                                            <td className='fw-bold'>{bill.customerName || 'N/A (Walk-in)'}</td>
                                            <td>${bill.total.toFixed(0)}</td>
                                            <td>${bill.amountPaid.toFixed(0)}</td>
                                            <td className='fw-bold text-danger'>${debt.toFixed(0)}</td>
                                            <td><Badge bg={statusBadge.bg}>{statusBadge.text}</Badge></td>
                                            <td>
                                                <Button 
                                                    variant="success" 
                                                    size="sm"
                                                    onClick={() => settleDebt(bill)}
                                                    disabled={isUpdating === bill._id}
                                                >
                                                    <DollarSign size={16} /> 
                                                    {isUpdating === bill._id ? 'Settling...' : 'Settle Debt'}
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    )}
                    <small className='text-muted mt-3 d-block'>Note: Settling debt sets the bill status to 'paid' and updates the amount paid to the total due.</small>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default CustomerDebtTracker;
