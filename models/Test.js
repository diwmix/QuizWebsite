const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  id: String,
  text: String
});

const questionSchema = new mongoose.Schema({
  id: String,
  text: String,
  answers: [answerSchema],
  correct_answer_id: String
});

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

module.exports = Test; 