const Product = require('../models/ProductModel');
const cloudinary = require('cloudinary').v2;
const DatauriParser = require('datauri/parser');
const mongoose = require('mongoose');
const { createLog } = require('../utils/AuditService');


// Helper to convert buffer to data URI for Cloudinary
const parser = new DatauriParser();
const formatBufferToDataUri = file => parser.format(file.originalname, file.buffer);

// Simple slugify function for creating safe public IDs
const slugify = (text) => {
    return text
        .toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^-\w]+/g, '')        // Remove all non-word chars except dashes
        .replace(/--+/g, '-')           // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
};

/**
 * Helper function to extract Cloudinary Public ID from a secure_url
 * It looks for the folder path 'resto-pos/products/' in the URL
 * and extracts the rest of the path until the file extension.
 * @param {string} url - The full Cloudinary secure_url
 * @returns {string | null} The full public ID including the folder path, e.g., 'resto-pos/products/product-name-12345'
 */
 const addBuffetItem = async (req, res) => {
    // 1. Destructure everything from req.body
    const { 
        name, 
        price, 
        category, 
        isStockTracked, 
        isBuffetPortion, 
        sellable 
    } = req.body;

    // 2. Initial Validation
    if (!name || !category) {
        return res.status(400).json({ msg: 'Le nom et la catégorie sont requis pour un article buffet.' });
    }

    // 3. Prepare data object with proper type conversions
    const newBuffetData = {
    ...req.body,
    isBuffetItem: true, // Force this to true for everything created here
    isBuffetPortion: true,
    sellable: false // Keeps it out of the main POS
};

    // 4. Handle Image logic (Cloudinary style to match your createProduct)
    try {
        if (req.file) {
            // Convert buffer for Cloudinary
            const file = formatBufferToDataUri(req.file);
            const publicIdBase = slugify(name);
            
            const result = await cloudinary.uploader.upload(file.content, {
                folder: 'resto-pos/buffet',
                public_id: `buffet-${publicIdBase}-${Date.now()}`,
            });
            
            newBuffetData.image = result.secure_url;
        } else if (req.body.image) {
            // Case where a URL is sent directly
            newBuffetData.image = req.body.image;
        } else {
            newBuffetData.image = ''; // Default empty
        }

        // 5. Create the product in Database
        const product = await Product.create(newBuffetData);
        
        res.status(201).json({ 
            msg: 'Article Buffet créé avec succès', 
            product 
        });

    } catch (error) {
        console.error("Buffet Creation Error:", error);
        
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ msg: messages.join(', ') });
        }
        
        res.status(500).json({ msg: "Échec de l'ajout de l'article buffet." });
    }
};

const getBuffetIngredients = async (req, res) => {
    try {
        // This finds everything tagged as a buffet portion
        const products = await Product.find({ 
            $or: [
                { isBuffetItem: true }, 
                { isBuffetPortion: true },
                { category: { $regex: /^Buffet-/i } }
            ]
        });
        res.status(200).json({ products });
    } catch (error) {
        res.status(500).json({ msg: "Erreur lors de la récupération des ingrédients" });
    }
};

const getCloudinaryPublicId = (url) => {
    if (!url || !url.includes('cloudinary.com')) return null;

    // Find the starting point of the public ID in the URL path
    const pathSegment = 'resto-pos/products/';
    const startIndex = url.indexOf(pathSegment);

    if (startIndex === -1) return null;

    // Extract the part of the URL starting from 'resto-pos/products/'
    const publicIdWithExtension = url.substring(startIndex);

    // Remove the file extension (e.g., .jpg, .png) and the transformation details if any
    const publicId = publicIdWithExtension.substring(0, publicIdWithExtension.lastIndexOf('.'));

    return publicId;
};


/**
 * @desc Creates a new Product
 * @route POST /api/v1/products
 * @access Private (Manager/Admin)
 */
