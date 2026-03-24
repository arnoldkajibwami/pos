// Fichier : DetailedInventoryReport.jsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Card, Alert, Spinner, Table, Button, Form, Row, Col, Badge
} from 'react-bootstrap';
import { Printer, RefreshCw, DollarSign, Package } from 'lucide-react'; 
import API_URL from '../api/api'
import axios from 'axios';

// ====================================================================
// UTILITAIRES 
// ====================================================================
// const API_URL = 'http://localhost:5000/api/v1';  // test
// const API_URL= axios.create({ 
  // baseURL:  //`${window.location.origin}/api/v1` 
//}); 

const formatCurrency = (amount) => {
    // Basic formatting function, enhance as needed (e.g., using Intl.NumberFormat)
    return `$${Number(amount).toFixed(0)}`;
};

const DetailedInventoryReport = () => {
    // --- 🎯 State pour le rapport et le débogage ---
    const [detailedReport, setDetailedReport] = useState(null);
    const [isReportLoading, setIsReportLoading] = useState(false);
    const [debugMessage, setDebugMessage] = useState(null); 
    // ----------------------------------------------------
    
    // Default filter for the current month
    const today = new Date();
    // 🎯 CORRECTION: Utiliser une date historique pour le début de l'année 
    // pour garantir que les données de vente sont capturées au chargement initial.
    const historicStartDate = '2024-01-01'; // Date de début plus large
    const todayDate = today.toISOString().split('T')[0]; // Date de fin = aujourd'hui

    const [reportFilter, setReportFilter] = useState({
        startDate: historicStartDate, // Utilisation de la date historique corrigée
        endDate: todayDate,
    });

    const printableRef = useRef(); // Ref for the printable area

    // ====================================================================
    // API FETCH FUNCTION
    // ====================================================================
    const fetchDetailedInventoryReport = useCallback(async () => {
        setIsReportLoading(true);
        setDebugMessage(null); 
        setDetailedReport(null); 
        
        try {
            // URL corrigée : /inventory/reports/detailed-report
            const url = `${API_URL}/inventory/reports/detailed-report?startDate=${reportFilter.startDate}&endDate=${reportFilter.endDate}`;
            const response = await axios.get(url);

            const data = response.data;
            
            if (data.report && Array.isArray(data.report)) {
                setDetailedReport(data.report);
            } else if (Array.isArray(data)) {x  
                 setDetailedReport(data);
            }

            if (data.debugInfo) {
                // console.error("DEBUG INFO: L'agrégation est vide. Vérifiez le filtre MongoDB ci-dessous.");
                // console.log("Filtre MongoDB utilisé:", data.debugInfo.mongoDBFilter);
                // console.log("Dates ISODate générées (UTC):", { start: data.debugInfo.startISODate, end: data.debugInfo.endISODate });
                // setDebugMessage(data.debugInfo.message);
                setDebugMessage("Aucun Rapport");
            } else if (data.report && data.report.length === 0) {
                setDebugMessage("Aucune donnée de vente ou d'inventaire trouvée pour la période sélectionnée.");
            }

        } catch (error) {
            console.error('Error fetching detailed inventory report:', error);
            const apiError = error.response ? `[Status ${error.response.status}] ${error.message}` : error.message;
            setDebugMessage(`Erreur de connexion API: ${apiError}. Vérifiez si le backend (Render) est actif et la route correcte.`);
        } finally {
            setIsReportLoading(false);
        }
    }, [reportFilter]);

    // Fetch report on component mount or filter change
    useEffect(() => {
        fetchDetailedInventoryReport();
    }, [fetchDetailedInventoryReport]);

    // ====================================================================
    // A4 PRINTING LOGIC 
    // ====================================================================
    const handlePrint = () => {
        // Logique d'impression A4... 
        const printContent = printableRef.current;
        if (printContent) {
            const printWindow = window.open('', '_blank', 'height=600,width=800');
            
            // --- A4 Specific Print Styles (CSS) ---
            const a4PrintStyles = `
                @page {
                    size: A4;
                    margin: 1cm;
                }
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                }
                .print-area {
                    width: 100%;
                    padding: 0;
                }
                .table-responsive {
                    overflow: visible !important; 
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 0;
                    font-size: 9pt;
                    page-break-inside: auto;
                }
                tr { 
                    page-break-inside: avoid; 
                    page-break-after: auto; 
                }
                thead { 
                    display: table-header-group; 
                }
                th, td {
                    border: 1px solid #000;
                    padding: 4px;
                    text-align: left;
                }
                .no-print {
                    display: none !important;
                }
                .text-end {
                    text-align: right;
                }
                .stock-column {
                    width: 10%; 
                }
                .name-column {
                    width: 30%;
                }
            `;

            printWindow.document.write('<html><head><title>Rapport d\'Inventaire Détaillé</title>');
            printWindow.document.write(`<style>${a4PrintStyles}</style>`);
            printWindow.document.write('<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" crossorigin="anonymous">');
            printWindow.document.write('</head><body>');
            printWindow.document.write('<div class="print-area">');
            printWindow.document.write(printContent.innerHTML);
            printWindow.document.write('</div>');
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            
            printWindow.onload = () => {
                printWindow.print();
            };
        }
    };

    // Calculate Summary Totals
    const totalRevenue = detailedReport?.reduce((acc, item) => acc + (item.totalRevenue || 0), 0) || 0;
    const totalProfit = detailedReport?.reduce((acc, item) => acc + (item.totalProfit || 0), 0) || 0;
    const totalQuantitySold = detailedReport?.reduce((acc, item) => acc + (item.totalQuantitySold || 0), 0) || 0;

    return (
        <Card className="mt-3">
            <Card.Header className="no-print">
                <Row className="align-items-center">
                    <Col xs={12} md={6}>
                        <h5 className="mb-0">Rapport Détaillé d'Inventaire (Ventes & Stock)</h5>
                        <p className="text-muted mb-0" style={{ fontSize: '0.8rem' }}>
                            Période du **{reportFilter.startDate}** au **{reportFilter.endDate}**
                        </p>
                    </Col>
                    <Col xs={12} md={6} className="text-end">
                        <Button variant="primary" onClick={handlePrint} disabled={isReportLoading || !detailedReport || detailedReport.length === 0} className="no-print">
                            <Printer size={18} className="me-2" /> Imprimer (A4)
                        </Button>
                    </Col>
                </Row>
            </Card.Header>
            <Card.Body>
                {/* Filter controls - Mark as no-print */}
                <Form className="mb-3 no-print">
                    <Row>
                        <Col md={4}>
                            <Form.Group controlId="reportStartDate">
                                <Form.Label>Date Début</Form.Label>
                                <Form.Control 
                                    type="date" 
                                    value={reportFilter.startDate} 
                                    onChange={(e) => setReportFilter(prev => ({ ...prev, startDate: e.target.value }))}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group controlId="reportEndDate">
                                <Form.Label>Date Fin</Form.Label>
                                <Form.Control 
                                    type="date" 
                                    value={reportFilter.endDate} 
                                    onChange={(e) => setReportFilter(prev => ({ ...prev, endDate: e.target.value }))}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4} className="d-flex align-items-end">
                            <Button onClick={fetchDetailedInventoryReport} disabled={isReportLoading}>
                                <RefreshCw size={16} className="me-2" /> Actualiser
                            </Button>
                        </Col>
                    </Row>
                </Form>
                
                {/* Affichage du message de débogage */}
                {/* {debugMessage && (
                    <Alert variant="warning" className="no-print">
                        **{debugMessage}**
                        <br/>
                        veillez revoir la date
                    </Alert>
                )} */}
                
                {/* Printable Area */}
                <div ref={printableRef} className="print-area">
                    {/* Print Header */}
                    <div className="header-info mb-3 d-none d-print-block text-center">
                        <h5>RAPPORT D'INVENTAIRE DÉTAILLÉ</h5>
                        <p>Période du {reportFilter.startDate} au {reportFilter.endDate}</p>
                        <hr/>
                    </div>

                    {/* Summary Badges */}
                    <Row className="mb-3 no-print">
                        <Col md={4}>
                            <Card className="shadow-sm border-success">
                                <Card.Body className="p-2">
                                    <h6 className="mb-0 text-success"><DollarSign size={16} /> Bénéfice Total</h6>
                                    <p className="mb-0 fs-5 fw-bold">{formatCurrency(totalProfit)}</p>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={4}>
                            <Card className="shadow-sm border-primary">
                                <Card.Body className="p-2">
                                    <h6 className="mb-0 text-primary">Revenu Total</h6>
                                    <p className="mb-0 fs-5 fw-bold">{formatCurrency(totalRevenue)}</p>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={4}>
                            <Card className="shadow-sm border-info">
                                <Card.Body className="p-2">
                                    <h6 className="mb-0 text-info">Quantité Vendue</h6>
                                    <p className="mb-0 fs-5 fw-bold">{totalQuantitySold.toLocaleString()}</p>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* Report Table */}
                    {isReportLoading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" />
                            <p>Chargement du rapport...</p>
                        </div>
                    ) : detailedReport && detailedReport.length > 0 ? (
                        <div className="table-responsive">
                            <Table striped bordered size="sm" className="mb-0">
                                <thead>
                                    <tr>
                                        <th className="name-column">Produit</th> 
                                        <th className="text-end">Ventes (Qté)</th>
                                        <th className="text-end">Revenu (Détails Ventes)</th>
                                        <th className="text-end">Bénéfice (Détails Bénéfice)</th>
                                        <th className="text-end stock-column">Stock Actuel (Bar) <Package size={14} className="ms-1"/></th> 
                                        <th className="text-end stock-column">Stock Actuel (Gén.) <Package size={14} className="ms-1"/></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detailedReport.map((item, index) => (
                                        <tr key={item.productId || index}>
                                            <td>{item.productName}</td>
                                            <td className="text-end">{(item.totalQuantitySold || 0).toLocaleString()}</td>
                                            <td className="text-end">{formatCurrency(item.totalRevenue || 0)}</td>
                                            <td className="text-end">
                                                <Badge bg={(item.totalProfit || 0) >= 0 ? 'success' : 'danger'}>
                                                    {formatCurrency(item.totalProfit || 0)}
                                                </Badge>
                                            </td>
                                            <td className="text-end stock-column">{(item.currentStockBar || 0).toLocaleString()}</td>
                                            <td className="text-end stock-column">{(item.currentStockGeneral || 0).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="fw-bold table-light">
                                        <td>TOTAL GÉNÉRAL</td>
                                        <td className="text-end">{totalQuantitySold.toLocaleString()}</td>
                                        <td className="text-end">{formatCurrency(totalRevenue)}</td>
                                        <td className="text-end text-success">{formatCurrency(totalProfit)}</td>
                                        <td colSpan="2"></td> 
                                    </tr>
                                </tfoot>
                            </Table>
                        </div>
                    ) : (
                        <Alert variant="info" className="text-center">
                            {debugMessage ? 'Données non disponibles (voir avertissement ci-dessus).' : "Aucune donnée de vente ou d'inventaire trouvée pour la période sélectionnée."}
                        </Alert>
                    )}
                    
                    {/* Print Footer/Signature */}
                    <div className="mt-5 d-none d-print-block">
                        <Row>
                            <Col className="text-start">Fait à: _______________</Col>
                            <Col className="text-end">Signature: _______________</Col>
                        </Row>
                    </div>
                </div>
            </Card.Body>
        </Card>
    );
};

export default DetailedInventoryReport;