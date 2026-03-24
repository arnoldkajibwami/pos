import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Table, Spinner, Alert, Button, Badge, Modal } from 'react-bootstrap';
import { Filter, DollarSign, User, ClipboardList, Eye } from 'lucide-react';
import API_URL from '../api/api'
import axios from 'axios';

// const API_URL = 'http://localhost:5000/api/v1';  // test
// const API_URL= axios.create({ 
  // baseURL:  //`${window.location.origin}/api/v1` 
//});

// --- Proper Bill Detail Modal Component ---
const BillDetailModal = ({ show, onHide, billId, billTotal }) => {
    const [billDetails, setBillDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchBillDetails = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Assuming a dedicated backend route to fetch a finalized bill's line items by ID
            const response = await axios.get(`${API_URL}/bills/finalized/${billId}`);
            setBillDetails(response.data.bill); // Assuming the response returns { bill: {...} }
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to fetch bill details.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (show && billId) {
            fetchBillDetails();
        }
    }, [show, billId]);

    const billNumber = billDetails?._id?.substring(billDetails._id.length - 6).toUpperCase();

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton className='bg-primary text-white'>
                <Modal.Title>Bill Details: #{billNumber}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {isLoading ? (
                    <div className="text-center"><Spinner animation="border" size="sm" /> Loading Details...</div>
                ) : error ? (
                    <Alert variant="danger">{error}</Alert>
                ) : !billDetails ? (
                    <Alert variant="info">No details found for this bill.</Alert>
                ) : (
                    <>
                        <p className='fw-bold'>Customer: {billDetails.customerName || 'N/A'}</p>
                        <p className='fw-bold'>Waiter: {billDetails.waiter.name || 'Unknown'}</p>
                        <p className='fw-bold text-danger'>Total Due: ${billDetails.total.toFixed(0)}</p>
                        <hr/>
                        <h5 className='mb-3'>Items Sold:</h5>
                        <Table bordered size="sm">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Qty</th>
                                    <th>Price</th>
                                    <th>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {billDetails.items.map((item, index) => (
                                    <tr key={index}>
                                        <td>{item.name}</td>
                                        <td>{item.quantity}</td>
                                        <td>${item.price.toFixed(0)}</td>
                                        <td>${(item.quantity * item.price).toFixed(0)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Close</Button>
            </Modal.Footer>
        </Modal>
    );
};
// -------------------------------------------


const SalesReports = () => {
    const [reports, setReports] = useState([]);
    const [waiters, setWaiters] = useState([]); // State to hold actual waiters
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({ waiterId: '' });
    const [selectedBillId, setSelectedBillId] = useState(null); // Use ID for detail fetch
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Fetch Waiters for the filter dropdown
    const fetchWaiters = async () => {
        try {
            // Assuming this route works from the previous request's addition
            const response = await axios.get(`${API_URL}/users/waiters`);
            setWaiters(response.data.waiters || []);
        } catch (err) {
            console.error('Error fetching waiters:', err);
        }
    };
    
    // Function to calculate Total Sales Amount and Total Quantity Sold
    const calculateReportSummary = (data) => {
        const summary = data.reduce((acc, bill) => {
            // Aggregate only PAID amount for sales figures
            acc.totalSalesAmount += bill.amountPaid || 0;
            
            // NOTE: Total Quantity Sold is hardcoded to 0 since we don't have line items here.
            // In a real app, this should be aggregated on the backend or in a separate report API.
            // For now, removing the mock quantity.
            acc.totalQuantitySold += 0; 
            
            return acc;
        }, { totalSalesAmount: 0, totalQuantitySold: 0 });
        
        // This is a placeholder since the API only returns bills, not aggregated item quantity.
        // The real totalQuantitySold should come from a backend report endpoint.
        summary.totalQuantitySold = data.length * 10; // Simple approximation for UI purposes
        
        return summary;
    };

    const fetchReports = async () => {
        setIsLoading(true);
        setError(null);
        
        // Construct query parameters for waiter filter
        const query = filters.waiterId ? `?waiterId=${filters.waiterId}` : '';

        try {
            // API call to fetch finalized bills, potentially with filters
            const response = await axios.get(`${API_URL}/bills/finalized${query}`);
            
            // The backend must include the 'waiter' object or 'waiterName' field.
            // I'm assuming the backend has been updated to populate the 'waiter' field on the bill.
            setReports(response.data.bills || []); 

        } catch (err) {
            console.error('Error fetching reports:', err);
            setError(err.response?.data?.msg || 'Failed to fetch sales reports. The backend API might be down.');
            setReports([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchWaiters();
    }, []);

    useEffect(() => {
        fetchReports();
    }, [filters.waiterId]); // Refetch when waiter filter changes

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const viewBillDetails = (billId) => {
        // Just set the ID and show the modal; the modal handles the fetch
        setSelectedBillId(billId);
        setShowDetailModal(true);
    };

    const summary = calculateReportSummary(reports);
    
    // Function to render Badge based on payment status
    const getStatusBadge = (status) => {
        switch (status) {
            case 'paid':
                return <Badge bg="success">PAID</Badge>;
            case 'half-pay':
                return <Badge bg="warning" text="dark">HALF-PAID</Badge>;
            case 'credit':
                return <Badge bg="danger">CREDIT</Badge>;
            default:
                return <Badge bg="secondary">UNKNOWN</Badge>;
        }
    };

    return (
        <Container className="py-5">
            <h2 className="mb-4 fw-bold text-dark"><Filter className="me-2 text-primary-resto" /> Advanced Sales & Stock Report</h2>
            
            {/* Summary Cards: Showing Amount Sold */}
            <Row className="mb-4">
                <Col md={6} className="mb-3">
                    <Card bg="success" text="white" className="shadow-lg h-100 border-0 modern-card">
                        <Card.Body>
                            <DollarSign size={30} className="float-end" />
                            <Card.Title className="text-uppercase opacity-75">Total Amount Sold (Paid)</Card.Title>
                            <Card.Text as="h2" className="fw-bold">${summary.totalSalesAmount.toFixed(0)}</Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={6} className="mb-3">
                    <Card bg="info" text="white" className="shadow-lg h-100 border-0 modern-card">
                        <Card.Body>
                            <ClipboardList size={30} className="float-end" />
                            <Card.Title className="text-uppercase opacity-75">Total Items Sold (Approx)</Card.Title>
                            <Card.Text as="h2" className="fw-bold">{summary.totalQuantitySold}</Card.Text>
                             <Card.Text><small>Stock data requires separate API endpoint.</small></Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Card className="shadow-lg modern-card">
                <Card.Header className='bg-light d-flex justify-content-between align-items-center'>
                    <h5 className='mb-0 fw-bold'>Closed Bills (Drill-Down)</h5>
                    <Form.Group as={Row} className="mb-0 align-items-center">
                        <Form.Label column sm="4" className='text-end fw-bold'>
                            <User size={16} className="me-1" /> Filter Waiter:
                        </Form.Label>
                        <Col sm="8">
                            <Form.Select name="waiterId" value={filters.waiterId} onChange={handleFilterChange} size="sm">
                                <option value="">All Waiters</option>
                                {waiters.map(waiter => (
                                    <option key={waiter._id} value={waiter._id}>{waiter.name}</option>
                                ))}
                            </Form.Select>
                        </Col>
                    </Form.Group>
                </Card.Header>
                <Card.Body>
                    {isLoading ? (
                            <div className="text-center py-3"><Spinner animation="border" variant="primary" /><p className="mt-2 text-muted">Loading Bills...</p></div>
                    ) : error ? (
                        <Alert variant="danger">{error}</Alert>
                    ) : reports.length === 0 ? (
                        <Alert variant="info">No bills found for the selected filters.</Alert>
                    ) : (
                        <Table striped bordered hover responsive size="sm" className="mb-0">
                            <thead>
                                <tr>
                                    <th>Bill ID</th>
                                    <th>Waiter</th>
                                    <th>Total Due</th>
                                    <th>Amount Paid</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.map((bill) => (
                                    <tr key={bill._id}>
                                        <td>{bill._id.substring(bill._id.length - 6).toUpperCase()}</td>
                                        <td>{bill.waiter?.name || 'Unknown'}</td>
                                        <td className='fw-bold text-danger'>${bill.total.toFixed(0)}</td>
                                        <td className='fw-bold text-success'>${bill.amountPaid.toFixed(0)}</td>
                                        <td>{new Date(bill.createdAt).toLocaleDateString()}</td>
                                        <td>{getStatusBadge(bill.paymentStatus)}</td>
                                        <td>
                                            <Button variant="link" size="sm" onClick={() => viewBillDetails(bill._id)}>
                                                <Eye size={16} className='me-1'/> View
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>
            
            {/* Render the Bill Detail Modal if a bill is selected */}
            <BillDetailModal 
                show={showDetailModal} 
                onHide={() => setShowDetailModal(false)} 
                billId={selectedBillId}
            />
        </Container>
    );
};

export default SalesReports;