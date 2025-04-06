const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware для перевірки JWT токена
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Необхідна автентифікація' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'Користувача не знайдено' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Недійсний токен' });
  }
};

// Middleware для перевірки ролі адміністратора
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Доступ заборонено. Потрібні права адміністратора.' });
  }
  next();
};

module.exports = {
  authenticateToken,
  isAdmin
}; 