// File: Receipt.jsx

import React from 'react';
import { ListGroup, Badge } from 'react-bootstrap';

const Receipt = ({ cart, cartTotal, customer, user, draftIds, billId }) => {

    // Calculate Fidelity Points (1 point for every $10)
    const fidelityPoints = Math.floor(cartTotal / 10);

    const restoName = "Auctuxresto";

    // Helper function to format the date
    const formatDate = (date) => {
        return new Date(date).toLocaleString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        // ******************************************************
        // * FIX: The ID is REQUIRED here for the print utility. *
        // ******************************************************
        <div
            className="receipt-container p-2"
            // id="print-receipt-content"
            style={{ width: '58mm', margin: '0 auto', fontSize: '9px', lineHeight: '1.2' }}
        >

            <div className="text-center mb-2">
                <h4 style={{ fontSize: '14px', margin: '5px 0' }}>{restoName}</h4>
                <p className="m-0">Avenue de la Bierre | Tel: + (243) 999-888-777</p>
            </div>
            <div className="text-center mb-2">
                <p style={{ margin: '0' }}>Bill #{billId?.slice(-6) || "N/A"} | <span>{formatDate(Date.now())}</span></p>
                {/* <p style={{ margin: '0' }}>Draft Bill #{draftIds[0]?.slice(-6) || "new Order"} | <span>{formatDate(Date.now())}</span></p> */}
            </div>
            <hr />

            {/* Customer Details */}
            {
                customer && (
                    <div className='mb-2' style={{ borderBottom: '1px dashed #000', paddingBottom: '5px' }}>
                        <p style={{ margin: '0', fontWeight: 'bold', fontSize: '10px' }}>Customer: {customer.name}</p>
                        <p style={{ margin: '0', fontSize: '9px' }}>Phone: {customer.phone || 'N/A'}</p>
                        {/* <p style={{ margin: '0', fontSize: '9px' }}>Loyalty Points: {customer.loyaltyPoints || 0}</p> */}
                    </div>
                )
            }

            <div className="d-flex justify-content-around mb-1" style={{ borderBottom: '1px dashed #000', fontWeight: 'bold', fontSize: '10px' }}>
                <span>Item (Qty)</span>
                <span>Price</span>
            </div>

            <ListGroup variant="flush" style={{ border: 'none' }}>
                {cart.map((item, index) => (
                    <ListGroup.Item
                        key={index}
                        className="d-flex justify-content-around"
                        style={{ padding: '2px 0', border: 'none', fontSize: '9px' }}
                    >
                        <div style={{ display: 'flex' }} className='justify-content-around'>
                            <span style={{ fontWeight: 'bold' }}>
                                <span style={{ backgroundColor: '#ccc', padding: '1px 3px', borderRadius: '3px', marginRight: '5px', fontSize: '8px' }}>
                                    {item.quantity}x
                                </span>
                                {item.name}
                            </span>
                        </div>
                        <span style={{ fontWeight: 'bold' }}>
                            ${(item.price * item.quantity).toFixed(0)}
                        </span>
                    </ListGroup.Item>
                ))}
            </ListGroup>

            <div className="text-right mt-2" style={{ borderBottom: '2px solid #000', paddingBottom: '5px', textAlign: 'right' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '11px' }}>TOTAL:</span>
                    <span style={{ fontWeight: 'bold', fontSize: '11px' }}>${cartTotal.toFixed(0)}</span>
                </div>
            </div>

            {/* <div className="mt-2 text-center" style={{ borderTop: '1px dashed #000', paddingTop: '5px' }}>
                <p style={{ margin: '0', fontSize: '10px', fontWeight: 'bold' }}>
                    Fidelity Points Earned: {fidelityPoints} 
                </p>
                <p style={{ margin: '0', fontSize: '8px' }}>
                    ($10 = 1 Point)
                </p>
            </div> */}

            <div className="text-center mt-3 mb-4" style={{ borderTop: '1px dashed #000', paddingTop: '5px' }}>
                <p style={{ margin: '0', fontWeight: 'bold', fontSize: '10px' }}>
                    Thank you for ordering at {restoName}!
                </p>
                <p style={{ margin: '0', fontSize: '10px', color: 'black', fontWeight: "bold" }}>
                    Powered by www.auctux.com POS v1.0
                </p>
            </div>
            <hr />

        </div >
    );
};

export default Receipt;