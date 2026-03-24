// import React, { useState, useEffect, useMemo } from 'react';
// import { Container, Row, Col, Card, Table, Badge, Spinner, Alert, Button, Collapse, ProgressBar } from 'react-bootstrap';
// import { FileText, DollarSign, Calendar, TrendingUp, ChevronDown, ChevronUp, Utensils, Package, Search, RefreshCw } from 'lucide-react';
// import API_URL from '../api/api'
// import axios from 'axios';

// // const API_URL = 'http://localhost:5000/api/v1';

// const BuffetReports = () => {
//     const [report, setReport] = useState({ bills: [], totalRevenue: 0, count: 0 });
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [expandedBill, setExpandedBill] = useState(null);

//     const fetchBuffetData = async () => {
//         try {
//             setLoading(true);
//             const token = localStorage.getItem('token');
//             const res = await axios.get(`${API_URL}/bills/buffet/report`, {
//                 headers: { Authorization: `Bearer ${token}` }
//             });
            
//             setReport({
//                 bills: res.data?.bills || [],
//                 totalRevenue: res.data?.totalRevenue || 0,
//                 count: res.data?.count || (res.data?.bills?.length || 0)
//             });
//             setError(null);
//         } catch (err) {
//             setError("Erreur de connexion au serveur de rapports.");
//             console.error(err);
//         } finally {
//             setLoading(false);
//         }
//     };

//     useEffect(() => {
//         fetchBuffetData();
//     }, []);

//     // --- ANALYSE DE L'INVENTAIRE DES VENTES ---
//     const inventorySales = useMemo(() => {
//         const counts = {};
//         if (!report.bills) return [];
        
//         report.bills.forEach(bill => {
//             bill.items?.forEach(item => {
//                 const name = item.name || "Article Inconnu";
//                 if (!counts[name]) {
//                     counts[name] = { qty: 0, revenue: 0 };
//                 }
//                 counts[name].qty += (item.quantity || 0);
//                 counts[name].revenue += ((item.price || 0) * (item.quantity || 0));
//             });
//         });
//         return Object.entries(counts).sort((a, b) => b[1].qty - a[1].qty);
//     }, [report.bills]);

//     if (loading) return (
//         <div className="d-flex justify-content-center align-items-center" style={{height: '80vh'}}>
//             <Spinner animation="grow" variant="primary" />
//         </div>
//     );

//     return (
//         <Container className="py-4">
//             {/* Header */}
//             <div className="d-flex justify-content-between align-items-center mb-4">
//                 <div>
//                     <h2 className="fw-black text-dark mb-1">Rapports Buffet</h2>
//                     <p className="text-muted small mb-0 text-uppercase tracking-wider">Analyse des ventes et inventaire des sorties</p>
//                 </div>
//                 <Button variant="white" className="shadow-sm border-0 rounded-pill px-3" onClick={fetchBuffetData}>
//                     <RefreshCw size={16} className="me-2 text-primary" /> Actualiser
//                 </Button>
//             </div>

//             {error && <Alert variant="danger" className="border-0 shadow-sm">{error}</Alert>}

//             {/* Statistiques - Top Cards */}
//             <Row className="mb-4 g-3">
//                 {[
//                     { title: "Revenu Total", val: report.totalRevenue, icon: <DollarSign />, color: "bg-primary" },
//                     { title: "Commandes", val: report.count, icon: <FileText />, color: "bg-dark" },
//                     { title: "Articles Vendus", val: inventorySales.reduce((acc, c) => acc + c[1].qty, 0), icon: <Package />, color: "bg-success" }
//                 ].map((stat, i) => (
//                     <Col md={4} key={i}>
//                         <Card className={`border-0 shadow-sm ${stat.color} text-white h-100`}>
//                             <Card.Body className="d-flex align-items-center p-4">
//                                 <div className="bg-white bg-opacity-25 p-3 rounded-circle me-3">
//                                     {stat.icon}
//                                 </div>
//                                 <div>
//                                     <div className="small opacity-75 fw-bold text-uppercase">{stat.title}</div>
//                                     <h3 className="fw-black mb-0">{(stat.val || 0).toLocaleString()} {i === 0 ? 'FC ' : ''}</h3>
//                                 </div>
//                             </Card.Body>
//                         </Card>
//                     </Col>
//                 ))}
//             </Row>

