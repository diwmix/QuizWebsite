require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const { authenticateToken } = require('./middleware/auth');
const authRoutes = require('./routes/auth');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['https://ifnmu.vercel.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Add a preflight OPTIONS handler for all routes
app.options('*', cors());

// Підключення до MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware для перевірки автентифікації
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ message: 'Необхідна автентифікація' });
  }

  const password = authHeader.split(' ')[1];
  
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(403).json({ message: 'Доступ заборонено' });
  }

  next();
};

// Базовий роут для перевірки
app.get('/', (req, res) => {
  res.json({ message: 'API працює' });
});

// Схема для відповіді
const answerSchema = new mongoose.Schema({
  id: String,
  text: String
});

// Схема для питання
const questionSchema = new mongoose.Schema({
  id: String,
  text: String,
  answers: [answerSchema],
  correct_answer_id: String
});

// Схема для тесту
const testSchema = new mongoose.Schema({
  faculty: String,
  course: String,
  subject: String,
  theme: String,
  questions: [questionSchema],
  questionsCount: { type: Number, default: 0 },
  isLocked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Test = mongoose.model('Test', testSchema);

// API роути
const apiRouter = express.Router();

// Ендпоінт для збереження тесту (захищений)
apiRouter.post('/test', authenticateAdmin, async (req, res) => {
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
    const tests = await Test.find()
      .select('-questions')
      .sort({ createdAt: -1 });
    res.json(tests);
  } catch (error) {
    res.status(500).json({ message: 'Помилка при отриманні тестів', error: error.message });
  }
});

// Отримання повного тесту за ID (захищений доступ)
apiRouter.get('/test/:id', authenticateToken, async (req, res) => {
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
apiRouter.delete('/test/:id', authenticateAdmin, async (req, res) => {
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
apiRouter.put('/test/:id/lock', authenticateAdmin, async (req, res) => {
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
apiRouter.post('/tests/batch', authenticateAdmin, async (req, res) => {
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
    
    res.status(201).json({ 
      message: `Успішно збережено ${savedTests.length} тест(ів)`,
      testIds: savedTests.map(test => test._id)
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Помилка при збереженні тестів', 
      error: error.message 
    });
  }
});

// Використовуємо API роути
app.use('/api', apiRouter);

// Використовуємо маршрути аутентифікації
app.use('/api/auth', authRoutes);

// Обробка помилок
app.use((err, req, res, next) => {
  console.error('Помилка сервера:', err);
  res.status(500).json({ message: 'Внутрішня помилка сервера', error: err.message });
});

// Обробка невідомих маршрутів
app.use((req, res) => {
  res.status(404).json({ message: 'Маршрут не знайдено' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});