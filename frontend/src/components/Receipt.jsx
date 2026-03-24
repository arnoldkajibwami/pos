import React from 'react';

// Utility component for the repeating dashed line
const DashedLine = ({ weight = 1 }) => (
    <div style={{ 
        borderBottom: `${weight}px dashed #000`, 
        margin: '5px 0', 
        width: '100%' 
    }} />
);

// Composant universel de reçu (pour Brouillon finalisé ou Facture d'Historique)
const Receipt = ({ cart, cartTotal, customer, user, draftIds, billId }) => {

    // Ensure cart and cartTotal have safe default values
    cart = cart || [];
    cartTotal = cartTotal || 0;

    const restoName = "Auctuxresto";
    const serverName = user?.name || user?.username || 'N/A';
    
    // Determine the primary ID for the receipt
    const receiptId = billId || (draftIds && draftIds[0]?.slice(-6)) || "COMMANDE NON ENREGISTRÉE";

    // Calculate Fidelity Points (1 point for every $10)
    const fidelityPoints = Math.floor(cartTotal / 10);

    // Helper function to format the date
    const formatDate = (date) => {
        return new Date(date).toLocaleString('fr-FR', { 
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour12: false
        }).replace(',', '');
    };

    // Calculate total quantity
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const taxRate = 0; // Assuming 0% tax for simplicity based on previous structure
    const taxes = 0.00; // Calculated tax amount

    return (
        <div id="receipt-content-area" className="p-3" style={{ 
            maxWidth: '300px', 
            margin: '0 auto', 
            fontSize: '10pt', 
            fontFamily: 'monospace', 
            lineHeight: '1.4',
            padding: '5px' // Reduced padding for classic thermal look
        }}>
            
            {/* 1. Header & Restaurant Info */}
            <div className="text-center" style={{ marginBottom: '10px' }}>
                <h2 style={{ margin: '0', fontSize: '14pt', fontWeight: '900', textTransform: 'uppercase' }}>{restoName}</h2>
                <p style={{ margin: '2px 0 0 0', fontSize: '8pt' }}>123 Rue de la Facturation</p>
                <p style={{ margin: '0', fontSize: '8pt' }}>Tél: +1 555-1234</p>
            </div>

            <DashedLine />

            {/* 2. Transaction Details */}
            <div style={{ fontSize: '9pt' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                    <span>**FACTURE ID:**</span>
                    <span style={{ fontWeight: 'bold' }}>{receiptId}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                    <span>Date:</span>
                    <span>{formatDate(new Date())}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                    <span>Serveur:</span>
                    <span>{serverName}</span>
                </div>
                {customer && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                        <span>Client:</span>
                        <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{customer.name || 'N/A'}</span>
                    </div>
                )}
            </div>

            <DashedLine />

            {/* 3. Cart Items Header */}
            <div style={{ fontSize: '9pt', marginBottom: '5px', fontWeight: 'bold', display: 'flex' }}>
                <span style={{ width: '40%' }}>ARTICLE</span>
                <span style={{ width: '15%', textAlign: 'center' }}>QTÉ</span>
                <span style={{ width: '25%', textAlign: 'right' }}>PRIX UNIT.</span>
                <span style={{ width: '20%', textAlign: 'right' }}>TOTAL</span>
            </div>
            
            <DashedLine weight={2} />

            {/* 4. Cart Items List */}
            <div style={{ fontSize: '9pt' }}>
                {cart.map((item, index) => {
                    const price = item.price || item.unit_price || 0;
                    const quantity = item.quantity || 0;
                    const total = quantity * price;

                    return (
                        <div key={index} style={{ marginBottom: '5px' }}>
                            {/* Item Name */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                <span style={{ width: '60%', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                    {item.name || item.product_name}
                                </span>
                                <span style={{ width: '40%', textAlign: 'right' }}>
                                    {total.toFixed(0)} $
                                </span>
                            </div>
                            {/* Item Details (Qty x Price) */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8pt', color: '#555' }}>
                                <span style={{ width: '50%' }}></span>
                                <span style={{ width: '50%', textAlign: 'right' }}>
                                    {quantity} x {price.toFixed(0)} $
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <DashedLine weight={2} />

            {/* 5. Subtotals and Tax */}
            <div style={{ fontSize: '10pt', textAlign: 'right' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                    <span style={{ fontWeight: 'normal' }}>Sous-Total ({totalItems} articles):</span>
                    <span style={{ fontWeight: 'bold' }}>{cartTotal.toFixed(0)} $</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                    <span style={{ fontWeight: 'normal' }}>Taxes ({taxRate}%):</span>
                    <span>{taxes.toFixed(0)} $</span>
                </div>
            </div>

            <DashedLine weight={3} />

            {/* 6. Final Total */}
            <div style={{ fontSize: '13pt', textAlign: 'right', marginTop: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '2px solid #000', padding: '5px 0' }}>
                    <span>TOTAL PAYÉ:</span>
                    <span style={{ color: '#000', letterSpacing: '1px' }}>{cartTotal.toFixed(0)} $</span>
                </div>
            </div>

            {/* 7. Loyalty/Credit (Only if customer is present) */}
            {customer && (
                <>
                    <DashedLine />
                    <div className="text-center" style={{ padding: '8px 0', border: '1px solid #000', margin: '10px 0', background: '#f0f0f0' }}>
                        <p style={{ margin: '0', fontSize: '10pt', fontWeight: 'bold' }}>
                            POINTS GAGNÉS: <span style={{ color: 'green' }}>{fidelityPoints}</span>
                        </p>
                        <p style={{ margin: '0', fontSize: '8pt', marginTop: '3px' }}>
                            SOLDE CRÉDIT CLIENT: {(customer.creditBalance || 0).toFixed(0)} $
                        </p>
                    </div>
                </>
            )}

            <DashedLine />

            {/* 8. Footer */}
            <div className="text-center mt-3" style={{ padding: '10px 0', fontSize: '8pt' }}>
                <p style={{ margin: '0', fontWeight: 'bold', fontSize: '10pt' }}>
                    MERCI DE VOTRE COMMANDE!
                </p>
                <p style={{ margin: '2px 0', fontSize: '9pt' }}>
                    {restoName} vous souhaite une bonne journée.
                </p>
                <p style={{ margin: '10px 0 0 0', fontSize: '7pt', color: '#555' }}>
                    Développé par www.auctux.com POS v2
                </p>
            </div>
            {/* Blank space for cutter */}
            <div style={{ height: '30px' }}></div> 
        </div>
    );
};

export default Receipt;