const createProduct = async (req, res) => {
    // Add isLaw to destructuring
    const { 
        name, price, buyPrice, category, 
        stockBar, stockGeneral, isStockTracked, isAvailable, lowStockThreshold, 
        isLaw // <--- ADD THIS VARIABLE
    } = req.body

    if (!name || !price || !category) {
        return res.status(400).json({ msg: 'Product name, price, and category are required.' });
    }

    // Convert all numeric/boolean fields from string to their proper type
    const newProductData = {
        name,
        category,
        // Conversion de String à Number
        price: Number(price),
        buyPrice: Number(buyPrice),
        stockBar: Number(stockBar),
        stockGeneral: Number(stockGeneral),
        lowStockThreshold: Number(lowStockThreshold),
        isStockTracked: isStockTracked === 'true',
        isAvailable: isAvailable === 'true',
        // NEW: Handle isLaw conversion
        // isLaw: isLaw === 'true',
    };

    // 1. Handle image upload if a file is present in the request
    if (req.file) {
        // ... (Image upload logic remains the same)
        const file = formatBufferToDataUri(req.file);
        const publicIdBase = slugify(name);
        const result = await cloudinary.uploader.upload(file.content, {
            folder: 'resto-pos/products',
            public_id: `${publicIdBase}-${Date.now()}`,
        });
        newProductData.image = result.secure_url;
    } else if (req.body.image) {
        newProductData.image = req.body.image;
    } else {
        newProductData.image = '';
    }

    try {
        const product = await Product.create(newProductData);
        res.status(201).json({ msg: 'Product created successfully', product });
    } catch (error) {
        // ... (Error handling remains the same)
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ msg: messages.join(', ') });
        }
        console.error(error);
        res.status(500).json({ msg: 'Failed to create product due to a server error.' });
    }
};


const composeBuffetPlate = async (req, res) => {
    const { items, waiterId, customerName, draftName } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ msg: 'A buffet plate must have at least one item.' });
    }

    try {
        // Calculate the actual total of items for record-keeping
        const calculatedSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const buffetDraft = await Bill.create({
            waiter: waiterId || req.user.userId,
            customerName: customerName || 'Buffet Guest',
            draftName: draftName || 'Composed Plate',
            items: items.map(item => ({
                product: item.productId,
                name: item.name,
                price: item.price,
                quantity: item.quantity || 1,
                total: (item.price * (item.quantity || 1))
            })),
            subtotal: calculatedSubtotal,
            totalAmount: calculatedSubtotal,
            status: BILL_STATUS.DRAFT // Imported from constants
        });

        res.status(201).json({ 
            msg: 'Buffet plate composed and saved as draft', 
            bill: buffetDraft 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error while composing buffet plate' });
    }
};

// Récupérer une facture spécifique par son ID
const getBillById = async (req, res) => {
    const { id } = req.params;
    try {
        const bill = await Bill.findById(id);
        if (!bill) {
            return res.status(404).json({ msg: "Facture non trouvée" });
        }
        res.status(200).json(bill);
    } catch (error) {
        res.status(500).json({ msg: "Erreur serveur", error });
    }
};


const checkStockForCart = async (items) => {
    for (const item of items) {
        const product = await Product.findById(item.productId);
        
        if (!product) {
            throw new Error(`Produit non trouvé : ${item.productId}`);
        }

        // Passage autorisé si c'est un article Buffet OU illimité (-1)
        if (product.isBuffetItem === true || product.stockBar === -1) {
            continue;
        }

        // Vérification stricte pour le reste (ex: Boissons)
        if (product.stockBar < item.quantity) {
            throw new Error(`Stock insuffisant pour "${product.name}". (Disponible: ${product.stockBar})`);
        }
    }
};

const getProducts = async (req, res) => {
    const products = await Product.find({}).sort('name');
    res.status(200).json({ products, count: products.length });
};


const getSingleProduct = async (req, res) => {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
        return res.status(404).json({ msg: `No product with id :${id} found` });
    }

    res.status(200).json({ product });
};


/**
 * @desc Deletes a Product
 * @route DELETE /api/v1/products/:id
 * @access Private (Manager/Admin)
 */
const deleteProduct = async (req, res) => {
    const { id } = req.params;

    // Check if ID is valid to avoid a Mongoose CastError on findById
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ msg: `Invalid Product ID: ${id}` });
    }

    const product = await Product.findById(id);
    if (!product) {
        return res.status(404).json({ msg: `Product with id :${id} found` });
    }

    // 1. Delete image from Cloudinary if it's not the default
    if (product.image && !product.image.includes('default')) {
        const publicId = getCloudinaryPublicId(product.image); // Use helper to get full public ID
        if (publicId) {
            try {
                // Cloudinary destroy expects the full path (folder/public_id)
                await cloudinary.uploader.destroy(publicId);
            } catch (error) {
                console.warn(`Failed to delete Cloudinary image ${publicId}:`, error.message);
                // We still proceed to delete the product in Mongoose
            }
        }
    }

    // 2. Delete the product document from MongoDB
    await product.deleteOne();
    res.status(200).json({ msg: 'Product removed successfully' });
};


