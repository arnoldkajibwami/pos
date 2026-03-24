// pages/Gallery.jsx

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Spinner, Alert } from 'react-bootstrap';
import { FaCamera } from 'react-icons/fa';
import API_URL from '../api/api'
import axios from 'axios';

// const API_URL = 'http://localhost:5000/api/v1/gallery';

const GalleryPage = () => {
    const [images, setImages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchImages();
    }, []);

    const fetchImages = async () => {
        try {
            const response = await axios.get(API_URL);
            setImages(response.data.data);
        } catch (err) {
            setError('Failed to load gallery images. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return <Container className="text-center py-5"><Spinner animation="border" /></Container>;
    if (error) return <Container><Alert variant="danger">{error}</Alert></Container>;

    return (
        <Container className="py-5">
            <h1 className="text-center mb-5 text-primary"><FaCamera className="me-2"/> Our Visual Feast</h1>
            <p className="lead text-center mb-5">A snapshot of our kitchen, dining atmosphere, and signature dishes.</p>

            {images.length === 0 ? (
                <Alert variant="info" className="text-center">No images have been added to the gallery yet.</Alert>
            ) : (
                <Row className="g-4">
                    {images.map((image) => (
                        <Col key={image._id} md={4} lg={3}>
                            <Card className="shadow-sm gallery-card overflow-hidden">
                                <Card.Img 
                                    variant="top" 
                                    src={image.imageUrl} 
                                    style={{ height: '250px', objectFit: 'cover' }} 
                                    alt={image.title} 
                                />
                                <Card.Body>
                                    <Card.Title className='fs-5'>{image.title}</Card.Title>
                                    <Card.Text className='text-muted small'>{image.description}</Card.Text>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
        </Container>
    );
};

export default GalleryPage;