//             <Row className="g-4">
//                 {/* Historique des Ventes (Gauche) */}
//                 <Col lg={8}>
//                     <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
//                         <Card.Header className="bg-white py-3 border-bottom border-light">
//                             <h5 className="mb-0 fw-bold d-flex align-items-center">
//                                 <Search size={20} className="me-2 text-primary"/> Journal des Ventes
//                             </h5>
//                         </Card.Header>
//                         <Card.Body className="p-0">
//                             <Table responsive hover className="mb-0">
//                                 <thead className="bg-light text-muted small uppercase">
//                                     <tr>
//                                         <th className="ps-4 py-3">Client / Date</th>
//                                         <th>Total Payé</th>
//                                         <th className="text-center">Action</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {report.bills.length > 0 ? report.bills.map(bill => (
//                                         <React.Fragment key={bill._id}>
//                                             <tr className="align-middle">
//                                                 <td className="ps-4">
//                                                     <div className="fw-bold">{bill.draftName || "Client Buffet"}</div>
//                                                     <div className="text-muted extra-small">
//                                                         {bill.createdAt ? new Date(bill.createdAt).toLocaleDateString() : 'Date inconnue'}
//                                                     </div>
//                                                 </td>
//                                                 <td className="text-primary fw-bold">
//                                                     {(bill.totalAmount || 0).toLocaleString()} FC 
//                                                 </td>
//                                                 <td className="text-center">
//                                                     <Button 
//                                                         variant={expandedBill === bill._id ? "primary" : "light"}
//                                                         size="sm"
//                                                         className="rounded-pill px-3"
//                                                         onClick={() => setExpandedBill(expandedBill === bill._id ? null : bill._id)}
//                                                     >
//                                                         {expandedBill === bill._id ? 'Fermer' : 'Voir Détails'}
//                                                     </Button>
//                                                 </td>
//                                             </tr>
//                                             <tr>
//                                                 <td colSpan="3" className="p-0 border-0">
//                                                     <Collapse in={expandedBill === bill._id}>
//                                                         <div className="bg-light p-3">
//                                                             <div className="bg-white rounded-3 shadow-sm p-3 border-start border-primary border-4">
//                                                                 <h6 className="small fw-black text-primary text-uppercase mb-3">Composition du repas</h6>
//                                                                 {bill.items?.map((item, i) => (
//                                                                     <div key={i} className="d-flex justify-content-between small border-bottom py-2">
//                                                                         <span><strong>{item.quantity}x</strong> {item.name}</span>
//                                                                         <span className="text-muted">{( (item.price || 0) * (item.quantity || 0) ).toLocaleString()} FC </span>
//                                                                     </div>
//                                                                 ))}
//                                                                 <div className="mt-3 d-flex justify-content-between align-items-center small opacity-75">
//                                                                     <span>Mode: <strong>{bill.paymentMethod}</strong></span>
//                                                                     <span>Serveur: <strong>{bill.waiter?.name || 'N/A'}</strong></span>
//                                                                 </div>
//                                                             </div>
//                                                         </div>
//                                                     </Collapse>
//                                                 </td>
//                                             </tr>
//                                         </React.Fragment>
//                                     )) : (
//                                         <tr><td colSpan="3" className="text-center py-5 text-muted">Aucune donnée trouvée</td></tr>
//                                     )}
//                                 </tbody>
//                             </Table>
//                         </Card.Body>
//                     </Card>
//                 </Col>

//                 {/* Inventaire des Sorties (Droite) */}
//                 <Col lg={4}>
//                     <Card className="border-0 shadow-sm rounded-4 h-100">
//                         <Card.Header className="bg-white py-3 border-bottom border-light">
//                             <h5 className="mb-0 fw-bold d-flex align-items-center">
//                                 <TrendingUp size={20} className="me-2 text-warning"/> Top Articles
//                             </h5>
//                         </Card.Header>
//                         <Card.Body>
//                             {inventorySales.length > 0 ? inventorySales.map(([name, data], idx) => (
//                                 <div key={idx} className="mb-4">
//                                     <div className="d-flex justify-content-between mb-1">
//                                         <span className="fw-bold small">{name}</span>
//                                         <Badge bg="light" text="dark" className="border">{data.qty} portions</Badge>
//                                     </div>
//                                     <ProgressBar 
//                                         now={inventorySales[0][1].qty > 0 ? (data.qty / inventorySales[0][1].qty) * 100 : 0} 
//                                         variant={idx === 0 ? "warning" : "info"} 
//                                         className="rounded-pill"
//                                         style={{ height: '6px' }} 
//                                     />
//                                     <div className="text-end extra-small text-muted mt-1">
//                                         Revenu : {(data.revenue || 0).toLocaleString()} FC 
//                                     </div>
//                                 </div>
//                             )) : (
//                                 <div className="text-center py-5 text-muted">L'inventaire est vide</div>
//                             )}
//                         </Card.Body>
//                     </Card>
//                 </Col>
//             </Row>
//         </Container>
//     );
// };

