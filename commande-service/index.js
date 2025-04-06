require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Commande = require('./Commande');
// const auth = require('./auth');
const axios = require('axios');
const { ObjectId } = mongoose.Types;
const PORT = process.env.PORT || 4002;

const app = express();
app.use(express.json());


function isValidObjectId(id) {
  if (!id || typeof id !== 'string') return false;
  return ObjectId.isValid(id) && (new ObjectId(id)).toString() === id;
}


mongoose.set('strictQuery', true);
mongoose.connect(
    "mongodb://localhost/commande-service").
    then(() => console.log("Produit-Service DB Connected"))
    .catch(err => console.log(err));


// app.use(auth);





const URL = 'http://localhost:4001';

async function verifierProduit(produitId) {
  try {
    const response = await axios.get(`${URL}/produit/${produitId}`);
    
    if (!response.data || !response.data.produit || !response.data.produit.prix) {
      console.error('formt non valid', response.data);
      throw new Error(`donnes non valid ${produitId}`);
    }
    return response.data.produit; 
  } catch (error) {
    console.error(`problem ${produitId}:`, error.message);
    throw new Error(`Produit ${produitId} pas trouve`);
  }
}

async function mettreAJourStock(produitId, quantite) {
  try {
    await axios.patch(`${URL}/produit/${produitId}/stock`, {
      operation: 'decrement',
      quantite: quantite
    });
  } catch (error) {
    throw new Error(`mise ajour echec! ${produitId}`);
  }
}



app.post('/commande/ajouter', async (req, res) => {
  try {
    const { produits, client_id } = req.body;
    
    if (!produits || !Array.isArray(produits) || produits.length === 0) {
      return res.status(400).json({
        message: 'La commande doit un produit au min'
      });
    }
    
    console.log('commande creer:', produits);
    
    
    for (const item of produits) {
      if (!item.produit_id || !isValidObjectId(item.produit_id)) {
        console.error(`id non valid: ${item.produit_id}`);
        return res.status(400).json({

          message: `id non valid: ${item.produit_id}`
        });
      }
    }
    
    let prix_total = 0;

   
    for (const item of produits) {
      console.log(`verifier produit: ${item.produit_id}, quantity: ${item.quantite}`);
      try {
        const produit = await verifierProduit(item.produit_id);
        
        console.log(`Product prix: ${produit.prix}, stock: ${produit.stock}`);
        
        if (produit.stock < item.quantite) {
          return res.status(400).json({

            message: `Stock insuffisant ${produit.nom}`
          });
        }

        const itemPrice = produit.prix * item.quantite;
        console.log(`total prix: ${itemPrice}`);
        prix_total += itemPrice;
      } catch (error) {
        return res.status(400).json({

          message: error.message
        });
      }
    }

    console.log(`Total prix: ${prix_total}`);
    
   
    if (isNaN(prix_total) || prix_total <= 0) {
      return res.status(400).json({
        message: 'Le prix total invalid'
      });
    }

    
    console.log('commande creer:', {
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
      
      console.log('order reussit:', nouvelleCommande);

      
      for (const item of produits) {
        await mettreAJourStock(item.produit_id, item.quantite);
      }

      res.status(201).json({
        
        data: nouvelleCommande
      });
    } catch (dbError) {
      console.error('commande echec:', dbError);
      return res.status(400).json({
        message: `commande echec: ${dbError.message}`
      });
    }
  } catch (error) {
    console.error('Error :', error);
    res.status(400).json({
      message: error.message
    });
  }
});


app.get('/commande/:id', async (req, res) => {
  try {
    
    const commande = await Commande.findById(req.params.id);
    
    if (!commande) {
      return res.status(404).json({
        message: 'Commande non trouvée'
      });
    }

    
    try {
      
      const commandeWithProducts = commande.toObject();
      
      
      if (commandeWithProducts.produits && commandeWithProducts.produits.length > 0) {
        const produitsDetails = await Promise.all(
          commandeWithProducts.produits.map(async (item) => {
            try {
              
              const produitData = await verifierProduit(item.produit_id);
              return {
                ...item,
                produit_details: produitData
              };
            } catch (error) {
              console.log(`problem  ${item.produit_id}: ${error.message}`);
              return item; 
            }
          })
        );
        
        commandeWithProducts.produits = produitsDetails;
      }
      
      res.json({
        
        commandeWithProducts
      });
    } catch (productError) {
      
      
      res.json({
        
        data: commande,
        
      });
    }
  } catch (error) {
    res.status(400).json({
      message: error.message
    });
  }
});


app.patch('/commande/:id/statut', async (req, res) => {
  try {
    const { statut } = req.body;
    
    if (!['Confirmée', 'Expédiée'].includes(statut)) {
      return res.status(400).json({
        message: 'Statut non valid'
      });
    }

    const commande = await Commande.findByIdAndUpdate(
      req.params.id,
      { statut },
      
    );

    if (!commande) {
      return res.status(404).json({
        message: 'Commande non trouvée'
      });
    }

    res.json({
      
      data: commande
    });
  } catch (error) {
    res.status(400).json({
      message: error.message
    });
  }
});




app.listen(PORT, () => {
  console.log(`Commande-Service le port ${PORT}`);
});