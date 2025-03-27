import React, { useState } from 'react';
import '../styles/QuestionCard.css';

function QuestionCard({ 
  currentQuestion, 
  totalQuestions, 
  question, 
  selectedAnswer, 
  onAnswerSelect, 
  onNext,
  onExit 
}) {
  const [showCorrect, setShowCorrect] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  const getAnswerClass = (answerId) => {
    if (!selectedAnswer) return '';
    if (showCorrect && answerId === question.correct_answer_id) return 'correct';
    if (showCorrect && answerId === selectedAnswer && answerId !== question.correct_answer_id) return 'wrong';
    if (answerId === selectedAnswer) return 'selected';
    return '';
  };

  const handleNext = () => {
    if (showCorrect) {
      setShowCorrect(false);
      onNext();
    } else {
      setShowCorrect(true);
    }
  };

  const handleExit = () => {
    setShowExitModal(true);
  };

  const confirmExit = () => {
    setShowExitModal(false);
    onExit();
  };

  const cancelExit = () => {
    setShowExitModal(false);
  };

  return (
    <div className="question-wrapper">
      <div className="question-header">
        <h2>Питання {currentQuestion + 1}/{totalQuestions}</h2>
        <h3 className="question-text">{question.text}</h3>
      </div>
      
      <div className="question-content">        
        <div className="answers-grid">
          {question.answers.map((answer, index) => {
            const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
            const answerClass = `answer-option ${getAnswerClass(answer.id)}`;
            
            return (
              <button
                key={answer.id}
                className={answerClass}
                onClick={() => !showCorrect && onAnswerSelect(question.id, answer.id)}
                disabled={showCorrect}
              >
                <span className="answer-letter">{letters[index]}</span>
                <span className="answer-text">{answer.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="navigation-buttons">
        <button
          className="exit-button"
          onClick={handleExit}
        >
          Вийти
        </button>
        <button
          className="next-button"
          onClick={handleNext}
          disabled={!selectedAnswer}
        >
          {showCorrect ? 'Наступне питання' : 'Показати відповідь'}
        </button>
      </div>

      {showExitModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Підтвердження виходу</h3>
            <p>Ви впевнені, що хочете вийти з тесту? Весь прогрес буде втрачено.</p>
            <div className="modal-buttons">
              <button className="modal-button cancel" onClick={cancelExit}>
                Скасувати
              </button>
              <button className="modal-button confirm" onClick={confirmExit}>
                Вийти
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuestionCard; 