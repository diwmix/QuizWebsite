require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Test = require('./models/Test');
const { authenticateToken, isAdmin } = require('./middleware/auth');
const authRoutes = require('./routes/auth');

// Перевірка змінних середовища
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`Помилка: Відсутні змінні середовища: ${missingEnvVars.join(', ')}`);
}

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['https://ifnmu.vercel.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Збільшуємо ліміт розміру JSON-даних
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add a preflight OPTIONS handler for all routes
app.options('*', (req, res) => {
  res.status(204).end();
});

// Підключення до MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch(err => {
  console.error('MongoDB connection error:', err);
});

// Обробка помилок підключення до MongoDB
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Базовий роут для перевірки
app.get('/', (req, res) => {
  res.json({ message: 'API працює' });
});

// API роути
const apiRouter = express.Router();

// Ендпоінт для збереження тесту (захищений)
apiRouter.post('/test', authenticateToken, isAdmin, async (req, res) => {
  try {
    const testData = req.body;
    testData.questionsCount = testData.questions?.length || 0;
    
    const newTest = new Test(testData);
    const savedTest = await newTest.save();
    
    res.status(201).json({ message: 'Тест успішно збережено', testId: savedTest._id });
  } catch (error) {
    res.status(500).json({ message: 'Помилка при збереженні тесту', error: error.message });
  }
});

// Отримання всіх тестів (захищений доступ)
apiRouter.get('/tests', authenticateToken, async (req, res) => {
  try {
    // Отримуємо факультет користувача
    const userFaculty = req.user.faculty;
    
    // Знаходимо тести тільки для факультету користувача
    const tests = await Test.find({ faculty: userFaculty }).select('-questions');
    res.json(tests);
  } catch (error) {
    res.status(500).json({ message: 'Помилка при отриманні тестів', error: error.message });
  }
});

// Отримання повного тесту за ID (публічний доступ)
apiRouter.get('/test/:id', async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ message: 'Тест не знайдено' });
    }
    res.json(test);
  } catch (error) {
    res.status(500).json({ message: 'Помилка при отриманні тесту', error: error.message });
  }
});

// Видалення тесту (захищений доступ)
apiRouter.delete('/test/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await Test.findByIdAndDelete(req.params.id);
    
    if (!result) {
      return res.status(404).json({ message: 'Тест не знайдено' });
    }
    
    res.json({ message: 'Тест успішно видалено' });
  } catch (error) {
    res.status(500).json({ message: 'Помилка при видаленні тесту', error: error.message });
  }
});

// Оновлення статусу блокування тесту (захищений доступ)
apiRouter.put('/test/:id/lock', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { isLocked } = req.body;
    
    const updatedTest = await Test.findByIdAndUpdate(
      req.params.id,
      { isLocked },
      { new: true }
    );
    
    if (!updatedTest) {
      return res.status(404).json({ message: 'Тест не знайдено' });
    }
    
    res.json(updatedTest);
  } catch (error) {
    res.status(500).json({ message: 'Помилка при оновленні статусу блокування тесту', error: error.message });
  }
});

// Ендпоінт для пакетного збереження тестів (захищений)
apiRouter.post('/tests/batch', authenticateToken, isAdmin, async (req, res) => {
  try {
    const testsData = req.body;
    
    if (!Array.isArray(testsData)) {
      return res.status(400).json({ 
        message: 'Неправильний формат даних. Очікується масив тестів.' 
      });
    }

    const testsToSave = testsData.map(testData => ({
      ...testData,
      questionsCount: testData.questions?.length || 0
    }));

    const savedTests = await Promise.all(
      testsToSave.map(testData => {
        const newTest = new Test(testData);
        return newTest.save();
      })
    );

    res.status(201).json(savedTests);
  } catch (error) {
    res.status(500).json({ message: 'Помилка при збереженні тестів', error: error.message });
  }
});

// Використовуємо API роути
app.use('/api', apiRouter);

// Використовуємо маршрути аутентифікації
app.use('/api/auth', authRoutes);

// Обробка помилок
app.use((err, req, res, next) => {
  console.error('Помилка сервера:', err);
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ 
      message: 'Недійсний токен', 
      error: err.message 
    });
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      message: 'Помилка валідації', 
      error: err.message 
    });
  }
  
  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    return res.status(500).json({ 
      message: 'Помилка бази даних', 
      error: err.message 
    });
  }
  
  res.status(500).json({ 
    message: 'Внутрішня помилка сервера', 
    error: process.env.NODE_ENV === 'production' ? 'Щось пішло не так' : err.message 
  });
});

// Обробка невідомих маршрутів
app.use((req, res) => {
  res.status(404).json({ message: 'Маршрут не знайдено' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});