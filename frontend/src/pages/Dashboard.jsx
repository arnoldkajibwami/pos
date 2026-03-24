import React, { useState, useEffect } from 'react';
import { 
    Container, Row, Col, Card, Alert, Spinner, Badge, Form, Table 
} from 'react-bootstrap';
import { 
    DollarSign, Users, ClipboardList, CreditCard, CheckCircle, XCircle, Clock, User, MinusCircle, Calendar,
    Gauge, Package, ShoppingCart // ADDED: Package, ShoppingCart
} from 'lucide-react';
import { FaFilter } from 'react-icons/fa'; 
import API_URL from '../api/api'
import axios from 'axios';

// =========================================================================
// MOCK/STUB FOR EXTERNAL DEPENDENCY (MANDATORY FOR SINGLE-FILE EXECUTION)
// =========================================================================
const useAuth = () => ({
    user: { 
        name: "Jane Doe", 
        role: "Manager", 
        id: "U_MGR_001" 
    },
    isManagerOrAdmin: true 
});

// const API_URL = 'http://localhost:5000/api/v1';  // test
// const API_URL= axios.create({ 
  // baseURL:  //`${window.location.origin}/api/v1` 
//});


// Constants for new payment status logic
const PAYMENT_STATUSES = {
    PAID: 'paid',
    HALF_PAY: 'half-pay',
    CREDIT: 'credit',
};

// Utility for formatting currency
const formatCurrency = (amount) => `$${Number(amount).toFixed(0)}`;

