import React, { useState, useRef } from 'react';
import { Container, Card, Form, Button, Row, Col, InputGroup, Image } from 'react-bootstrap';
import { Utensils, Save, ArrowLeft, Camera, X, CheckCircle , Badge } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API_URL from '../api/api'
import axios from 'axios';
import { toast } from 'react-toastify';

// const API_URL = 'https://posbackend-usko.onrender.com/api';

const AddBuffetItem = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    category: 'Buffet-Accompagnement',
    isStockTracked: false,
    image: null
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        return toast.error("L'image est trop lourde (Max 2MB)");
      }
      setFormData({ ...formData, image: file });
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, image: null });
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use FormData for multipart/form-data
      const data = new FormData();
      
      // Clean data to prevent Mongoose ValidationErrors
      data.append('name', formData.name.trim());
      data.append('price', Number(formData.price) || 0);
      data.append('category', formData.category);
      data.append('isStockTracked', formData.isStockTracked);
      
      // LOGIC: Tagging for the Buffet system
      data.append('isBuffetPortion', true);
      data.append('sellable', false); 

      if (formData.image) {
        data.append('image', formData.image);
      }

      const response = await axios.post(`${API_URL}/products/buffet`, data, {
        headers: { 
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.status === 200 || response.status === 201) {
        toast.success(
            <div className="small">
                <strong className='d-block'>Article Enregistré</strong>
                <span>{formData.name} est prêt pour la composition.</span>
            </div>
        );

        // Reset
        setFormData({ name: '', price: 0, category: 'Buffet-Accompagnement', isStockTracked: false, image: null });
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      
    } catch (error) {
      console.error("Upload Error:", error);
      const errorMsg = error.response?.data?.msg || "Vérifiez la connexion au serveur.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Button variant="light" className="shadow-sm border" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} className="me-2" /> Retour
        </Button>
        <div className="text-end">
            <h3 className="fw-bold mb-0 text-dark">Ajouter au Buffet</h3>
            <p className="text-muted small mb-0">Configuration des ingrédients et portions</p>
        </div>
      </div>

      <Row className="justify-content-center">
        <Col md={11} lg={9}>
          <Card className="shadow-lg border-0 rounded-4 overflow-hidden">
            <Row className="g-0">
              {/* Media Section */}
              <Col md={5} className="bg-light border-end d-flex flex-column align-items-center justify-content-center p-4">
                <div 
                  className="position-relative bg-white shadow-sm border-2 border-dashed rounded-4 d-flex align-items-center justify-content-center overflow-hidden"
                  style={{ width: '100%', maxWidth: '250px', aspectRatio: '1/1' }}
                >
                  {imagePreview ? (
                    <>
                      <Image src={imagePreview} className="h-100 w-100 object-fit-cover" />
                      <Button 
                        variant="danger" 
                        size="sm" 
                        className="position-absolute top-0 end-0 m-2 rounded-circle"
                        onClick={removeImage}
                      >
                        <X size={16} />
                      </Button>
                    </>
                  ) : (
                    <label htmlFor="image-upload" className="text-center p-3 m-0" style={{ cursor: 'pointer' }}>
                      <Camera size={48} className="text-warning mb-2 opacity-75" />
                      <p className="fw-bold small text-muted mb-0">CLIQUEZ POUR AJOUTER</p>
                      <small className="text-muted" style={{ fontSize: '0.65rem' }}>PNG, JPG (Max 2MB)</small>
                    </label>
                  )}
                </div>
                <input ref={fileInputRef} id="image-upload" type="file" hidden accept="image/*" onChange={handleImageChange} />
              </Col>

              {/* Data Section */}
              <Col md={7}>
                <Card.Body className="p-4 p-lg-5">
                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-4">
                      <Form.Label className="small fw-bold text-uppercase text-muted">Nom de l'article</Form.Label>
                      <Form.Control
                        required
                        size="lg"
                        placeholder="Ex: Riz au Gras"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="bg-light border-0"
                      />
                    </Form.Group>

                    <Row className="mb-4">
                      <Col xs={6}>
                        <Form.Label className="small fw-bold text-uppercase text-muted">Prix Unitaire</Form.Label>
                        <InputGroup>
                          <Form.Control
                            type="number"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            className="bg-light border-0"
                          />
                          <InputGroup.Text className="bg-light border-0 fw-bold">FC </InputGroup.Text>
                        </InputGroup>
                      </Col>
                      <Col xs={6}>
                        <Form.Label className="small fw-bold text-uppercase text-muted">Type</Form.Label>
                        <Form.Select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="bg-light border-0"
                        >
                          <option value="Buffet-Viande">Protéines</option>
                          <option value="Buffet-Accompagnement">Accompagnement</option>
                          <option value="Buffet-Entrée">Entrées</option>
                          <option value="Buffet-Dessert">Desserts</option>
                        </Form.Select>
                      </Col>
                    </Row>

                    <div className="bg-light p-3 rounded-3 mb-5 border-start border-warning border-4 shadow-sm">
                      <Form.Check
                        type="switch"
                        id="stock-track"
                        label={<span className="fw-bold small">DÉDUIRE DU STOCK BAR ?</span>}
                        checked={formData.isStockTracked}
                        onChange={(e) => setFormData({ ...formData, isStockTracked: e.target.checked })}
                      />
                      <small className="text-muted d-block mt-1" style={{ fontSize: '0.7rem' }}>
                        Activez ceci pour les boissons ou ingrédients pré-emballés.
                      </small>
                    </div>

                    <Button 
                      variant="warning" 
                      type="submit" 
                      className="w-100 py-3 fw-bold text-dark shadow d-flex align-items-center justify-content-center"
                      disabled={loading}
                    >
                      {loading ? 'Enregistrement...' : <><Save className="me-2" size={18} /> VALIDER L'ARTICLE</>}
                    </Button>
                  </Form>
                </Card.Body>
              </Col>
            </Row>
          </Card>
          
          <div className="text-center mt-4">
              <Badge bg="info" className="p-2 fw-normal opacity-75">
                <CheckCircle size={14} className="me-1" /> Sécurité POS Activée : Invisible sur le terminal standard.
              </Badge>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default AddBuffetItem;
