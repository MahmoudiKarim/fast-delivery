const mongoose = require('mongoose');

const CommandeSchema = new mongoose.Schema({
  produits: [{
    produit_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Produit' },
    quantite: Number
  }],
  client_id: String,
  prix_total: Number,
  statut: { type: String, enum: ['En attente', 'Confirmée', 'Expédiée'], default: 'En attente' },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Commande', CommandeSchema);