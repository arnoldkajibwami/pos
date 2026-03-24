import React from 'react';
import { Container, Row, Col, Image, Card } from 'react-bootstrap';
// Updated icons to lucide-react
import { Leaf, Wine, Heart, ChefHat, CheckCircle } from 'lucide-react';
import About from "../images/03.jpg"

const AboutPage = () => {
    return (
        <Container className="py-5">
            <h1 className="text-center mb-2 fw-light text-primary-resto">Our Story</h1>
            <h2 className="text-center mb-5 fw-bold text-dark">A Taste of Tradition, A Dash of Innovation</h2>
            
            {/* Chef Section */}
            <Row className="align-items-center mb-5 pb-4">
                <Col md={6} className="order-md-2 mb-4 mb-md-0">
                    <Image 
                        src= {About} 
                        fluid 
                        rounded 
                        className="shadow-xl image-placeholder"
                    />
                </Col>
                <Col md={6} className="order-md-1">
                    <h4 className="text-uppercase text-muted mb-2"><ChefHat size={20} className="me-1" /> Leadership</h4>
                    <h3 className="fw-bold mb-3">Meet Our Head Chef, Patrick Mwisha</h3>
                    <p className="lead text-secondary">
                        Chef Chen blends classic French techniques with bold Asian flavors. A true culinary artist, his philosophy centers on **sustainability** and deep **respect for the ingredient**.
                    </p>
                    <p className="text-muted border-start border-4 ps-3 border-primary-resto">
                        "Cuisine is a language spoken with all five senses. We strive for balance, complexity, and sheer pleasure in every bite," says Chef Chen, who has trained in Michelin-starred restaurants across three continents.
                    </p>
                </Col>
            </Row>

            <hr className="my-5 border-2"/>

            {/* Commitment Section */}
            <h2 className="text-center mb-4 fw-bold">Our Core Commitments</h2>
            <Row className="g-4 text-center">
                
                {/* Commitment 1: Farm-to-Table */}
                <Col md={4}>
                    <Card className="commitment-card modern-card p-4 h-100 shadow-sm">
                        <Leaf size={40} className="commitment-icon mb-3 mx-auto" />
                        <h4 className="fw-bold">Sustainable Sourcing</h4>
                        <p className="text-muted">We source 90% of our produce from local, organic farms within a 50-mile radius, ensuring maximum freshness and supporting our community.</p>
                    </Card>
                </Col>
                
                {/* Commitment 2: Artisan Drinks */}
                <Col md={4}>
                    <Card className="commitment-card modern-card p-4 h-100 shadow-sm">
                        <Wine size={40} className="commitment-icon mb-3 mx-auto" />
                        <h4 className="fw-bold">Curated Beverages</h4>
                        <p className="text-muted">Our bar features an exclusive selection of hand-crafted cocktails and a curated wine list focusing on small-batch and bio-dynamic producers.</p>
                    </Card>
                </Col>
                
                {/* Commitment 3: Customer Focus */}
                <Col md={4}>
                    <Card className="commitment-card modern-card p-4 h-100 shadow-sm">
                        <Heart size={40} className="commitment-icon mb-3 mx-auto" />
                        <h4 className="fw-bold">Personalized Service</h4>
                        <p className="text-muted">Our dedicated staff are trained to provide a personalized and memorable dining experience, ensuring comfort and care from arrival to departure.</p>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default AboutPage;
