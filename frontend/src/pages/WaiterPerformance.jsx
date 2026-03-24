// WaiterPerformance.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Table, Button, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { FaChartLine, FaSearch } from 'react-icons/fa';
import axios from 'axios';

// IMPORTANT: Define the base URLs for Bills and Users

const API_URL = 'http://localhost:5000/api/v1';  // test
 // const API_URL = 'https://posbackend-usko.onrender.com/api/v1';

const BILLS_API = `${API_URL}/bills`;
const USERS_API = `${API_URL}/users/waiters`; 

const formatCurrency = (amount) => `$${Number(amount || 0).toFixed(2)}`;
const formatDate = (date) => new Date(date).toISOString().split('T')[0];

// Function to calculate start/end dates based on period
const getPeriodDates = (period) => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);

    switch (period) {
        case 'week':
            // Start of the week (Sunday for US standard)
            start.setDate(now.getDate() - now.getDay());
            break;
        case 'month':
            start.setDate(1); // First day of the month
            break;
        case 'year':
            start.setMonth(0, 1); // January 1st
            break;
        case 'day':
        default:
            // Stays on the current date
            break;
    }
    
    start.setHours(0, 0, 0, 0); 
    end.setHours(23, 59, 59, 999); 
    
    return { 
        startDate: formatDate(start), 
        endDate: formatDate(end) 
    };
};

// --- Component Start ---

const WaiterPerformancePage = () => {
    const initialDates = getPeriodDates('month'); 

    const [performanceData, setPerformanceData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({ 
        waiterId: '', 
        period: 'month', 
        startDate: initialDates.startDate,
        endDate: initialDates.endDate,
    });
    const [waiterList, setWaiterList] = useState([]); 

    const handlePeriodChange = (e) => {
        const newPeriod = e.target.value;
        const { startDate, endDate } = getPeriodDates(newPeriod);
        setFilters(prev => ({ 
            ...prev, 
            period: newPeriod,
            startDate,
            endDate
        }));
    };

    // FIX 1: Robustly fetches the list of available waiters
    const fetchWaiters = useCallback(async () => {
        try {
            const response = await axios.get(USERS_API);
            let waitersArray = response.data;

            // Handle the wrapped object structure: {waiters: Array(2), count: 2}
            if (response.data && response.data.waiters && Array.isArray(response.data.waiters)) {
                waitersArray = response.data.waiters;
            }
            
            if (Array.isArray(waitersArray)) {
                setWaiterList(waitersArray);
            } else {
                console.warn('API returned unexpected data for waiters:', response.data);
                setWaiterList([]); 
            }
        } catch (err) {
            console.error('Failed to fetch waiter list. Check USERS_API endpoint.', err);
            setError('Erreur: Impossible de charger la liste des serveurs. Vérifiez la connexion API.');
            setWaiterList([]); 
        }
    }, []);

    // Fetches the performance data based on current filters
    const fetchPerformance = useCallback(async () => {
        if (!filters.startDate || !filters.endDate) {
             setError('Veuillez sélectionner une période de début et de fin valide.');
             return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                waiterId: filters.waiterId,
                periodStart: filters.startDate,
                periodEnd: filters.endDate,
            });
            
            console.log("Fetching performance with URL:", `${BILLS_API}/performance?${params.toString()}`);

            const response = await axios.get(`${BILLS_API}/performance?${params.toString()}`);
            setPerformanceData(response.data.performanceData);
        } catch (err) {
            const msg = err.response?.data?.msg || 'Échec de la récupération des données de performance en raison d\'une erreur du serveur.';
            setError(msg);
            console.error("Error fetching waiter performance:", err);
        } finally {
            setIsLoading(false);
        }
    }, [filters.waiterId, filters.startDate, filters.endDate]); // Dependency array for useCallback

    // 1. Load the list of waiters once on mount
    useEffect(() => {
        fetchWaiters();
    }, [fetchWaiters]); 

    // 2. Load performance data whenever filters change
    useEffect(() => {
        fetchPerformance();
    }, [fetchPerformance]);


    return (
        <Container className="mt-4">
            <Card>
                <Card.Header as="h2"><FaChartLine className="me-2" /> Rapport de Performance des Serveurs</Card.Header>
                <Card.Body>
                    {error && <Alert variant="danger">{error}</Alert>}
                    
                    <Form onSubmit={(e) => { e.preventDefault(); fetchPerformance(); }} className="mb-4">
                        <Row className="align-items-end">
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Période</Form.Label>
                                    <Form.Control as="select" value={filters.period} onChange={handlePeriodChange}>
                                        <option value="day">Jour</option>
                                        <option value="week">Semaine</option>
                                        <option value="month">Mois</option>
                                        <option value="year">Année</option>
                                        {filters.period === 'custom' && <option value="custom">Personnalisé</option>}
                                    </Form.Control>
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Date de Début</Form.Label>
                                    <Form.Control type="date" value={filters.startDate} onChange={(e) => setFilters(p => ({ ...p, startDate: e.target.value, period: 'custom' }))} />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Date de Fin</Form.Label>
                                    <Form.Control type="date" value={filters.endDate} onChange={(e) => setFilters(p => ({ ...p, endDate: e.target.value, period: 'custom' }))} />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Filtrer par Serveur</Form.Label>
                                    <Form.Control as="select" value={filters.waiterId} onChange={(e) => setFilters(p => ({ ...p, waiterId: e.target.value }))}>
                                        <option value="">Tous les Serveurs</option>
                                        {/* Renders the list fetched from the backend */}
                                        {waiterList && Array.isArray(waiterList) && waiterList.map(w => (
                                            <option key={w._id} value={w._id}>{w.name}</option>
                                        ))}
                                    </Form.Control>
                                </Form.Group>
                            </Col>
                            <Col md={12} className="mt-3">
                                <Button type="submit" disabled={isLoading} className="w-100">
                                    <FaSearch className="me-1" /> {isLoading ? <Spinner size="sm" /> : 'Exécuter le Rapport'}
                                </Button>
                            </Col>
                        </Row>
                    </Form>
                    
                    {isLoading ? (
                        <Alert variant="info">Chargement des données de performance...</Alert>
                    ) : (
                        <Table striped bordered hover responsive>
                            <thead>
                                <tr>
                                    <th>Nom du Serveur</th>
                                    <th>Total des Ventes</th>
                                    <th>Total des Factures</th>
                                    <th>Valeur Moyenne</th>
                                    <th>Articles Vendus</th>
                                </tr>
                            </thead>
                            <tbody>
                                {performanceData.length > 0 ? (
                                    performanceData.map((data, index) => (
                                        // Use index as fallback key only if waiterId is truly missing/null (as observed)
                                        <tr key={data.waiterId || index}> 
                                            <td><strong>{data.waiterName}</strong></td>
                                            <td>{formatCurrency(data.totalSales)}</td>
                                            <td>{data.totalBills}</td>
                                            <td>{formatCurrency(data.averageBillValue)}</td>
                                            <td>{data.totalItemsSold}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="text-center">
                                            {/* Informative message based on backend observation */}
                                            Aucune donnée de facture finalisée trouvée pour cette période/filtre.
                                            {waiterList.length > 0 && (
                                                <p className="text-muted mt-2 small">
                                                    *Note: Si vous voyez des serveurs dans le filtre mais aucun résultat,
                                                    votre base de données pourrait ne pas attribuer de `waiterId` aux factures enregistrées.
                                                </p>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
};

export default WaiterPerformancePage;