// export default BuffetReports;

import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Table, Badge, Spinner, Alert, Button, Collapse, ProgressBar } from 'react-bootstrap';
import { FileText, DollarSign, Calendar, TrendingUp, ChevronDown, ChevronUp, Utensils, Package, RefreshCw, CheckCircle } from 'lucide-react';
import API_URL from '../api/api'
import axios from 'axios';

// const API_URL = 'http://localhost:5000/api/v1';

const BuffetReports = () => {
    const [report, setReport] = useState({ bills: [], totalRevenue: 0, count: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedBill, setExpandedBill] = useState(null);

    const fetchBuffetData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/bills/buffet/report`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const bills = res.data?.bills || [];
            
            // Recalcul de sécurité du revenu total si le backend renvoie 0
            const calculatedRevenue = bills.reduce((sum, bill) => {
                const amount = bill.totalAmount > 0 
                    ? bill.totalAmount 
                    : (bill.items?.reduce((a, b) => a + (b.price * b.quantity), 0) || 0);
                return sum + amount;
            }, 0);

            setReport({
                bills: bills,
                totalRevenue: res.data?.totalRevenue > 0 ? res.data.totalRevenue : calculatedRevenue,
                count: res.data?.count || bills.length
            });
            setError(null);
        } catch (err) {
            setError("Impossible de charger les rapports. Vérifiez votre connexion au serveur.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBuffetData(); }, []);

    // --- LOGIQUE INVENTAIRE : TOTAL PAR PRODUIT ---
    const inventorySales = useMemo(() => {
        const counts = {};
        report.bills.forEach(bill => {
            bill.items?.forEach(item => {
                const name = item.name || "Article sans nom";
                if (!counts[name]) counts[name] = { qty: 0, revenue: 0 };
                counts[name].qty += (item.quantity || 0);
                counts[name].revenue += ((item.price || 0) * (item.quantity || 0));
            });
        });
        return Object.entries(counts).sort((a, b) => b[1].qty - a[1].qty);
    }, [report.bills]);

    if (loading) return (
        <div className="d-flex flex-column justify-content-center align-items-center" style={{height: '80vh'}}>
            <Spinner animation="border" variant="primary" />
            <span className="mt-3 text-muted fw-bold">Analyse des données buffet...</span>
        </div>
    );

    return (
        <Container className="py-4 px-lg-5">
            {/* Header Moderne */}
            <div className="d-flex justify-content-between align-items-end mb-5">
                <div>
                    <Badge bg="primary" className="mb-2 px-3 py-2 rounded-pill opacity-75">ADMINISTRATION</Badge>
                    <h1 className="fw-black text-dark mb-0 display-5">Rapports Buffet</h1>
                    <p className="text-muted mb-0">Suivi des ventes finalisées et de l'inventaire des stocks</p>
                </div>
                <Button variant="light" className="rounded-pill shadow-sm border px-4 py-2" onClick={fetchBuffetData}>
                    <RefreshCw size={18} className="me-2 text-primary" /> Actualiser
                </Button>
            </div>

            {error && <Alert variant="danger" className="border-0 shadow-sm rounded-4">{error}</Alert>}

            {/* Statistiques KPI */}
            <Row className="mb-5 g-4">
                {[
                    { label: "REVENU TOTAL", value: `${(report.totalRevenue || 0).toLocaleString()} FC `, icon: <DollarSign />, color: "bg-primary", sub: "Recettes encaissées" },
                    { label: "VENTES CLÔTURÉES", value: report.count, icon: <CheckCircle />, color: "bg-dark", sub: "Factures finalisées" },
                    { label: "PORTIONS SERVIES", value: inventorySales.reduce((a, b) => a + b[1].qty, 0), icon: <Utensils />, color: "bg-info text-white", sub: "Volume total sorties" }
                ].map((kpi, i) => (
                    <Col lg={4} key={i}>
                        <Card className={`border-0 shadow-lg ${kpi.color} text-white rounded-4 overflow-hidden`}>
                            <Card.Body className="p-4">
                                <div className="d-flex justify-content-between align-items-start">
                                    <div>
                                        <div className="small fw-bold opacity-75 mb-1">{kpi.label}</div>
                                        <h2 className="fw-black mb-1">{kpi.value}</h2>
                                        <div className="small opacity-50">{kpi.sub}</div>
                                    </div>
                                    <div className="bg-white bg-opacity-20 p-3 rounded-3">{kpi.icon}</div>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Row className="g-4">
                {/* Liste des factures */}
                <Col xl={8}>
                    <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                        <Card.Header className="bg-white border-0 py-4 px-4">
                            <h5 className="fw-black mb-0 d-flex align-items-center">
                                <FileText className="me-2 text-primary" size={20}/> Historique des Ventes
                            </h5>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <Table responsive hover className="mb-0">
                                <thead className="bg-light text-muted small">
                                    <tr>
                                        <th className="ps-4 border-0">CLIENT / TABLE</th>
                                        <th className="border-0">DATE</th>
                                        <th className="border-0">MONTANT TOTAL</th>
                                        <th className="text-end pe-4 border-0">ACTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.bills.map(bill => {
                                        // Calcul du prix total si stocké à 0
                                        const displayTotal = bill.totalAmount > 0 
                                            ? bill.totalAmount 
                                            : bill.items?.reduce((a, b) => a + (b.price * b.quantity), 0);

                                        return (
                                            <React.Fragment key={bill._id}>
                                                <tr className="align-middle border-top">
                                                    <td className="ps-4">
                                                        <div className="fw-bold text-dark">{bill.draftName || "Client Anonyme"}</div>
                                                        <small className="text-muted text-uppercase" style={{fontSize: '10px'}}>ID: {bill._id.slice(-6)}</small>
                                                    </td>
                                                    <td className="small">{new Date(bill.createdAt).toLocaleDateString()}</td>
                                                    <td>
                                                        <span className="fw-black text-primary">{(displayTotal || 0).toLocaleString()} FC </span>
                                                    </td>
                                                    <td className="text-end pe-4">
                                                        <Button 
                                                            variant={expandedBill === bill._id ? "secondary" : "outline-primary"}
                                                            size="sm"
                                                            className="rounded-pill px-3 fw-bold"
                                                            onClick={() => setExpandedBill(expandedBill === bill._id ? null : bill._id)}
                                                        >
                                                            {expandedBill === bill._id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                                        </Button>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td colSpan="4" className="p-0 border-0">
                                                        <Collapse in={expandedBill === bill._id}>
                                                            <div className="bg-light p-3 px-4">
                                                                <div className="bg-white rounded-3 p-3 shadow-sm border-start border-4 border-primary">
                                                                    <div className="d-flex justify-content-between mb-2">
                                                                        <h6 className="fw-black small text-muted text-uppercase mb-0">Détails de la commande</h6>
                                                                        <Badge bg="success" className="rounded-pill">PAYÉ ({bill.paymentMethod})</Badge>
                                                                    </div>
                                                                    {bill.items?.map((item, idx) => (
                                                                        <div key={idx} className="d-flex justify-content-between py-2 border-bottom border-light small">
                                                                            <span><strong>{item.quantity}x</strong> {item.name}</span>
                                                                            <span className="fw-bold">{(item.price * item.quantity).toLocaleString()} FC </span>
                                                                        </div>
                                                                    ))}
                                                                    <div className="mt-3 small text-muted d-flex justify-content-between">
                                                                        <span>Serveur : <strong>{bill.waiter?.name || 'Inconnu'}</strong></span>
                                                                        <span>Heure : <strong>{new Date(bill.createdAt).toLocaleTimeString()}</strong></span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Collapse>
                                                    </td>
                                                </tr>
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Inventaire des sorties */}
                <Col xl={4}>
                    <Card className="border-0 shadow-sm rounded-4 h-100">
                        <Card.Header className="bg-white border-0 py-4 px-4">
                            <h5 className="fw-black mb-0 d-flex align-items-center">
                                <TrendingUp className="me-2 text-warning" size={20}/> Performance Produits
                            </h5>
                        </Card.Header>
                        <Card.Body className="px-4">
                            {inventorySales.map(([name, data], idx) => (
                                <div key={idx} className="mb-4">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <span className="fw-bold text-dark small">{name}</span>
                                        <span className="badge bg-light text-dark border">{data.qty} portions</span>
                                    </div>
                                    <ProgressBar 
                                        now={inventorySales[0][1].qty > 0 ? (data.qty / inventorySales[0][1].qty) * 100 : 0} 
                                        variant={idx === 0 ? "warning" : "info"}
                                        style={{ height: '7px' }}
                                        className="rounded-pill"
                                    />
                                    <div className="d-flex justify-content-between mt-2" style={{fontSize: '11px'}}>
                                        <span className="text-muted text-uppercase">Chiffre d'affaires</span>
                                        <span className="fw-bold text-primary">{(data.revenue || 0).toLocaleString()} FC </span>
                                    </div>
                                </div>
                            ))}
                            {inventorySales.length === 0 && (
                                <div className="text-center py-5">
                                    <Package size={40} className="text-light mb-2" />
                                    <p className="text-muted small">Aucun inventaire à afficher</p>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default BuffetReports;