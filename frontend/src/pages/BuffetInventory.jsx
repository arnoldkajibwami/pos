import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Badge, Spinner, Alert } from 'react-bootstrap';
import { Warehouse, AlertTriangle, CheckCircle } from 'lucide-react';
import API_URL from '../api/api'
import axios from 'axios';

const BuffetInventory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStock = async () => {
      try {
        const res = await axios.get('/inventory');
        // Defense check: ensure we always set an array
        setItems(res.data?.inventory || []); 
      } catch (err) {
        setError("Impossible de charger l'inventaire");
      } finally {
        setLoading(false);
      }
    };
    fetchStock();
  }, []);

  if (loading) return <div className="text-center py-5"><Spinner animation="border" variant="warning" /></div>;
  if (error) return <Container className="py-4"><Alert variant="danger">{error}</Alert></Container>;

  return (
    <Container className="py-4 fade-in">
      <Card className="shadow-sm border-0">
        <Card.Body>
          <div className="d-flex align-items-center mb-4">
            <Warehouse size={32} className="text-warning me-3" />
            <h2 className="fw-bold mb-0">Stock Cuisine & Buffet</h2>
          </div>

          <Table responsive hover className="align-middle">
            <thead className="bg-light">
              <tr>
                <th>Ingrédient</th>
                <th>Quantité Actuelle</th>
                <th>État du Stock</th>
                <th>Unité</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map(item => (
                  <tr key={item._id}>
                    <td className="fw-bold">{item.name}</td>
                    <td>{item.stockBar}</td> {/* Note: Changed to stockBar to match your ProductModel */}
                    <td>
                      {item.stockBar < (item.lowStockThreshold || 5) ? (
                        <Badge bg="danger" className="p-2"><AlertTriangle size={14} className="me-1"/> Critique</Badge>
                      ) : (
                        <Badge bg="success" className="p-2"><CheckCircle size={14} className="me-1"/> Optimal</Badge>
                      )}
                    </td>
                    <td><span className="text-muted">{item.unit || 'pcs'}</span></td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="4" className="text-center py-4 text-muted">Aucun article trouvé</td></tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default BuffetInventory;