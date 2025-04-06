require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function createUser(username, password, role = 'user') {
  try {
    // Підключення до MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Підключено до MongoDB');

    // Перевірка чи користувач вже існує
    const userExists = await User.findOne({ username });
    if (userExists) {
      console.log(`Користувач з іменем "${username}" вже існує`);
      return;
    }

    // Створення користувача
    const user = new User({
      username,
      password,
      role
    });

    await user.save();
    console.log(`Користувача "${username}" успішно створено`);

  } catch (error) {
    console.error('Помилка при створенні користувача:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Відключено від MongoDB');
  }
}

// Отримання параметрів з командного рядка
const args = process.argv.slice(2);
const username = args[0];
const password = args[1];
const role = args[2] || 'user';

if (!username || !password) {
  console.log('Використання: node scripts/createUser.js <username> <password> [role]');
  console.log('role може бути "admin" або "user" (за замовчуванням "user")');
  process.exit(1);
}

createUser(username, password, role); 