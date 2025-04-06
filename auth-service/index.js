require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./User');
const PORT = process.env.PORT || 4004;
const JWT_SECRET = 'secret'



const app = express();
app.use(express.json());


mongoose.set('strictQuery', true);
mongoose.connect(
    "mongodb://localhost/auth-service").
    then(() => console.log("Auth-Service DB Connected"))
    .catch(err => console.log(err));


app.post('/auth/register', async (req, res) => {
  try {
    const { nom, email, mot_de_passe } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`email ${email} deja exists`);
      return res.status(400).json({
        message: 'email est déjà utilisé'
      });
    }
    const newUser = await User.create({ nom, email, mot_de_passe });
 
    
    
    const token = jwt.sign(
      { id: newUser._id },
      JWT_SECRET,
    );

    res.status(201).json({

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
    res.status(400).json({
      message: error.message
    });
  }
});


app.post('/auth/login', async (req, res) => {
  try {
    const { email, mot_de_passe } = req.body;
    const user = await User.findOne({ email }).select('+mot_de_passe');
    if (!user) {
      return res.status(404).json({
        message: 'user non trouvé'
      });
    }

  
    const validPassword = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!validPassword) {
      return res.status(401).json({
        message: 'user incorrects'
      });
    }

    
    const token = jwt.sign(
      { id: user._id },
      JWT_SECRET,
    );

    res.json({

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
      message: error.message
    });
  }
});


app.get('/auth/profil', require('./auth'), (req, res) => {
  res.json({
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


app.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-mot_de_passe');
    res.json({

      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});


app.listen(PORT, () => {
  console.log(`Auth-Service le port ${PORT}`);
});