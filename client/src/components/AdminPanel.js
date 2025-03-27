import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/AdminPanel.css';

function AdminPanel() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [tests, setTests] = useState([]);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [fileContent, setFileContent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [testToDelete, setTestToDelete] = useState(null);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('http://localhost:5000/api/tests');
      setTests(response.data);
      setStatus({ message: '', type: '' });
    } catch (error) {
      console.error('Помилка при завантаженні тестів:', error);
      setStatus({
        message: `Помилка при завантаженні тестів: ${error.response?.data?.message || error.message}`,
        type: 'error'
      });
      setTests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password.trim()) {
      setIsAuthenticated(true);
      setStatus({ message: 'Авторизовано успішно', type: 'success' });
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setStatus({ message: '', type: '' });
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target.result);
        if (!content.subject || !content.theme || !content.questions) {
          throw new Error('Неправильний формат JSON файлу');
        }
        setFileContent(content);
        setStatus({
          message: 'Файл успішно прочитано',
          type: 'success'
        });
      } catch (error) {
        console.error('Помилка читання файлу:', error);
        setStatus({
          message: `Помилка читання JSON файлу: ${error.message}`,
          type: 'error'
        });
        setFileContent(null);
      }
    };
    reader.onerror = () => {
      setStatus({
        message: 'Помилка читання файлу',
        type: 'error'
      });
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !fileContent) {
      setStatus({
        message: 'Будь ласка, виберіть коректний JSON файл',
        type: 'error'
      });
      return;
    }

    if (!isAuthenticated || !password) {
      setStatus({
        message: 'Необхідно ввести пароль',
        type: 'error'
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.post('http://localhost:5000/api/test', fileContent, {
        headers: {
          'Authorization': `Bearer ${password}`
        }
      });
      
      setStatus({
        message: 'Тест успішно збережено',
        type: 'success'
      });
      
      setSelectedFile(null);
      setFileContent(null);
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';
      
      await fetchTests();
    } catch (error) {
      console.error('Помилка при збереженні:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        setStatus({
          message: 'Невірний пароль або доступ заборонено',
          type: 'error'
        });
        setIsAuthenticated(false);
      } else {
        setStatus({
          message: `Помилка при збереженні тесту: ${error.response?.data?.message || error.message}`,
          type: 'error'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (test) => {
    setTestToDelete(test);
    setShowDeleteModal(true);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setTestToDelete(null);
  };

  const confirmDelete = async () => {
    if (!testToDelete || !isAuthenticated) return;

    try {
      setIsLoading(true);
      await axios.delete(`http://localhost:5000/api/test/${testToDelete._id}`, {
        headers: {
          'Authorization': `Bearer ${password}`
        }
      });
      
      setStatus({
        message: 'Тест успішно видалено',
        type: 'success'
      });
      
      await fetchTests();
    } catch (error) {
      console.error('Помилка при видаленні тесту:', error);
      setStatus({
        message: `Помилка при видаленні тесту: ${error.response?.data?.message || error.message}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false);
      setTestToDelete(null);
    }
  };

  return (
    <div className="admin-panel">
      <div className="header">
        <h1>Адмін-панель</h1>
      </div>

      <div className="upload-section">
        {!isAuthenticated ? (
          <form onSubmit={handlePasswordSubmit} className="auth-form">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введіть пароль"
              className="password-input"
            />
            <button type="submit" className="auth-btn">
              Увійти
            </button>
          </form>
        ) : (
          <>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="file-input"
              id="file-input"
              disabled={isLoading}
            />
            <label htmlFor="file-input" className="file-label" style={{ opacity: isLoading ? 0.7 : 1 }}>
              Вибрати файл з тестом
            </label>
            {selectedFile && <p className="selected-file">{selectedFile.name}</p>}

            <button
              className="upload-btn"
              onClick={handleUpload}
              disabled={!selectedFile || !fileContent || isLoading}
            >
              {isLoading ? 'Завантаження...' : 'Зберегти тест'}
            </button>
          </>
        )}

        {status.message && (
          <div className={`status-message ${status.type}`}>
            {status.message}
          </div>
        )}
      </div>

      <div className="tests-list">
        <h2>Збережені тести:</h2>
        {isLoading ? (
          <div className="loading">Завантаження...</div>
        ) : tests.length > 0 ? (
          tests.map((test) => (
            <div key={test._id} className="test-item">
              <h3>{test.subject}</h3>
              <p className="test-theme">{test.theme}</p>
              <p className="test-date">
                Додано: {new Date(test.createdAt).toLocaleString()}
              </p>
              <p className="test-questions">
                Кількість питань: {test.questions.length}
              </p>
              {isAuthenticated && (
                <button 
                  className="delete-btn"
                  onClick={() => handleDeleteClick(test)}
                  disabled={isLoading}
                >
                  Видалити тест
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="no-tests">Немає збережених тестів</div>
        )}
      </div>

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Підтвердження видалення</h3>
            <p>Ви впевнені, що хочете видалити тест "{testToDelete?.subject} - {testToDelete?.theme}"?</p>
            <div className="modal-buttons">
              <button className="modal-button cancel" onClick={cancelDelete}>
                Скасувати
              </button>
              <button className="modal-button confirm" onClick={confirmDelete}>
                Видалити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel; 