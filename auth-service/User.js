const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  nom: String,

  email:String,

  mot_de_passe: String,
  
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Hachage du mot de passe avant sauvegarde
UserSchema.pre('save', async function(next) {
  if (!this.isModified('mot_de_passe')) return next();
  this.mot_de_passe = await bcrypt.hash(this.mot_de_passe, 12);
  next();
});

module.exports = mongoose.model('User', UserSchema);