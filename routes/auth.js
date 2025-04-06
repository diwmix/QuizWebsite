const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Реєстрація нового користувача (тільки адмін)
router.post('/register', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    // Перевірка чи користувач вже існує
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Користувач з таким іменем вже існує' });
    }
    
    // Створення нового користувача
    const user = new User({
      username,
      password,
      role: role || 'user'
    });
    
    await user.save();
    
    res.status(201).json({ message: 'Користувача успішно створено' });
  } catch (error) {
    res.status(500).json({ message: 'Помилка при створенні користувача', error: error.message });
  }
});

// Логін користувача
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Пошук користувача
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ 
        message: '❌ Помилка автентифікації',
        details: 'Користувача з таким іменем не знайдено. Перевірте правильність введених даних.'
      });
    }
    
    // Перевірка паролю
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        message: '❌ Помилка автентифікації',
        details: 'Невірний пароль. Будь ласка, спробуйте ще раз.'
      });
    }
    
    // Створення JWT токена
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Помилка при вході', error: error.message });
  }
});

// Отримання інформації про поточного користувача
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Помилка при отриманні інформації про користувача', error: error.message });
  }
});

module.exports = router; 