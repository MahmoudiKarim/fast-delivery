require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Commande = require('./Commande');
// const auth = require('./auth');
const axios = require('axios');
const { ObjectId } = mongoose.Types;

const app = express();
app.use(express.json());

// Utility function to validate ObjectId
function isValidObjectId(id) {
  if (!id || typeof id !== 'string') return false;
  return ObjectId.isValid(id) && (new ObjectId(id)).toString() === id;
}

// Connexion MongoDB
mongoose.set('strictQuery', true);
mongoose.connect(
    "mongodb://localhost/commande-service")
    .then(() => {
      console.log("Commande-Service DB Connected");
      console.log(`Connected to database: ${mongoose.connection.name}`);
      mongoose.connection.db.listCollections().toArray((err, collections) => {
        if (err) {
          console.error('Error listing collections:', err);
        } else {
          console.log('Available collections:', collections.map(c => c.name));
        }
      });
    })
    .catch(err => {
      console.error("MongoDB Connection Error:", err);
      process.exit(1); // Exit if we can't connect to the database
    });

// Middleware d'authentification
// app.use(auth);

/**
 * @route POST /commande/ajouter
 * @description Créer une nouvelle commande
 */



const PRODUIT_SERVICE_URL = process.env.PRODUIT_SERVICE_URL || 'http://localhost:4001';

async function verifierProduit(produitId) {
  try {
    const response = await axios.get(`${PRODUIT_SERVICE_URL}/produit/${produitId}`);
    // Make sure we have access to the product data with proper error checking
    if (!response.data || !response.data.produit || !response.data.produit.prix) {
      console.error('Invalid product data format:', response.data);
      throw new Error(`Données invalides pour le produit ${produitId}`);
    }
    return response.data.produit; // Return the product data
  } catch (error) {
    console.error(`Error fetching product ${produitId}:`, error.message);
    throw new Error(`Produit ${produitId} non trouvé ou invalide`);
  }
}

async function mettreAJourStock(produitId, quantite) {
  try {
    await axios.patch(`${PRODUIT_SERVICE_URL}/produit/${produitId}/stock`, {
      operation: 'decrement',
      quantite: quantite
    });
  } catch (error) {
    throw new Error(`Échec de la mise à jour du stock pour le produit ${produitId}`);
  }
}



app.post('/commande/ajouter', async (req, res) => {
  try {
    const { produits, client_id } = req.body;
    
    if (!produits || !Array.isArray(produits) || produits.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'La commande doit contenir au moins un produit'
      });
    }
    
    console.log('Creating order with products:', produits);
    
    // Validate product IDs
    for (const item of produits) {
      if (!item.produit_id || !isValidObjectId(item.produit_id)) {
        console.error(`Invalid product ID: ${item.produit_id}`);
        return res.status(400).json({
          status: 'error',
          message: `ID produit invalide: ${item.produit_id}`
        });
      }
    }
    
    let prix_total = 0;

    // Vérification des produits et calcul du prix
    for (const item of produits) {
      console.log(`Verifying product: ${item.produit_id}, quantity: ${item.quantite}`);
      try {
        const produit = await verifierProduit(item.produit_id);
        
        console.log(`Product price: ${produit.prix}, stock: ${produit.stock}`);
        
        if (produit.stock < item.quantite) {
          return res.status(400).json({
            status: 'error',
            message: `Stock insuffisant pour le produit ${produit.nom}`
          });
        }

        const itemPrice = produit.prix * item.quantite;
        console.log(`Item total price: ${itemPrice}`);
        prix_total += itemPrice;
      } catch (error) {
        return res.status(400).json({
          status: 'error',
          message: error.message
        });
      }
    }

    console.log(`Total order price: ${prix_total}`);
    
    // Validation to ensure prix_total is a number
    if (isNaN(prix_total) || prix_total <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Le prix total de la commande est invalide'
      });
    }

    // Création de la commande
    console.log('Creating order with data:', {
      produits,
      client_id,
      prix_total
    });
    
    try {
      const nouvelleCommande = await Commande.create({
        produits,
        client_id,
        prix_total
      });
      
      console.log('Order created successfully:', nouvelleCommande);

      // Mise à jour des stocks
      for (const item of produits) {
        await mettreAJourStock(item.produit_id, item.quantite);
      }

      res.status(201).json({
        status: 'success',
        data: nouvelleCommande
      });
    } catch (dbError) {
      console.error('Error creating order in database:', dbError);
      return res.status(400).json({
        status: 'error',
        message: `Échec de création de la commande: ${dbError.message}`
      });
    }
  } catch (error) {
    console.error('Error in order creation process:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * @route GET /commande/:id
 * @description Récupérer une commande spécifique
 */
app.get('/commande/:id', async (req, res) => {
  try {
    // Remove the populate since Produit model isn't defined in this service
    const commande = await Commande.findById(req.params.id);
    
    if (!commande) {
      return res.status(404).json({
        status: 'error',
        message: 'Commande non trouvée'
      });
    }

    // If we want product details, we need to manually fetch them from the product service
    try {
      // Create a copy of the commande that we can modify
      const commandeWithProducts = commande.toObject();
      
      // Fetch product details for each product in the order
      if (commandeWithProducts.produits && commandeWithProducts.produits.length > 0) {
        const produitsDetails = await Promise.all(
          commandeWithProducts.produits.map(async (item) => {
            try {
              // Get product details from product service
              const produitData = await verifierProduit(item.produit_id);
              return {
                ...item,
                produit_details: produitData
              };
            } catch (error) {
              console.log(`Could not fetch details for product ${item.produit_id}: ${error.message}`);
              return item; // Return the item without details if there's an error
            }
          })
        );
        
        commandeWithProducts.produits = produitsDetails;
      }
      
      res.json({
        
        commandeWithProducts
      });
    } catch (productError) {
      // If we fail to get product details, return the order without them
      console.error('Error fetching product details:', productError);
      res.json({
        status: 'success',
        data: commande,
        message: 'Produit details could not be loaded'
      });
    }
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * @route PATCH /commande/:id/statut
 * @description Mettre à jour le statut d'une commande
 */
app.patch('/commande/:id/statut', async (req, res) => {
  try {
    const { statut } = req.body;
    
    if (!['Confirmée', 'Expédiée'].includes(statut)) {
      return res.status(400).json({
        status: 'error',
        message: 'Statut invalide'
      });
    }

    const commande = await Commande.findByIdAndUpdate(
      req.params.id,
      { statut },
      { new: true, runValidators: true }
    );

    if (!commande) {
      return res.status(404).json({
        status: 'error',
        message: 'Commande non trouvée'
      });
    }

    res.json({
      status: 'success',
      data: commande
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * @route GET /commandes
 * @description Récupérer toutes les commandes
 */
app.get('/commandes', async (req, res) => {
  try {
    const commandes = await Commande.find().sort({ created_at: -1 }).limit(10);
    res.json({
      status: 'success',
      count: commandes.length,
      data: commandes
    });
  } catch (error) {
    console.error('Error listing orders:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * @route GET /debug/db-status
 * @description Check database connection status
 */
app.get('/debug/db-status', async (req, res) => {
  try {
    const commandes = await Commande.countDocuments();
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    res.json({
      status: 'success',
      dbName: mongoose.connection.name,
      connected: mongoose.connection.readyState === 1,
      collections: collections.map(c => c.name),
      commandeCount: commandes
    });
  } catch (error) {
    console.error('Error checking DB status:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      connected: mongoose.connection.readyState === 1
    });
  }
});

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => {
  console.log(`Commande-Service en écoute sur le port ${PORT}`);
});