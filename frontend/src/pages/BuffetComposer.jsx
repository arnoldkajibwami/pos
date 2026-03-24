import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, ListGroup, Badge, Form, Spinner, InputGroup, Nav } from 'react-bootstrap';
import { Utensils, Plus, Save, Search, Trash2, FileText, Printer, RefreshCw, X } from 'lucide-react';
import API_URL from '../api/api'
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { useSearchParams, useNavigate } from 'react-router-dom';

// const API_URL = 'http://localhost:5000/api/v1';

const BuffetComposer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [ingredients, setIngredients] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  
  const [customerName, setCustomerName] = useState('');
  const [isPromotion, setIsPromotion] = useState(false);
  const [promoPrice, setPromoPrice] = useState(15000);

  // 1. Chargement initial des ingrédients
  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const response = await axios.get(`${API_URL}/products/buffet-ingredients`);
        setIngredients(response.data.products || []);
      } catch (error) {
        toast.error("Erreur de chargement du buffet");
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchIngredients();
  }, [user]);


useEffect(() => {
  const loadDraftToEdit = async () => {
  if (!editId) return;
  try {
    const res = await axios.get(`${API_URL}/bills/${editId}`);
    const data = res.data; // Le backend renvoie directement l'objet bill

    if (data && data.items) {
      // Dans votre backend, le nom est dans customerName
      setCustomerName(data.customerName || '');
      
      const mappedCart = data.items.map(item => ({
        product: item.product,
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity)
      }));

      setCart(mappedCart);

      // On vérifie si c'est une promo via le champ totalAmount
      if (data.totalAmount) {
        const calculatedTotal = mappedCart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        if (Number(data.totalAmount) !== calculatedTotal) {
          setIsPromotion(true);
          setPromoPrice(data.totalAmount);
        }
      }
    }
  } catch (err) {
    console.error("Erreur 404 ou autre:", err);
    toast.error("Le brouillon est introuvable sur le serveur");
  }
};
  loadDraftToEdit();
}, [editId]);

  const categories = ['all', ...new Set(ingredients.map(i => i.category))];

  // --- LOGIQUE PANIER ---
  const addToCart = (item) => {
    const exists = cart.find(i => i.product === item._id);
    if (exists) {
      setCart(cart.map(i => i.product === item._id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart([...cart, { product: item._id, name: item.name, price: item.price, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product !== productId));
  };

  const calculateSubtotal = () => cart.reduce((s, i) => s + (i.price * i.quantity), 0);
  const finalPrice = isPromotion ? Number(promoPrice) : calculateSubtotal();

  // --- IMPRESSION ---
  const printBuffetTicket = (data) => {
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    const itemsHtml = data.items.map(item => `
      <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 5px;">
        <span>${item.quantity}x ${item.name}</span>
        <span>${(item.price * item.quantity).toLocaleString()} FC </span>
      </div>`).join('');

    printWindow.document.write(`
      <html>
        <head><style>body { font-family: 'Courier New'; width: 80mm; padding: 10px; } .header{text-align:center; border-bottom:1px dashed #000; padding-bottom:10px;} .total{font-weight:bold; font-size:18px; margin-top:10px; display:flex; justify-content:space-between;}</style></head>
        <body>
          <div class="header">
            <h3>RESTO FIDELITY</h3>
            <p>BUFFET - ${editId ? 'MODIFICATION' : 'BON'}</p>
            <p><b>CLIENT: ${data.customerName}</b></p>
          </div>
          <div style="margin-top:10px;">${itemsHtml}</div>
          <div class="total"><span>TOTAL:</span><span>${data.totalAmount.toLocaleString()} FC </span></div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>`);
    printWindow.document.close();
  };

  // --- SAUVEGARDE (POST ou PUT) ---
  const handleSave = async () => {
    if (cart.length === 0) return toast.warning("Le plat est vide !");
    setIsSaving(true);
    
    try {
      const payload = {
        draftName: `Buffet - ${customerName || 'Buffet'}`,
        items: cart.map(item => ({
          product: item.product,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        totalAmount: finalPrice,
        waiter: user.userId || user._id,
        isBuffet: true 
      };

      if (editId) {
        await axios.put(`${API_URL}/bills/drafts/${editId}`, payload);
        toast.success("Modification enregistrée !");
      } else {
        await axios.post(`${API_URL}/bills/drafts`, payload);
        toast.success("Nouveau plat enregistré !");
      }
      
      printBuffetTicket({ customerName: customerName || 'Buffet', items: cart, totalAmount: finalPrice });
      navigate('/buffet/drafts');

    } catch (error) {
      toast.error(error.response?.data?.msg || "Erreur de sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredItems = ingredients.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || item.category === activeTab;
    return matchesSearch && matchesTab;
  });

  if (loading) return <div className="d-flex justify-content-center align-items-center vh-100"><Spinner animation="grow" variant="warning" /></div>;

  return (
    <Container fluid className="px-4 py-3 bg-light min-vh-100">
      <Row className="g-4">
        <Col lg={8} xl={9}>
          <header className="mb-4 d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 fw-bold text-dark mb-1">
                {editId ? <><RefreshCw className="text-primary me-2"/> Modification du Plat</> : "Composition Buffet"}
              </h1>
              <Badge bg={editId ? "primary" : "warning"} text="dark">
                {editId ? `Édition du brouillon #${editId.slice(-6)}` : "Nouveau Plat"}
              </Badge>
            </div>
            <InputGroup className="w-auto shadow-sm rounded-pill bg-white overflow-hidden border-0">
              <InputGroup.Text className="bg-white border-0"><Search size={18} className="text-muted"/></InputGroup.Text>
              <Form.Control placeholder="Rechercher..." className="border-0 shadow-none" onChange={(e) => setSearchTerm(e.target.value)} />
            </InputGroup>
          </header>

          <Nav variant="pills" className="mb-4 gap-2">
            {categories.map(cat => (
              <Nav.Item key={cat}>
                <Nav.Link active={activeTab === cat} onClick={() => setActiveTab(cat)} className={`rounded-pill px-4 fw-bold shadow-sm ${activeTab === cat ? 'bg-warning text-dark' : 'bg-white text-muted'}`}>
                  {cat === 'all' ? 'Tout' : cat.replace('Buffet-', '')}
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav>

          <Row className="g-3">
            {filteredItems.map(item => (
              <Col md={4} xl={3} key={item._id}>
                <Card className="border-0 shadow-sm h-100 rounded-4 overflow-hidden hover-card" onClick={() => addToCart(item)} style={{cursor: 'pointer'}}>
                  <Card.Body className="p-3 text-center">
                    <div className="bg-light rounded-3 mb-2 py-3">
                       {item.image ? <img src={item.image} style={{height: '60px'}} alt={item.name}/> : <Utensils size={30} className="text-muted opacity-50"/>}
                    </div>
                    <h6 className="fw-bold mb-1 text-dark">{item.name}</h6>
                    <Badge bg="light" text="dark" className="border">{item.price.toLocaleString()} FC </Badge>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Col>

        <Col lg={4} xl={3}>
          <Card className="border-0 shadow-lg rounded-4 sticky-top" style={{top: '1rem'}}>
            <Card.Header className="bg-white border-0 pt-4 px-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0 d-flex align-items-center">
                  <FileText size={20} className="me-2 text-warning"/> Résumé
                </h5>
                {editId && <Button variant="link" size="sm" className="text-danger p-0" onClick={() => navigate('/buffet/drafts')}><X size={20}/></Button>}
              </div>
              <Form.Control placeholder="Nom du Client / Table" className="bg-light border-0 py-2 rounded-3 shadow-none fw-bold" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </Card.Header>

            <Card.Body className="px-4">
              <ListGroup variant="flush" className="mb-4" style={{maxHeight: '300px', overflowY: 'auto'}}>
                {cart.length === 0 ? <div className="text-center py-5 text-muted small">Plat vide</div> : 
                  cart.map(item => (
                    <ListGroup.Item key={item.product} className="px-0 py-2 bg-transparent d-flex justify-content-between align-items-center border-bottom-dashed">
                      <div className="small fw-bold w-50">{item.name}</div>
                      <div className="d-flex align-items-center gap-2">
                        <Button size="sm" variant="light" className="rounded-circle p-0" style={{width:24, height:24}} onClick={() => removeFromCart(item.product)}><Trash2 size={12} className="text-danger"/></Button>
                        <span className="small fw-bold mx-1">{item.quantity}</span>
                        <Button size="sm" variant="warning" className="rounded-circle p-0" style={{width:24, height:24}} onClick={() => addToCart({_id: item.product, name: item.name, price: item.price})}><Plus size={12}/></Button>
                      </div>
                    </ListGroup.Item>
                  ))}
              </ListGroup>

              <div className="bg-light p-3 rounded-4 mb-3">
                <div className="d-flex justify-content-between align-items-center small fw-bold mb-2">
                  <span>PRIX FIXE / PROMO ?</span>
                  <Form.Check type="switch" checked={isPromotion} onChange={(e) => setIsPromotion(e.target.checked)} />
                </div>
                {isPromotion && (
                   <InputGroup size="sm">
                    <Form.Control type="number" value={promoPrice} onChange={(e) => setPromoPrice(e.target.value)} />
                    <InputGroup.Text>FC </InputGroup.Text>
                   </InputGroup>
                )}
              </div>

              <div className="d-flex justify-content-between align-items-center mb-4 border-top pt-3">
                <span className="fw-bold text-muted small">TOTAL</span>
                <span className="h4 mb-0 fw-black text-primary">{finalPrice.toLocaleString()} FC </span>
              </div>

              <Button 
                variant={editId ? "primary" : "dark"} 
                className="w-100 py-3 rounded-4 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
                disabled={cart.length === 0 || isSaving}
                onClick={handleSave}
              >
                {isSaving ? <Spinner size="sm"/> : editId ? <><Save size={18}/> ENREGISTRER</> : <><Printer size={18}/> IMPRIMER & SAUVEGARDER</>}
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default BuffetComposer;