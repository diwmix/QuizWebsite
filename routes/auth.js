const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Отримання списку всіх користувачів (тільки адмін)
router.get('/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Помилка при отриманні списку користувачів', error: error.message });
  }
});

// Блокування/розблокування користувача (тільки адмін)
router.put('/users/:userId/toggle-lock', authenticateToken, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'Користувача не знайдено' });
    }
    
    user.isLocked = !user.isLocked;
    await user.save();
    
    res.json({ message: `Користувача успішно ${user.isLocked ? 'заблоковано' : 'розблоковано'}` });
  } catch (error) {
    res.status(500).json({ message: 'Помилка при зміні статусу користувача', error: error.message });
  }
});

// Видалення користувача (тільки адмін)
router.delete('/users/:userId', authenticateToken, isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'Користувача не знайдено' });
    }
    
    res.json({ message: 'Користувача успішно видалено' });
  } catch (error) {
    res.status(500).json({ message: 'Помилка при видаленні користувача', error: error.message });
  }
});

// Реєстрація нового користувача (тільки адмін)
router.post('/register', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { username, password, role, faculty } = req.body;
    
    // Перевірка чи користувач вже існує
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Користувач з таким іменем вже існує' });
    }
    
    // Створення нового користувача
    const user = new User({
      username,
      password,
      role: role || 'user',
      faculty
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

    // Перевірка на блокування
    if (user.isLocked) {
      return res.status(403).json({
        message: '❌ Доступ заборонено',
        details: 'Ваш обліковий запис заблоковано. Зверніться до адміністратора.'
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
        role: user.role,
        faculty: user.faculty,
        isLocked: user.isLocked
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

// Обновление факультета пользователя
router.put('/users/:userId/faculty', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { faculty } = req.body;
    const currentUser = req.user;

    // Проверяем, является ли текущий пользователь админом
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    // Обновляем факультет пользователя
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { faculty },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

module.exports = router; 