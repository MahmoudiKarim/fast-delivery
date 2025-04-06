require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Livraison = require('./Livraison');
// const auth = require('./auth');
const axios = require('axios');

const app = express();
app.use(express.json());

// Connexion MongoDB
mongoose.set('strictQuery', true);
mongoose.connect(
    "mongodb://localhost/livraison-service").
    then(() => console.log("Produit-Service DB Connected"))
    .catch(err => console.log(err));

// Middleware d'authentification
// app.use(auth);

/**
 * @route POST /livraison/ajouter
 * @description Créer une nouvelle livraison
 */


const COMMANDE_SERVICE_URL = process.env.COMMANDE_SERVICE_URL || 'http://localhost:4002';

async function verifierCommande(commandeId) {
  try {
    const response = await axios.get(`${COMMANDE_SERVICE_URL}/commande/${commandeId}`);
    return response.data;
  } catch (error) {
    throw new Error(`Commande ${commandeId} non trouvée`);
  }
}



app.post('/livraison/ajouter', async (req, res) => {
  try {
    const { commande_id, transporteur_id, adresse_livraison } = req.body;

    // Vérifier l'existence de la commande
    await verifierCommande(commande_id);

    // Créer la livraison
    const nouvelleLivraison = await Livraison.create({
      commande_id,
      transporteur_id,
      adresse_livraison
    });

    res.status(201).json({
      status: 'success',
      data: nouvelleLivraison
    });

  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * @route PUT /livraison/:id
 * @description Mettre à jour le statut d'une livraison
 */
app.put('/livraison/:id', async (req, res) => {
  try {
    const { statut } = req.body;

    // Validation du statut
    if (!['En attente', 'En cours', 'Livrée'].includes(statut)) {
      return res.status(400).json({
        status: 'error',
        message: 'Statut invalide'
      });
    }

    const livraison = await Livraison.findByIdAndUpdate(
      req.params.id,
      { statut },
      { new: true, runValidators: true }
    );

    if (!livraison) {
      return res.status(404).json({
        status: 'error',
        message: 'Livraison non trouvée'
      });
    }

    res.json({
      status: 'success',
      data: livraison
    });

  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

const PORT = process.env.PORT || 4003;
app.listen(PORT, () => {
  console.log(`Livraison-Service en écoute sur le port ${PORT}`);
});