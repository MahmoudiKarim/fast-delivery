require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./User');

// Set a fallback JWT secret if not found in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_key_for_development';
console.log(`JWT_SECRET is ${JWT_SECRET ? 'set' : 'not set'}`);
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

const app = express();
app.use(express.json());

// Connexion MongoDB
mongoose.set('strictQuery', true);
mongoose.connect(
    "mongodb://localhost/auth-service").
    then(() => console.log("Auth-Service DB Connected"))
    .catch(err => console.log(err));

/**
 * @route POST /auth/register
 * @description Inscription utilisateur
 */
app.post('/auth/register', async (req, res) => {
  try {
    console.log('Registration attempt with:', { 
      email: req.body.email, 
      name: req.body.nom 
    });
    
    const { nom, email, mot_de_passe } = req.body;
    
    // Vérifier l'unicité de l'email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`User with email ${email} already exists`);
      return res.status(400).json({
        status: 'error',
        message: 'Cet email est déjà utilisé'
      });
    }

    console.log('Creating new user...');
    const newUser = await User.create({ nom, email, mot_de_passe });
    console.log(`User created with ID: ${newUser._id}`);
    
    // Créer le token JWT
    const token = jwt.sign(
      { id: newUser._id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: {
          id: newUser._id,
          nom: newUser.nom,
          email: newUser.email
        }
      }
    });

  } catch (error) {
    console.error('Error during registration:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * @route POST /auth/login
 * @description Connexion utilisateur
 */
app.post('/auth/login', async (req, res) => {
  try {
    const { email, mot_de_passe } = req.body;

    // Vérifier l'existence de l'utilisateur
    const user = await User.findOne({ email }).select('+mot_de_passe');
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier le mot de passe
    const validPassword = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!validPassword) {
      return res.status(401).json({
        status: 'error',
        message: 'Identifiants incorrects'
      });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { id: user._id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      status: 'success',
      token,
      data: {
        user: {
          id: user._id,
          nom: user.nom,
          email: user.email
        }
      }
    });

  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * @route GET /auth/profil
 * @description Récupérer le profil utilisateur
 */
app.get('/auth/profil', require('./auth'), (req, res) => {
  res.json({
    status: 'success',
    data: {
      user: {
        id: req.user._id,
        nom: req.user.nom,
        email: req.user.email,
        created_at: req.user.created_at
      }
    }
  });
});

// Add debugging route
app.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-mot_de_passe');
    res.json({
      status: 'success',
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

const PORT = process.env.PORT || 4004;
app.listen(PORT, () => {
  console.log(`Auth-Service en écoute sur le port ${PORT}`);
});