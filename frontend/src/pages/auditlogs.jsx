import React, { useState, useEffect, useCallback } from 'react';
import { 
    Container, Row, Col, Card, Alert, Spinner, Table, Button, 
    Form, InputGroup, Pagination, Badge
} from 'react-bootstrap';
import { History, Search, User, Zap, Calendar } from 'lucide-react';
import API_URL from '../api/api'
import axios from 'axios';

// const API_URL = 'http://localhost:5000/api/v1';  // test
// const API_URL= axios.create({ 
  // baseURL:  //`${window.location.origin}/api/v1` 
//});



export default AuditLogs;