import React, { useState, useEffect } from 'react';
import axios from 'axios';
import QuestionCard from './QuestionCard';
import '../styles/TestList.css';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function TestList() {
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [showError, setShowError] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [testToStart, setTestToStart] = useState(null);

  useEffect(() => {
    const savedState = localStorage.getItem('testState');
    if (savedState) {
      const { selectedTest, currentQuestion, answers, result } = JSON.parse(savedState);
      setSelectedTest(selectedTest);
      setCurrentQuestion(currentQuestion);
      setAnswers(answers);
      setResult(result);
    }
    fetchTests();
  }, []);

  useEffect(() => {
    if (selectedTest) {
      const stateToSave = {
        selectedTest,
        currentQuestion,
        answers,
        result
      };
      localStorage.setItem('testState', JSON.stringify(stateToSave));
    } else {
      localStorage.removeItem('testState');
    }
  }, [selectedTest, currentQuestion, answers, result]);

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const fetchTests = async () => {
    try {
      setIsLoading(true);
      setShowError(false);
      setError('');
      
      const response = await axios.get(`${API_URL}/api/tests`, {
        timeout: 30000, // 30 секунд таймаут
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Неправильний формат даних від сервера');
      }
      
      const shuffledTests = shuffleArray(response.data);
      setTests(shuffledTests);
      setIsLoading(false);
    } catch (error) {
      console.error('Помилка при завантаженні тестів:', error);
      const errorMessage = error.response 
        ? `Помилка сервера: ${error.response.status}` 
        : error.code === 'ECONNABORTED'
        ? 'Час очікування відповіді від сервера минув'
        : 'Помилка підключення до сервера';
      
      setError(errorMessage);
      setTimeout(() => {
        setIsLoading(false);
        setShowError(true);
      }, 60000);
    }
  };

  const getUniqueSubjects = () => {
    const subjects = [...new Set(tests.map(test => test.subject))];
    return subjects.sort();
  };

  const getTestsBySubject = (subject) => {
    return tests.filter(test => test.subject === subject);
  };

  const handleStartClick = (test) => {
    setTestToStart(test);
    setShowStartModal(true);
  };

  const confirmStart = () => {
    if (!testToStart) return;
    
    const shuffledQuestions = shuffleArray(testToStart.questions).map(question => ({
      ...question,
      answers: shuffleArray(question.answers)
    }));
    setSelectedTest({...testToStart, questions: shuffledQuestions});
    setCurrentQuestion(0);
    setAnswers({});
    setResult(null);
    setShowStartModal(false);
    setTestToStart(null);
  };

  const cancelStart = () => {
    setShowStartModal(false);
    setTestToStart(null);
  };

  const handleAnswer = (questionId, answerId) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerId
    }));
  };

  const calculateResults = () => {
    let correctAnswers = 0;
    selectedTest.questions.forEach(question => {
      if (answers[question.id] === question.correct_answer_id) {
        correctAnswers++;
      }
    });
    
    const percentage = (correctAnswers / selectedTest.questions.length) * 100;
    setResult({
      total: selectedTest.questions.length,
      correct: correctAnswers,
      percentage: percentage.toFixed(1)
    });
  };

  const nextQuestion = () => {
    if (currentQuestion < selectedTest.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      calculateResults();
    }
  };

  const resetTest = () => {
    setSelectedTest(null);
    setCurrentQuestion(0);
    setAnswers({});
    setResult(null);
    localStorage.removeItem('testState');
  };

  const transliterate = (text) => {
    const ukrainianToLatin = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g',
      'д': 'd', 'е': 'e', 'є': 'ye', 'ж': 'zh', 'з': 'z',
      'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k',
      'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p',
      'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f',
      'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
      'ь': '', "'": '', 'ю': 'yu', 'я': 'ya',
      // Великі літери
      'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'H', 'Ґ': 'G',
      'Д': 'D', 'Е': 'E', 'Є': 'Ye', 'Ж': 'Zh', 'З': 'Z',
      'И': 'Y', 'І': 'I', 'Ї': 'Yi', 'Й': 'Y', 'К': 'K',
      'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P',
      'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F',
      'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch',
      'Ь': '', 'Ю': 'Yu', 'Я': 'Ya'
    };

    return text.split('').map(char => ukrainianToLatin[char] || char).join('');
  };

  const generateWordFile = async (test) => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: test.subject,
                bold: true,
                size: 36,
                font: "Calibri",
                color: "8B4513",
              }),
            ],
            spacing: {
              after: 300,
              line: 376,
            },
            alignment: "center",
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: test.theme,
                bold: true,
                size: 32,
                font: "Calibri",
                color: "CD853F",
              }),
            ],
            spacing: {
              after: 400,
              line: 376,
            },
            alignment: "center",
          }),
          ...test.questions.map((question, index) => [
            new Paragraph({
              children: [
                new TextRun({
                  text: `Питання ${index + 1}. `,
                  bold: true,
                  size: 28,
                  font: "Calibri",
                  color: "8B4513",
                }),
                new TextRun({
                  text: question.text,
                  size: 28,
                  font: "Calibri",
                  color: "000000",
                }),
              ],
              spacing: {
                before: 400,
                after: 200,
                line: 376,
              },
            }),
            ...question.answers.map((answer, ansIndex) => 
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${String.fromCharCode(65 + ansIndex)}) `,
                    bold: true,
                    size: 26,
                    font: "Calibri",
                    color: answer.id === question.correct_answer_id ? "006400" : "000000",
                  }),
                  new TextRun({
                    text: answer.text,
                    size: 26,
                    font: "Calibri",
                    color: answer.id === question.correct_answer_id ? "006400" : "000000",
                    bold: answer.id === question.correct_answer_id,
                  }),
                ],
                spacing: {
                  before: 100,
                  after: 100,
                  line: 376,
                },
                indent: {
                  left: 720,
                },
              })
            ),
            new Paragraph({
              children: [
                new TextRun({
                  text: "⎯".repeat(50),
                  color: "DEB887",
                  size: 24,
                }),
              ],
              spacing: {
                before: 200,
                after: 200,
              },
              alignment: "center",
            }),
          ]).flat(),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const transliteratedSubject = transliterate(test.subject);
    const transliteratedTheme = transliterate(test.theme);
    const fileName = `${transliteratedSubject}_${transliteratedTheme}.docx`
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_') // Замінюємо множинні підкреслення на одне
      .replace(/^_|_$/g, ''); // Видаляємо підкреслення на початку і в кінці
    saveAs(blob, fileName);
  };

  if (isLoading) {
    return (
      <div className="loading">
        Завантаження тестів...
        <p className="loading-subtext">
          Зачекайте, будь ласка. Перше завантаження може тривати до хвилини
        </p>
        <p className="loading-subtext">
          Якщо завантаження триває довше, спробуйте оновити сторінку
        </p>
      </div>
    );
  }

  if (showError && error) {
    return (
      <div className="error">
        <h2>{error}</h2>
        <p>Спробуйте оновити сторінку або зв'яжіться з адміністратором</p>
        <button onClick={() => window.location.reload()} className="reset-btn">
          Оновити сторінку
        </button>
      </div>
    );
  }

  if (selectedTest && !result) {
    const question = selectedTest.questions[currentQuestion];
    return (
      <QuestionCard
        currentQuestion={currentQuestion}
        totalQuestions={selectedTest.questions.length}
        question={question}
        selectedAnswer={answers[question.id]}
        onAnswerSelect={handleAnswer}
        onNext={nextQuestion}
        onExit={resetTest}
      />
    );
  }

  if (result) {
    return (
      <div className="result-container">
        <div className="result-card">
          <h2>Результати тесту</h2>
          <p>Тема: {selectedTest.subject} - {selectedTest.theme}</p>
          <div className="percentage">{result.percentage}%</div>
          <p>Правильних відповідей: {result.correct} з {result.total}</p>
          <button className="reset-btn" onClick={resetTest}>
            Спробувати інший тест
          </button>
        </div>
      </div>
    );
  }

  const subjects = getUniqueSubjects();

  return (
    <div className="test-list">
      <h1>ІФНМУ Тести</h1>
      <p className="description">
        Цей сайт створений для зручного проходження тестів з миттєвим показом правильних відповідей та можливістю додати свій тест з docs/docx файлу де зібрана база тестів. Всі тести взяті з ресурсу tests.if.ua та адаптовані для кращого досвіду навчання.
      </p>
      <div className="social-links">
        <a href="https://t.me/diwwmix" target="_blank" rel="noopener noreferrer" className="social-link">
          Telegram: @diwwmix
        </a>
        <a href="https://instagram.com/diwmix" target="_blank" rel="noopener noreferrer" className="social-link">
          Instagram: @diwmix
        </a>
      </div>
      
      <div className="subjects-list">
        <button 
          className={`subject-btn ${selectedSubject === null ? 'active' : ''}`}
          onClick={() => setSelectedSubject(null)}
        >
          Всі предмети
        </button>
        {subjects.map(subject => (
          <button
            key={subject}
            className={`subject-btn ${selectedSubject === subject ? 'active' : ''}`}
            onClick={() => setSelectedSubject(subject)}
          >
            {subject}
          </button>
        ))}
      </div>

      <div className="tests-grid">
        {(selectedSubject ? getTestsBySubject(selectedSubject) : tests).map(test => (
          <div key={test._id} className="test-card">
            <h3>{test.subject}</h3>
            <p className="theme">{test.theme}</p>
            <p className="questions-count">
              Кількість питань: {test.questions.length}
            </p>
            <div className="test-card-buttons">
              <button
                className="start-btn"
                onClick={() => handleStartClick(test)}
              >
                Почати тест
              </button>
              <button
                className="download-btn"
                onClick={() => generateWordFile(test)}
              >
                База тестів
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {(!selectedSubject && tests.length === 0) && (
        <div className="no-tests">Немає доступних тестів</div>
      )}
      {(selectedSubject && getTestsBySubject(selectedSubject).length === 0) && (
        <div className="no-tests">Немає тестів для вибраного предмету</div>
      )}
      
      <div className="info-message">
        На сайті можуть бути не всі тести. Для додавання нових тестів пишіть в Telegram
      </div>

      {showStartModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Підтвердження початку тесту</h3>
            <p>Ви впевнені, що хочете почати тест "{testToStart?.subject} - {testToStart?.theme}"?</p>
            <div className="modal-buttons">
              <button className="modal-button cancel" onClick={cancelStart}>
                Скасувати
              </button>
              <button className="modal-button confirm" onClick={confirmStart}>
                Почати
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TestList; 