import React from 'react';

// NOTE: This component is designed to be rendered conditionally for printing
const DraftReceipt = ({ draft, user }) => {
    if (!draft) return null;

    // Calculate Fidelity Points (1 point for every $10)
    const fidelityPoints = Math.floor(draft.total / 10);

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
        <div className="receipt-container p-2" id="print-draft-receipt-content" style={{ width: '58mm', margin: '0 auto', fontSize: '9px', lineHeight: '1.2' , paddingLeft:"0 ps !important" }}>

            <div className="text-center mb-2">
                <h4 style={{ fontSize: '14px', margin: '5px 0' }}>{restoName}</h4>
                <p style={{ margin: '0' }}>**DRAFT Bill** #{draft._id.slice(-6)}</p>
                <p style={{ margin: '0', borderBottom: '1px dashed #000' }}>{formatDate(draft.createdAt)}</p>
            </div>

            <div className="mb-2">
                <p style={{ margin: '0', fontWeight: 'bold' }}>
                    Cashier: {user?.username || 'N/A'}
                </p>
                {draft.customer && (
                    <p style={{ margin: '0', fontSize: '9px' }}>
                        Customer: {draft.customer.name} (ID: {draft.customer._id.slice(-6)})
                    </p>
                )}
            </div>

            <div style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                {draft.items.map((item, index) => (
                    <div key={index} className="d-flex justify-content-around p-0 m-0 border-0" style={{ fontSize: '9px' }}>
                        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, paddingRight: '10px' }}>
                            <span style={{ fontWeight: 'bold' }}>
                                <span style={{ backgroundColor: '#ccc', padding: '1px 3px', borderRadius: '3px', marginRight: '5px', fontSize: '8px' }}>
                                    {item.quantity}x
                                </span>
                                {item.name}
                            </span>
                        </span>
                        <span style={{ fontWeight: 'bold' }}>
                            ${(item.price * item.quantity).toFixed(0)}
                        </span>
                    </div>
                ))}
            </div>

            <div className="text-right mt-2" style={{ borderBottom: '2px solid #000', paddingBottom: '5px', textAlign: 'right' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '11px' }}>TOTAL DRAFT:</span>
                    <span style={{ fontWeight: 'bold', fontSize: '11px' }}>${draft.total.toFixed(0)}</span>
                </div>
            </div>

            {/* <div className="mt-2 text-center" style={{ borderTop: '1px dashed #000', paddingTop: '5px' }}>
                <p style={{ margin: '0', fontSize: '10px', fontWeight: 'bold' }}>
                    **Estimated** Fidelity Points: {fidelityPoints}
                </p>
                <p style={{ margin: '0', fontSize: '8px' }}>
                    ($10 = 1 Point)
                </p>
            </div> */}

            <div className="text-center mt-3 mb-4" style={{ borderTop: '1px dashed #000', paddingTop: '5px' }}>
                <p style={{ margin: '0', fontWeight: 'bold', fontSize: '10px' }}>
                    Thank you for ordering at {restoName}!
                </p>
                <p style={{ margin: '0', fontSize: '10px', color: 'black', fontWeight:"bold" }}>
                    Powered by www.Auctux.com POS v1.0
                </p>
            </div>
            <hr/>
        </div>
    );
};

export default DraftReceipt;