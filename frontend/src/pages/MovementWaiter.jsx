import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
    Container, Row, Col, Card, Table, Badge, 
    Spinner, Alert, Button, ProgressBar 
} from 'react-bootstrap';
import { 
    User, TrendingUp, Clock, ShoppingBag, 
    RefreshCw, Award, Zap 
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api/v1/bills';


const MovementWaiter = () => {
    const [report, setReport] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchReport = useCallback(async () => {
        setIsLoading(true);
        try {
            // Appel à l'endpoint corrigé (placé avant les routes :id au backend)
            const response = await axios.get(`${API_BASE_URL}/performance`);
            
            // Correction : Utilisation de performanceData (nom retourné par le contrôleur)
            setReport(response.data.performanceData || []);
            setError(null);
        } catch (err) {
            console.error("Erreur report:", err);
            setError("Impossible de charger les mouvements. Vérifiez l'ordre des routes au backend.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReport();
        // Auto-refresh toutes les 5 minutes pour le monitoring
        const interval = setInterval(fetchReport, 300000);
        return () => clearInterval(interval);
    }, [fetchReport]);

    // Calcul des statistiques globales
    const stats = {
        totalSales: report.reduce((acc, curr) => acc + (curr.totalSales || 0), 0),
        totalBills: report.reduce((acc, curr) => acc + (curr.billsCount || 0), 0),
        topWaiter: report.length > 0 ? [...report].sort((a, b) => b.totalSales - a.totalSales)[0] : null
    };

    if (isLoading && report.length === 0) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    return (
        <Container fluid className="py-4 bg-light min-vh-100">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold mb-0 text-dark">Mouvements & Performance</h2>
                    <p className="text-muted">Analyse en temps réel de l'activité du staff</p>
                </div>
                <Button variant="white" className="shadow-sm border fw-bold" onClick={fetchReport} disabled={isLoading}>
                    <RefreshCw size={18} className={`me-2 ${isLoading ? 'feather-spin' : ''}`} />
                    Actualiser
                </Button>
            </div>

            <Row className="mb-4">
                <Col md={4}>
                    <Card className="border-0 shadow-sm bg-primary text-white">
                        <Card.Body className="d-flex align-items-center py-4">
                            <div className="p-3 bg-white bg-opacity-25 rounded-circle me-3">
                                <TrendingUp size={28} />
                            </div>
                            <div>
                                <small className="d-block opacity-75 text-uppercase fw-bold">Chiffre d'Affaire</small>
                                <h3 className="mb-0 fw-bold">${stats.totalSales.toLocaleString()}</h3>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="border-0 shadow-sm bg-white">
                        <Card.Body className="d-flex align-items-center py-4">
                            <div className="p-3 bg-success-subtle text-success rounded-circle me-3">
                                <ShoppingBag size={28} />
                            </div>
                            <div>
                                <small className="d-block text-muted text-uppercase fw-bold">Volume Global</small>
                                <h3 className="mb-0 fw-bold text-dark">{stats.totalBills} Commandes</h3>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="border-0 shadow-sm bg-white">
                        <Card.Body className="d-flex align-items-center py-4">
                            <div className="p-3 bg-warning-subtle text-warning rounded-circle me-3">
                                <Award size={28} />
                            </div>
                            <div>
                                <small className="d-block text-muted text-uppercase fw-bold">Top Serveur</small>
                                <h3 className="mb-0 fw-bold text-dark">{stats.topWaiter?.waiterName || '---'}</h3>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {error && <Alert variant="danger" className="border-0 shadow-sm">{error}</Alert>}

            <Card className="border-0 shadow-sm overflow-hidden">
                <Card.Header className="bg-white border-bottom py-3">
                    <h5 className="mb-0 fw-bold text-dark">Classement par Performance</h5>
                </Card.Header>
                <Card.Body className="p-0">
                    <Table responsive hover className="mb-0 align-middle">
                        <thead className="bg-light">
                            <tr>
                                <th className="ps-4 border-0">Serveur</th>
                                <th className="border-0 text-center">Statut</th>
                                <th className="border-0 text-center">Total Vendu</th>
                                <th className="border-0 text-center">Nombre Factures</th>
                                <th className="border-0" style={{ width: '25%' }}>Performance vs Objectif</th>
                                <th className="text-end pe-4 border-0">Dernier Service</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.map((waiter) => {
                                // Objectif fictif de 1000$ pour la démo
                                const progress = Math.min(Math.round((waiter.totalSales / 1000) * 100), 100);
                                return (
                                    <tr key={waiter._id}>
                                        <td className="ps-4">
                                            <div className="d-flex align-items-center">
                                                <div className="bg-light p-2 rounded-circle me-3 text-secondary border">
                                                    <User size={18} />
                                                </div>
                                                <span className="fw-bold text-dark">{waiter.waiterName}</span>
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <Badge bg="success" pill className="px-3" style={{ fontSize: '0.75rem' }}>EN SERVICE</Badge>
                                        </td>
                                        <td className="text-center fw-bold text-primary">
                                            ${waiter.totalSales.toFixed(0)}
                                        </td>
                                        <td className="text-center">
                                            <div className="d-flex align-items-center justify-content-center">
                                                <Zap size={14} className="text-warning me-1" />
                                                {waiter.billsCount}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="d-flex align-items-center justify-content-between mb-1">
                                                <small className="text-muted" style={{ fontSize: '0.7rem' }}>Objectif 1000$</small>
                                                <small className="fw-bold">{progress}%</small>
                                            </div>
                                            <ProgressBar 
                                                now={progress} 
                                                variant={progress > 70 ? "success" : progress > 30 ? "primary" : "warning"}
                                                style={{ height: '6px', borderRadius: '10px' }} 
                                            />
                                        </td>
                                        <td className="text-end pe-4">
                                            <div className="small text-muted fw-medium">
                                                <Clock size={12} className="me-1" />
                                                {new Date(waiter.lastActivity).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default MovementWaiter;