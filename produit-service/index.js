require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Produit = require('./Produit');
const auth = require('../auth-service/auth');
const PORT = process.env.PORT || 4001;

const app = express();
app.use(express.json());

mongoose.set('strictQuery', true);
mongoose.connect(
    "mongodb://localhost/produits-service").
    then(() => console.log("Produit-Service DB Connected"))
    .catch(err => console.log(err));

// app.use(auth);
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
      message: error.message
    });
  }
});

app.patch('/produit/:id/stock', async (req, res) => {
  try {
    const { operation, quantite } = req.body;
    
    if (!['increment', 'decrement'].includes(operation)) {
      return res.status(400).json({
        
        message: 'Entrer juste increment ou decrement'
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
        message: 'Produit non trouve'
      });
    }

    res.json({
      produit
    });
  } catch (error) {
    res.status(400).json({
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Produits-Service le port ${PORT}`);
});