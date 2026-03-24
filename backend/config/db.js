const mongoose = require('mongoose');

const connectDBs = async () => {
  try {
    // 1. Connexion PRINCIPALE (Locale)
    // Tous tes modèles utiliseront cette connexion par défaut
    const localURI = process.env.MONGO_URI || 'mongodb://localhost:27017/restowakeup';
    await mongoose.connect(localURI);
    console.log('🟢 Local MongoDB connected (Primary)');

    // 2. Connexion SECONDAIRE (Cloud Atlas)
    // On ne l'utilise que pour le SyncAgent
    const CLOUD_URI = "mongodb+srv://arnold:KitCarsPos@cluster0.3mxepwf.mongodb.net/restowakeup";
    
    // On crée une connexion séparée qui ne bloque pas l'app si elle échoue
    const cloudConnection = mongoose.createConnection(CLOUD_URI, {
        serverSelectionTimeoutMS: 5000
    });

    cloudConnection.on('connected', () => {
      console.log('☁️ Cloud MongoDB (Atlas) connected for sync');
    });

    cloudConnection.on('error', (err) => {
      console.warn('⚠️ Cloud DB Offline : Mode local uniquement.');
    });

    return { cloudConnection };

  } catch (err) {
    console.error('❌ Local DB Connection Error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDBs;