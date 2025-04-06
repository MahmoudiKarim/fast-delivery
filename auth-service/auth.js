const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentification requise'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await mongoose.model('User').findById(decoded.id);
    next();
  } catch (error) {
    res.status(401).json({
      status: 'error',
      message: 'Token invalide ou expiré'
    });
  }
};