// =========================================================================
// Component to display ALL Finalized Bills History (Updated for Credit Owed)
// =========================================================================
const AllFinalizedBillsTable = () => {
    const [finalBills, setFinalBills] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Helper function to determine badge details
    const getStatusBadge = (status) => {
        switch (status) {
            case PAYMENT_STATUSES.PAID:
                return { bg: 'success', icon: CheckCircle, text: 'Paid Full' };
            case PAYMENT_STATUSES.HALF_PAY:
                return { bg: 'warning', icon: Clock, text: 'Partial Debt' };
            case PAYMENT_STATUSES.CREDIT:
                return { bg: 'danger', icon: XCircle, text: 'Full Credit' };
            default:
                return { bg: 'secondary', icon: Clock, text: 'Pending' };
        }
    };

    useEffect(() => {
        const fetchFinalBills = async () => {
            setIsLoading(true);
            try {
                const response = await axios.get(`${API_URL}/bills/final`);
                
                // Mocking data structure: Assuming amountPaid is now returned from the API
                const mockedBills = (response.data.bills || []).map(bill => ({
                    ...bill,
                    total: bill.total || 100.00,
                    amountPaid: bill.amountPaid !== undefined ? bill.amountPaid : (bill.paymentStatus === 'paid' ? (bill.total || 100.00) : (bill.paymentStatus === 'half-pay' ? 50.00 : 0.00)),
                    paymentStatus: bill.paymentStatus || (bill.total === bill.amountPaid ? PAYMENT_STATUSES.PAID : (bill.amountPaid > 0 && bill.amountPaid < bill.total ? PAYMENT_STATUSES.HALF_PAY : PAYMENT_STATUSES.CREDIT)),
                    // Added for explicit customer name from the bill object
                    customerName: bill.customerName || bill.customer?.name 
                }));

                setFinalBills(mockedBills);
            } catch (err) {
                console.error('Error fetching finalized bills:', err);
                setError('Failed to load full list of finalized bills. Check server connection and user permissions.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchFinalBills();
    }, []);

    if (isLoading) {
        return (
            <div className="text-center py-3">
                <Spinner animation="border" role="status" variant="secondary" />
                <p className="mt-2 text-muted">Loading All Finalized Bills History...</p>
            </div>
        );
    }

    if (error) {
        return <Alert variant="danger">{error}</Alert>;
    }

    return (
        <Card className="shadow-lg mt-4 modern-card">
            <Card.Header as="h5" className="bg-light fw-bold text-dark d-flex align-items-center">
                <CreditCard className="me-2 text-success" size={20} /> All Finalized Bills History
            </Card.Header>
            <Card.Body>
                {finalBills.length === 0 ? (
                    <Alert variant="info">No finalized bills found in the system.</Alert>
                ) : (
                    <Table striped bordered hover responsive className="mb-0">
                        <thead>
                            <tr>
                                <th>Bill ID</th>
                                <th>Customer</th>
                                <th>Total Due</th>
                                <th>Amount Paid</th>
                                <th>Credit Owed (Debt)</th>
                                <th>Status</th>
                                <th>Date/Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {finalBills.map((bill) => {
                                const { bg, icon: StatusIcon, text } = getStatusBadge(bill.paymentStatus);
                                // A positive 'creditOwed' means a DEBT (customer owes money)
                                // A negative 'creditOwed' means an overpayment (customer has credit)
                                const creditOwed = (bill.total || 0) - (bill.amountPaid || 0);

                                return (
                                    <tr key={bill._id}>
                                        <td>{bill._id ? bill._id.substring(bill._id.length - 6).toUpperCase() : 'N/A'}</td> 
                                        <td>{bill.customerName || 'N/A (Walk-in)'}</td>
                                        <td className="fw-bold text-danger">{formatCurrency(bill.total || 0)}</td>
                                        <td className="fw-bold text-success">{formatCurrency(bill.amountPaid || 0)}</td>
                                        
                                        {/* UPDATED CREDIT OWED DISPLAY LOGIC */}
                                        <td className={`fw-bold ${creditOwed > 0 ? 'text-danger' : (creditOwed < 0 ? 'text-info' : 'text-success')}`}>
                                            {creditOwed > 0 ? 
                                                // Positive debt
                                                formatCurrency(creditOwed) : 
                                                (creditOwed < 0 ? 
                                                    // Negative credit (overpaid) - display in parentheses
                                                    `(${formatCurrency(Math.abs(creditOwed))})` : 
                                                    // Zero debt
                                                    formatCurrency(0)
                                                )
                                            }
                                        </td>
                                        
                                        <td>
                                            <Badge bg={bg} className="d-flex align-items-center justify-content-center text-uppercase">
                                                <StatusIcon size={14} className="me-1" /> {text}
                                            </Badge>
                                        </td>
                                        <td>{new Date(bill.createdAt).toLocaleString()}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                )}
            </Card.Body>
        </Card>
    );
};

// =========================================================================
// MAIN Dashboard Component
// =========================================================================

const Dashboard = () => {
    const { user, isManagerOrAdmin } = useAuth();
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

  useEffect(() => {
        const fetchDashboardData = async () => {
            setData(null);
            setError(null);
            setIsLoading(true);
            
            try {
                const response = await axios.get(`${API_URL}/reports/summary`);
                
                // --- UPDATE: USING ACTUAL DATA FROM BACKEND RESPONSE ---
                // Destructure data directly from response.data, providing a default of 0
                // in case the property is missing from the backend response.
                const { 
                    totalRevenue = 0, 
                    billCount = 0, 
                    activeStaffCount = 0,
                    draftCount = 0, 
                    productCount = 0,
                    totalCustomerDebt = 0 
                } = response.data; 

                setData({
                    totalRevenue, // Now uses value from API
                    billCount, // Now uses value from API
                    activeStaffCount, // Now uses value from API
                    draftCount, // Now uses value from API
                    productCount, // Now uses value from API
                    totalCustomerDebt, // Now uses value from API
                });
                
                setIsLoading(false);

            } catch (err) {
                console.error('API Fetch Error (Summary):', err.response?.data?.msg || err.message);
                setError('Failed to fetch dashboard summary data. The system is showing general reports due to an API error.');
                
                // Fallback data if API call fails entirely
                setData({
                    totalRevenue: 0, 
                    billCount: 0, 
                    activeStaffCount: 0,
                    draftCount: 0, 
                    productCount: 0,
                    totalCustomerDebt: 0
                }); 
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, []);


    // --- Render based on State ---

    if (isLoading) return (
        <Container className="text-center py-5">
            <Spinner animation="border" role="status" variant="primary" />
            <p className="mt-2 text-muted">Loading dashboard summary...</p>
        </Container>
    );

    // Ensure the conditional check handles the case where data is available but may be zero
    if (error && (data.billCount === 0 && data.totalRevenue === 0)) return <Alert variant="warning" className="text-center">{error}</Alert>;
    
    // --- Main Render ---

    return (
        <Container fluid className="py-4 dashboard-view">
            <h1 className="mb-4 d-flex align-items-center text-primary fw-bolder">
                <Gauge size={32} className="me-2" /> Live Dashboard
            </h1>

            {/* Welcome Alert - Only shows if data is not loaded */}
            {user && !isLoading && !data && (
                <Alert variant="info" className="shadow-sm">
                    <CheckCircle className="me-2" size={20} />
                    Welcome, **{user.name}**! Your current role is **{user.role}**. Use the **POS Terminal** for daily operations.
                </Alert>
            )}

            {/* Main Content (Manager/Admin View) */}
            {isManagerOrAdmin && data && (
                <>
                    <Row className="mb-4">
                        {/* Revenue Card */}
                        <Col md={6} lg={3} className="mb-3">
                            <Card className="shadow-lg h-100 border-0 modern-card bg-success text-white">
                                <Card.Body>
                                    <DollarSign size={30} className="float-end opacity-75" />
                                    <Card.Title className="text-uppercase opacity-75">Today's Revenue</Card.Title>
                                    <Card.Text as="h2" className="fw-bold">{formatCurrency(data.totalRevenue)}</Card.Text>
                                    <Card.Text><small>Total sales finalized today</small></Card.Text>
                                </Card.Body>
                            </Card>
                        </Col>
                        
                        {/* Draft Orders Card */}
                        <Col md={6} lg={3} className="mb-3">
                            <Card className="shadow-lg h-100 border-0 modern-card bg-warning text-dark">
                                <Card.Body>
                                    <ClipboardList size={30} className="float-end opacity-75" />
                                    <Card.Title className="text-uppercase opacity-75">Open Drafts</Card.Title>
                                    <Card.Text as="h2" className="fw-bold">{data.draftCount}</Card.Text>
                                    <Card.Text><small>Bills awaiting finalization</small></Card.Text>
                                </Card.Body>
                            </Card>
                        </Col>
                        
                        {/* Inventory Value Card (Example) */}
                        <Col md={6} lg={3} className="mb-3">
                            <Card className="shadow-lg h-100 border-0 modern-card bg-info text-white">
                                <Card.Body>
                                    <Package size={30} className="float-end opacity-75" />
                                    <Card.Title className="text-uppercase opacity-75">Products in Stock</Card.Title>
                                    <Card.Text as="h2" className="fw-bold">{data.productCount}</Card.Text>
                                    <Card.Text><small>Total unique products available</small></Card.Text>
                                </Card.Body>
                            </Card>
                        </Col>
                        
                        {/* Customer Debt Card (NEW FOCUSED METRIC) */}
                        <Col md={6} lg={3} className="mb-3">
                            <Card className="shadow-lg h-100 border-0 modern-card bg-danger text-white">
                                <Card.Body>
                                    <MinusCircle size={30} className="float-end opacity-75" />
                                    <Card.Title className="text-uppercase opacity-75">Customer Debt</Card.Title>
                                    {/* Assuming your backend calculates total debt */}
                                    <Card.Text as="h2" className="fw-bold">{formatCurrency(data.totalCustomerDebt || 0)}</Card.Text>
                                    <Card.Text><small>Total credit owed to the business</small></Card.Text>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* Full Finalized Bills History Table */}
                    <Card className="shadow-lg border-0">
                        <Card.Header className="bg-light d-flex align-items-center">
                            <ShoppingCart size={20} className="me-2 text-primary" />
                            Finalized Bills History
                        </Card.Header>
                        <Card.Body>
                            <AllFinalizedBillsTable />
                        </Card.Body>
                    </Card>

                </>
            ) } 
                
                // FIXED: Wrapped the conditional JSX in parentheses to ensure correct parsing
                {!isLoading && user && (
                    <Alert variant="info" className="shadow-sm">
                        <CheckCircle className="me-2" size={20} />
                        Welcome, **{user.name}**! Your current role is **{user.role}**. Use the **POS Terminal** for daily operations.
                    </Alert>
                )}
              
        </Container>
    );
};

export default Dashboard;