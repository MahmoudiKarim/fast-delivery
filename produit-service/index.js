require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Produit = require('./Produit');
const auth = require('./auth');

const app = express();
app.use(express.json());

// Connexion MongoDB
mongoose.set('strictQuery', true);
mongoose.connect(
    "mongodb://localhost/produits-service").
    then(() => console.log("Produit-Service DB Connected"))
    .catch(err => console.log(err));

// Routes protégées
// app.use(auth);

/**
 * @route POST /produit/ajouter
 * @description Ajouter un nouveau produit
 * @access Privé (Admin)
 */
app.post('/produit/ajouter', async (req, res) => {
  try {
    const { nom, description, prix, stock } = req.body;
    
    const nouveauProduit = await Produit.create({
      nom,
      description,
      prix,
      stock
    });

    res.status(201).json({
      nouveauProduit
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * @route GET /produit/:id
 * @description Récupérer un produit spécifique
 * @access Privé
 */
app.get('/produit/:id', async (req, res) => {
  try {
    const produit = await Produit.findById(req.params.id);
    
    if (!produit) {
      return res.status(404).json({
        status: 'error',
        message: 'Produit non trouvé'
      });
    }

    res.json({
      
      produit
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * @route PATCH /produit/:id/stock
 * @description Mettre à jour le stock
 * @access Privé (Admin)
 */
app.patch('/produit/:id/stock', async (req, res) => {
  try {
    const { operation, quantite } = req.body;
    
    if (!['increment', 'decrement'].includes(operation)) {
      return res.status(400).json({
        status: 'error',
        message: 'Opération invalide (doit être "increment" ou "decrement")'
      });
    }

    const update = operation === 'increment' 
      ? { $inc: { stock: quantite } } 
      : { $inc: { stock: -quantite } };

    const produit = await Produit.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );

    if (!produit) {
      return res.status(404).json({
        status: 'error',
        message: 'Produit non trouvé'
      });
    }

    res.json({
      status: 'success',
      data: produit
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Erreur serveur'
  });
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`Produits-Service en écoute sur le port ${PORT}`);
});