/**
 * @desc Gets only available products, hiding sensitive stock data (for POS)
 * @route GET /api/v1/products/sellable
 * @access Private (Any authenticated user)
 */
const getSellableProducts = async (req, res) => {
    // 🎯 FIX: Ensure 'isLaw' (your threshold number), 'stockBar', and 'isStockTracked' are included.
    const products = await Product.find({ isAvailable: true })
        .select('name price category image isStockTracked stockBar isLaw');

    res.status(200).json({ products, count: products.length });
};

/**
 * @desc Gets all Products (for admin/manager tables)
 * @route GET /api/v1/products
 * @access Private (Manager/Admin)
 */
const getAllProducts = async (req, res) => {
    const products = await Product.find({}).sort('name');
    res.status(200).json({ products, count: products.length });
};


/**
 * @desc Gets a single Product by ID
 * @route GET /api/v1/products/:id
 * @access Private (Manager/Admin)
 */
const getProductDetails = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ msg: `Invalid Product ID: ${id}` });
    }

    const product = await Product.findById(id);

    if (!product) {
        return res.status(404).json({ msg: `Product with id :${id} not found` });
    }

    res.status(200).json({ product });
};

const Bill = require('../models/BillModel');
const { BILL_STATUS } = require('../utils/constants');

/**
 * @desc Generate Buffet Draft (Handles Promotion price vs Sum price)
 */
const generateBuffetBill = async (req, res) => {
    const { items, isPromotion, promoPrice, waiterId, customerName } = req.body;

    // Calculate sum of parts
    const itemsTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    // Use promo price if applicable, otherwise use calculated sum
    const finalPrice = isPromotion ? Number(promoPrice) : itemsTotal;

    const buffetDraft = await Bill.create({
        waiter: waiterId || req.user.userId,
        customerName: customerName || 'Buffet Customer',
        items,
        subtotal: finalPrice,
        totalAmount: finalPrice,
        status: BILL_STATUS.DRAFT,
        draftName: isPromotion ? `BUFFET PROMO (${promoPrice}FC)` : "BUFFET NORMAL",
        // Description field for audit
        customer: null 
    });

    res.status(201).json(buffetDraft);
};

/**
 * @desc Filter finalized buffet bills
 */
const getBuffetReport = async (req, res) => {
    const { startDate, endDate } = req.query;

    let query = { 
        status: BILL_STATUS.FINAL,
        $or: [
            { draftName: /Buffet/i }, // Matches anything with 'Buffet' in the name
            { "items.name": /Portion/i } // Or search by specific items
        ]
    };

    if (startDate && endDate) {
        query.createdAt = { 
            $gte: new Date(startDate), 
            $lte: new Date(endDate) 
        };
    }

    const bills = await Bill.find(query).sort('-createdAt');
    const totalRevenue = bills.reduce((acc, curr) => acc + curr.totalAmount, 0);

    res.status(200).json({ count: bills.length, totalRevenue, bills });
};


const finalizeBuffetBill = async (req, res) => {
    try {
        const { billId, paymentMethod, amountPaid, amountReceived } = req.body;
        
        const Bill = mongoose.model('Bill');
        const bill = await Bill.findById(billId);

        if (!bill) {
            return res.status(404).json({ msg: "Facture buffet non trouvée" });
        }

        // Correction : On vérifie si le statut est déjà 'final'
        if (bill.status === 'final') {
            return res.status(400).json({ msg: "Cette facture est déjà clôturée" });
        }

        // 1. Vérification des stocks avec exceptions Buffet
        await checkStockForCart(bill.items.map(i => ({ 
            productId: i.product, 
            quantity: i.quantity 
        })));

        // 2. Mise à jour des stocks (uniquement pour les articles hors-buffet)
        for (const item of bill.items) {
            const product = await Product.findById(item.product);
            
            // On ne déduit QUE si ce n'est PAS un article buffet et PAS illimité
            if (product && product.isBuffetItem !== true && product.stockBar !== -1) {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: { stockBar: -item.quantity }
                });
            }
        }

        // 3. Finalisation conforme au schéma Mongoose
        // Utilisation de 'final' (issu de BILL_STATUS dans vos constantes)
        bill.status = 'final'; 
        bill.paymentMethod = paymentMethod || 'CASH';
        bill.amountPaid = Number(amountPaid);
        bill.amountReceived = Number(amountReceived);
        bill.paidAt = Date.now();

        // Optionnel : Mise à jour du statut de paiement si présent dans votre schéma
        if (bill.paymentStatus !== undefined) {
            bill.paymentStatus = 'paid';
        }

        await bill.save();

        res.status(200).json({ 
            msg: "Vente buffet finalisée avec succès", 
            bill 
        });

    } catch (error) {
        console.error("Erreur FinalizeBuffet:", error);
        res.status(400).json({ 
            msg: error.message || "Erreur lors de la finalisation" 
        });
    }
};

