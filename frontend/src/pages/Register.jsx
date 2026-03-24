// pages/Register.js

import React, { useState } from 'react';
import { Form, Button, Card, Container, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaUserPlus } from 'react-icons/fa';
import API_URL from '../api/api'
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// const API_URL = 'http://localhost:5000/api/v1';  // test
// const API_URL= axios.create({ 
  // baseURL:  //`${window.location.origin}/api/v1` 
//});

const Register = () => {
  const { user, isManagerOrAdmin } = useAuth();
  const [formData, setFormData] = useState({ 
      name: '', email: '', password: '', role: 'waiter' 
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // POST to the user creation endpoint
      await axios.post(`${API_URL}/users`, formData);
      setSuccess(`Staff member ${formData.name} created successfully!`);
      setFormData({ name: '', email: '', password: '', role: 'waiter' });
    } catch (err) {
      setError(err.response?.data?.msg || 'Registration failed. Check if email already exists.');
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'admin') {
      return <Container><Alert variant='danger'>Access Denied. Only Administrators can use this registration route.</Alert></Container>
  }

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: "80vh" }}>
      <div className="w-100" style={{ maxWidth: "500px" }}>
        <Card>
          <Card.Body>
            <h2 className="text-center mb-4"><FaUserPlus className="me-2" /> Register New Staff</h2>
            {success && <Alert variant="success">{success}</Alert>}
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3" controlId="formName">
                <Form.Label>Full Name</Form.Label>
                <Form.Control type="text" name="name" value={formData.name} onChange={handleChange} required />
              </Form.Group>

              <Form.Group className="mb-3" controlId="formEmail">
                <Form.Label>Email Address</Form.Label>
                <Form.Control type="email" name="email" value={formData.email} onChange={handleChange} required />
              </Form.Group>

              <Form.Group className="mb-3" controlId="formPassword">
                <Form.Label>Initial Password</Form.Label>
                <Form.Control type="password" name="password" value={formData.password} onChange={handleChange} required />
              </Form.Group>

              <Form.Group className="mb-3" controlId="formRole">
                <Form.Label>Role</Form.Label>
                <Form.Select name="role" value={formData.role} onChange={handleChange} required>
                    <option value="waiter">Waiter</option>
                    <option value="cashier">Cashier</option>
                    <option value="buffet">Buffet</option>
                    {user.role === 'admin' && <option value="manager">Manager</option>}
                    {user.role === 'admin' && <option value="admin">Admin (Superuser)</option>}
                </Form.Select>
              </Form.Group>

              <Button variant="primary" type="submit" className="w-100" disabled={loading}>
                {loading ? 'Registering...' : 'Register Staff'}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </div>
    </Container>
  );
};

export default Register;