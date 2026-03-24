import React from 'react';
import { Container, Row, Col, Form, Button, Card } from 'react-bootstrap';
// Updated icons to lucide-react
import { Phone, MapPin, Mail, Send } from 'lucide-react';

const ContactPage = () => {
    return (
        <Container className="py-5">
            <h1 className="text-center mb-2 fw-light text-primary-resto">Reservations & Enquiries</h1>
            <h2 className="text-center mb-5 fw-bold text-dark">We'd Love to Hear From You</h2>
            
            <Row className="g-5">
                {/* Contact Form */}
                <Col md={6}>
                    <Card className="modern-card p-4 shadow-lg">
                        <Card.Title className='mb-4 fw-bold text-dark'>Send Us a Message</Card.Title>
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-medium">Name</Form.Label>
                                <Form.Control type="text" placeholder="Your full name" size="lg" className="rounded-3" />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-medium">Email address</Form.Label>
                                <Form.Control type="email" placeholder="email@example.com" size="lg" className="rounded-3" />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-medium">Subject (Optional)</Form.Label>
                                <Form.Control type="text" placeholder="Reservation, Catering, Feedback..." size="lg" className="rounded-3" />
                            </Form.Group>
                            <Form.Group className="mb-4">
                                <Form.Label className="fw-medium">Message</Form.Label>
                                <Form.Control as="textarea" rows={5} placeholder="Your inquiry details..." className="rounded-3" />
                            </Form.Group>
                            <Button variant="primary" type="submit" size="lg" className="w-100 btn-primary-resto">
                                <Send size={20} className="me-2" /> Submit Inquiry
                            </Button>
                        </Form>
                    </Card>
                </Col>
                
                {/* Contact Info */}
                <Col md={6}>
                    <Card className="modern-card p-4 h-100 shadow-lg bg-light">
                        <Card.Title className='mb-4 fw-bold text-dark'>Contact Information</Card.Title>
                        <ul className="list-unstyled">
                            <li className="d-flex mb-4 align-items-start">
                                <MapPin size={24} className="me-3 text-secondary-accent flex-shrink-0 mt-1" />
                                <div>
                                    <h5 className='fw-bold mb-0'>Address:</h5>
                                    <p className='text-muted mb-0'>Avenue de la Bierre</p>
                                </div>
                            </li>
                            <li className="d-flex mb-4 align-items-start">
                                <Phone size={24} className="me-3 text-primary-resto flex-shrink-0 mt-1" />
                                <div>
                                    <h5 className='fw-bold mb-0'>Reservation Line:</h5>
                                    <p className='text-muted mb-0'>+ (243) 123-4567</p>
                                </div>
                            </li>
                            <li className="d-flex mb-4 align-items-start">
                                <Mail size={24} className="me-3 text-dark flex-shrink-0 mt-1" />
                                <div>
                                    <h5 className='fw-bold mb-0'>General Enquiries:</h5>
                                    <p className='text-muted mb-0'>info@Auctuxresto.com</p>
                                </div>
                            </li>
                        </ul>
                        {/* Dummy Map Placeholder */}
                        <div style={{ height: '250px', backgroundColor: '#e9ecef', borderRadius: '8px' }} className='mt-3 d-flex align-items-center justify-content-center border'>
                            <p className="text-muted fw-bold">Map Placeholder</p>
                        </div>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default ContactPage;
