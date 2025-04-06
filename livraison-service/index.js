require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Livraison = require('./Livraison');
// const auth = require('./auth');
const axios = require('axios');
const PORT = process.env.PORT || 4003;

const app = express();
app.use(express.json());


mongoose.set('strictQuery', true);
mongoose.connect(
    "mongodb://localhost/livraison-service").
    then(() => console.log("Produit-Service DB Connected"))
    .catch(err => console.log(err));


// app.use(auth);




const URL = 'http://localhost:4002';

async function verifierCommande(commandeId) {
  try {
    const response = await axios.get(`${URL}/commande/${commandeId}`);
    return response.data;
  } catch (error) {
    throw new Error(`Commande ${commandeId} non trouvée`);
  }
}

app.post('/livraison/ajouter', async (req, res) => {
  try {
    const { commande_id, transporteur_id, adresse_livraison } = req.body;
    await verifierCommande(commande_id);
    const nouvelleLivraison = await Livraison.create({
      commande_id,
      transporteur_id,
      adresse_livraison
    });

    res.status(201).json({
      data: nouvelleLivraison
    });

  } catch (error) {
    res.status(400).json({
      message: error.message
    });
  }
});


app.put('/livraison/:id', async (req, res) => {
  try {
    const { statut } = req.body;

    
    if (!['En attente', 'En cours', 'Livrée'].includes(statut)) {
      return res.status(400).json({
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
        message: 'Livraison non trouvée'
      });
    }

    res.json({
      data: livraison
    });

  } catch (error) {
    res.status(400).json({
      message: error.message
    });
  }
});


app.listen(PORT, () => {
  console.log(`Livraison-Service le port ${PORT}`);
});