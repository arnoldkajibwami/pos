// pages/Reports.jsx

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Table } from 'react-bootstrap';
import API_URL from '../api/api'
import axios from 'axios';
import { FaChartLine, FaUserTie, FaBox } from 'react-icons/fa';

// const API_URL = 'http://localhost:5000/api/v1';  // test
// const API_URL= axios.create({ 
  // baseURL:  //`${window.location.origin}/api/v1` 
//});

const Reports = () => {
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchReports = async () => {
            setIsLoading(true);
            try {
                // Fetch sales breakdown (product sales and waiter sales)
                const response = await axios.get(`${API_URL}/reports/summary`);
                // const response = await axios.get(`${API_URL}/reports/breakdown`);
                setReportData(response.data);
            } catch (err) {
                console.error('Error fetching reports:', err);
                setError('Failed to load reports. Ensure the reportController API route is correct.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchReports();
    }, []);

    if (isLoading) return <Container className="mt-4 text-center"><Spinner animation="border" /><p>Loading Reports...</p></Container>;
    if (error) return <Container className="mt-4"><Alert variant="danger">{error}</Alert></Container>;

    const { productSales, waiterSales } = reportData;

    return (
        <Container className="mt-4">
            <h2 className="mb-4"><FaChartLine className="me-2" /> Sales Reports Overview</h2>

            <Row className="mb-4">
                {/* Waiter Sales Report */}
                <Col md={6}>
                    <Card>
                        <Card.Header as="h5"><FaUserTie className="me-2" /> Sales by Waiter</Card.Header>
                        <Card.Body>
                            <Table striped bordered hover size="sm">
                                <thead>
                                    <tr>
                                        <th>Waiter Name</th>
                                        <th>Total Bills</th>
                                        <th>Total Revenue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {waiterSales?.map((sale) => (
                                        <tr key={sale._id || 'N/A'}>
                                            <td>{sale.waiterName || 'Unknown/System'}</td>
                                            <td>{sale.totalBills}</td>
                                            <td>${sale.totalRevenue.toFixed(0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Product Sales Report */}
                <Col md={6}>
                    <Card>
                        <Card.Header as="h5"><FaBox className="me-2" /> Sales by Product</Card.Header>
                        <Card.Body>
                            <Table striped bordered hover size="sm">
                                <thead>
                                    <tr>
                                        <th>Product Name</th>
                                        <th>Qty Sold</th>
                                        <th>Total Revenue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {productSales?.map((sale) => (
                                        <tr key={sale._id}>
                                            <td>{sale.productName}</td>
                                            <td>{sale.totalQuantitySold}</td>
                                            <td>${sale.totalRevenue.toFixed(0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Note: 'Full Sales' is covered by FinalizedBills.jsx (list of bills) and the Total Revenue summary (requires a separate call to /reports/summary) */}
        </Container>
    );
};

export default Reports;