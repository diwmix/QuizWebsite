require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function createAdminUser() {
  try {
    // Підключення до MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Підключено до MongoDB');

    // Перевірка чи адмін вже існує
    const adminExists = await User.findOne({ username: 'admin' });
    if (adminExists) {
      console.log('Адміністратор вже існує');
      return;
    }

    // Створення адміністратора
    const admin = new User({
      username: 'admin',
      password: process.env.ADMIN_PASSWORD,
      role: 'admin'
    });

    await admin.save();
    console.log('Адміністратора успішно створено');

  } catch (error) {
    console.error('Помилка при створенні адміністратора:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Відключено від MongoDB');
  }
}

createAdminUser(); 