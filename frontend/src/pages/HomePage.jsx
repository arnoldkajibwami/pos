import React from 'react';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';
// Updated icons to lucide-react for modern look
import { Utensils, ArrowRight, Clock, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom'

const HomePage = () => {
    return (
        <Container fluid className="p-0">
            {/* Hero Section */}
            <div className="hero-section"
                >
                <div className="hero-overlay"></div>
                <div className="hero-content">
                    <h1 className="display-3" style={{color:"white"}}>Culinary Excellence. Every Plate.</h1>
                    <p className="lead mb-5 text-shadow-lg">
                        Experience the finest local ingredients and inspired global cuisine in an elegant setting.
                    </p>
                    <Link to="https://Auctuxrestomenu.netlify.app">
                        <Button variant="primary" size="lg" className='me-3 btn-primary-resto'>
                            <Utensils className="me-2" size={20} /> Our Menu
                        </Button>
                    </Link>
                    {/* Link to POS login for staff */}
                    <Button variant="outline-light" size="lg" className="rounded-pill border-2" href="/login">
                        Staff Login <ArrowRight size={20} />
                    </Button>
                </div>
            </div>

            {/* About Snippet & Info Cards */}
            <Container className="my-5 py-5">
                <Row className='g-5 justify-content-center'>
                    <Col lg={5} className="text-start">
                        <h4 className="text-uppercase text-muted mb-2">Our Philosophy</h4>
                        <h2 className="text-dark fw-bold mb-4">Crafting Unforgettable Dining Moments Since 2015.</h2>
                        <p className="text-secondary fs-6">
                            Founded in 2015, we've committed ourselves to delivering fresh, farm-to-table dining in an atmosphere of rustic elegance. Our chefs travel globally for inspiration, ensuring every plate is both a classic and a surprise. We believe food is memory, and we're here to help you create unforgettable moments.
                        </p>
                        <Button variant="link" className="text-primary-resto fw-bold p-0 mt-3">
                            Read Our Full Story <ArrowRight size={18} className="ms-1" />
                        </Button>
                    </Col>
                    <Col lg={3} md={6}>
                        <Card className="modern-card p-4 h-100 shadow-sm">
                            <Clock size={30} className='text-secondary-accent mb-3' />
                            <Card.Title className='fw-bold text-dark'>Operating Hours</Card.Title>
                            <Card.Text className='text-muted'>
                                <p className="mb-1"><strong>Mon - Fri:</strong> 11:00 AM - 10:00 PM</p>
                                <p className="mb-1"><strong>Sat - Sun:</strong> 9:00 AM - 11:00 PM</p>
                            </Card.Text>
                        </Card>
                    </Col>
                    <Col lg={3} md={6}>
                        <Card className="modern-card p-4 h-100 shadow-sm">
                            <MapPin size={30} className='text-primary-resto mb-3' />
                            <Card.Title className='fw-bold text-dark'>Find Us</Card.Title>
                            <Card.Text className='text-muted'>
                                <p className="mb-1">123 Restaurant Lane,</p>
                                <p className="mb-1">Downtown City, 90210</p>
                            </Card.Text>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </Container>
    );
};

export default HomePage;
