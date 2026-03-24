const mongoose = require('mongoose');

const User = require('../models/UserModel');
const Product = require('../models/ProductModel');
const Customer = require('../models/CustomerModel');
const Bill = require('../models/BillModel');
const Inventory = require('../models/InventoryModel');
const Recipe = require('../models/RecipeModel');
const AuditLog = require('../models/AuditLogModels');

// Use ENV instead of hardcoding credentials
const cloudURI = process.env.MONGO_ATLAS_URI;

const syncCloudToLocal = async () => {

  console.log('☁️  [Synchro] Tentative de connexion au Cloud Atlas...');

  try {

    const cloudConn = await mongoose.createConnection(cloudURI, {
      serverSelectionTimeoutMS: 5000
    }).asPromise();

    console.log('☁️  [Synchro] Connexion Atlas établie.');

    const syncCollection = async (name, LocalModel) => {

      try {

        const CloudModel =
          cloudConn.models[name] ||
          cloudConn.model(name, LocalModel.schema);

        const remoteData = await CloudModel.find({}).lean();

        if (remoteData && remoteData.length > 0) {

          await LocalModel.deleteMany({});
          await LocalModel.insertMany(remoteData);

          console.log(`✅ [Synchro] ${name} : ${remoteData.length} éléments synchronisés`);

        } else {

          console.log(`ℹ️ [Synchro] ${name} : Cloud vide, données locales conservées`);

        }

      } catch (err) {

        console.error(`❌ [Synchro] Erreur ${name} : ${err.message}`);

      }

    };

    // Synchronize collections in parallel
    await Promise.all([
      syncCollection('User', User),
      syncCollection('Product', Product),
      syncCollection('Customer', Customer),
      syncCollection('Bill', Bill),
      syncCollection('Inventory', Inventory),
      syncCollection('Recipe', Recipe),
      syncCollection('AuditLog', AuditLog)
    ]);

    console.log('⭐ [Synchro] Base locale synchronisée avec le cloud.');

    await cloudConn.close();

  } catch (error) {

    console.log('⚠️  [Synchro] Atlas injoignable (Mode Hors-ligne)');
    console.log('ℹ️  [Synchro] Aucune donnée locale modifiée');

  }

};

module.exports = syncCloudToLocal;