const getFinalizedBuffetBills = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = { 
            status: BILL_STATUS.FINAL,
            // We filter by the draftName or a specific category if added
            $or: [
                { draftName: /Buffet/i },
                { category: 'BUFFET' }
            ]
        };

        // Optional Date Filtering
        if (startDate && endDate) {
            query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const bills = await Bill.find(query)
            .populate('waiter', 'name')
            .sort('-createdAt');

        const totalRevenue = bills.reduce((sum, b) => sum + b.totalAmount, 0);

        res.status(200).json({ 
            count: bills.length, 
            totalRevenue, 
            bills 
        });
    } catch (error) {
        res.status(500).json({ msg: 'Error fetching buffet reports' });
    }
};
const updateProduct = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    let imageUpdate = {};

    try {
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ msg: `Product with id :${id} not found` });
        }

        // Convert Types
        if (updates.price) updates.price = Number(updates.price);
        if (updates.buyPrice) updates.buyPrice = Number(updates.buyPrice);
        if (updates.stockBar) updates.stockBar = Number(updates.stockBar);
        if (updates.stockGeneral) updates.stockGeneral = Number(updates.stockGeneral);
        if (updates.lowStockThreshold) updates.lowStockThreshold = Number(updates.lowStockThreshold);

        // Convert Booleans from Frontend strings
        if (updates.isStockTracked) updates.isStockTracked = updates.isStockTracked === 'true';
        if (updates.isAvailable) updates.isAvailable = updates.isAvailable === 'true';
        if (updates.isBuffetItem) updates.isBuffetItem = updates.isBuffetItem === 'true';

        // 🖼️ Image Update Logic
        if (req.file) {
            // Delete old image if exists
            if (product.image && !product.image.includes('default')) {
                const publicId = getCloudinaryPublicId(product.image);
                if (publicId) await cloudinary.uploader.destroy(publicId);
            }
            // Upload new
            const file = formatBufferToDataUri(req.file);
            const result = await cloudinary.uploader.upload(file.content, {
                folder: 'resto-pos/products',
                public_id: `${slugify(updates.name || product.name)}-${Date.now()}`,
            });
            imageUpdate.image = result.secure_url;
        } else if (updates.image === '') {
            imageUpdate.image = '/path/to/default/image.png';
        }

        const mergedUpdates = { ...updates, ...imageUpdate };
        delete mergedUpdates.imageFile;

        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            mergedUpdates,
            { new: true, runValidators: true }
        );

        res.status(200).json({ msg: 'Product updated successfully', product: updatedProduct });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ msg: messages.join(', ') });
        }
        res.status(500).json({ msg: 'Server error during update' });
    }
};

// Mettre à jour un brouillon de buffet existant
const updateBuffetDraft = async (req, res) => {
    const { id } = req.params;
    const { items, totalAmount, customerName } = req.body;

    try {
        const updatedBill = await Bill.findByIdAndUpdate(
            id,
            {
                items,
                totalAmount,
                subtotal: totalAmount,
                customerName: customerName || 'Buffet Customer',
                // On s'assure que le statut reste en DRAFT
                status: 'DRAFT' 
            },
            { new: true } // Retourne le document modifié
        );

        if (!updatedBill) {
            return res.status(404).json({ msg: "Brouillon introuvable" });
        }

        res.status(200).json(updatedBill);
    } catch (error) {
        res.status(500).json({ msg: "Erreur lors de la mise à jour", error });
    }
};


module.exports = {
    addBuffetItem,
    updateBuffetDraft,
    createProduct,
    updateProduct,
    finalizeBuffetBill,
    getFinalizedBuffetBills,
    getProducts,
    getSingleProduct,
    deleteProduct,
    generateBuffetBill,
    getAllProducts,
    getProductDetails,
    getBillById,
    getSellableProducts,
    composeBuffetPlate,
    getBuffetReport,
    getBuffetIngredients,
};