require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

console.log('Підключення до MongoDB...');
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB успішно підключено');
}).catch((err) => {
  console.error('Помилка підключення до MongoDB:', err);
});

const db = mongoose.connection;
db.on('error', (err) => {
  console.error('MongoDB помилка підключення:', err);
});
db.once('open', () => {
  console.log('MongoDB підключення відкрито');
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
  subject: String,
  theme: String,
  questions: [questionSchema],
  createdAt: { type: Date, default: Date.now }
});

const Test = mongoose.model('Test', testSchema);

// API роути
const apiRouter = express.Router();

// Ендпоінт для збереження тесту (захищений)
apiRouter.post('/test', authenticateAdmin, async (req, res) => {
  try {
    console.log('Отримано запит на збереження тесту');
    const testData = req.body;
    console.log('Дані тесту:', JSON.stringify(testData, null, 2));
    
    const newTest = new Test(testData);
    const savedTest = await newTest.save();
    
    console.log('Тест успішно збережено з ID:', savedTest._id);
    res.status(201).json({ message: 'Тест успішно збережено', testId: savedTest._id });
  } catch (error) {
    console.error('Помилка при збереженні тесту:', error);
    res.status(500).json({ message: 'Помилка при збереженні тесту', error: error.message });
  }
});

// Отримання всіх тестів (публічний доступ)
apiRouter.get('/tests', async (req, res) => {
  try {
    console.log('Отримано запит на отримання тестів');
    const tests = await Test.find().sort({ createdAt: -1 });
    console.log(`Знайдено ${tests.length} тестів`);
    res.json(tests);
  } catch (error) {
    console.error('Помилка при отриманні тестів:', error);
    res.status(500).json({ message: 'Помилка при отриманні тестів', error: error.message });
  }
});

// Видалення тесту (захищений доступ)
apiRouter.delete('/test/:id', authenticateAdmin, async (req, res) => {
  try {
    console.log('Отримано запит на видалення тесту:', req.params.id);
    const result = await Test.findByIdAndDelete(req.params.id);
    
    if (!result) {
      return res.status(404).json({ message: 'Тест не знайдено' });
    }
    
    console.log('Тест успішно видалено');
    res.json({ message: 'Тест успішно видалено' });
  } catch (error) {
    console.error('Помилка при видаленні тесту:', error);
    res.status(500).json({ message: 'Помилка при видаленні тесту', error: error.message });
  }
});

// Використовуємо API роути
app.use('/api', apiRouter);

// Обробка помилок
app.use((err, req, res, next) => {
  console.error('Помилка сервера:', err);
  res.status(500).json({ message: 'Внутрішня помилка сервера', error: err.message });
});

// Обробка невідомих маршрутів
app.use((req, res) => {
  res.status(404).json({ message: 'Маршрут не знайдено' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Сервер запущено на порту ${port}`);
  console.log(`Доступний за адресою: http://localhost:${port}`);
});