import React, { useState, useEffect, useContext } from 'react';
import '../styles/AdminPanel.css';
import { getData, postData, putData, deleteData } from '../utils/api';
import { AuthContext } from '../App';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function AdminPanel() {
  const { user, handleLogout } = useContext(AuthContext);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileContents, setFileContents] = useState([]);
  const [tests, setTests] = useState([]);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [testToDelete, setTestToDelete] = useState(null);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      setIsLoading(true);
      const data = await getData(`${API_URL}/api/tests`);
      setTests(data);
      setStatus({ message: '', type: '' });
    } catch (error) {
      console.error('Помилка при завантаженні тестів:', error);
      setStatus({
        message: `Помилка при завантаженні тестів: ${error.message || 'Невідома помилка'}`,
        type: 'error'
      });
      setTests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    setSelectedFiles(files);
    setStatus({ message: '', type: '' });
    
    const readFiles = files.map(file => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = JSON.parse(e.target.result);
            if (!content.subject || !content.theme || !content.questions) {
              throw new Error(`Неправильний формат JSON файлу: ${file.name}`);
            }
            resolve(content);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error(`Помилка читання файлу: ${file.name}`));
        reader.readAsText(file);
      });
    });

    Promise.all(readFiles)
      .then(contents => {
        setFileContents(contents);
        setStatus({
          message: `Успішно прочитано ${contents.length} файл(ів)`,
          type: 'success'
        });
      })
      .catch(error => {
        console.error('Помилка читання файлів:', error);
        setStatus({
          message: `Помилка читання файлів: ${error.message}`,
          type: 'error'
        });
        setFileContents([]);
        setSelectedFiles([]);
      });
  };

  const handleUpload = async () => {
    if (!selectedFiles.length || !fileContents.length) {
      setStatus({
        message: 'Будь ласка, виберіть коректні JSON файли',
        type: 'error'
      });
      return;
    }

    try {
      setIsLoading(true);
      await postData(`${API_URL}/api/tests/batch`, fileContents);
      
      setStatus({
        message: `Успішно збережено ${fileContents.length} тест(ів)`,
        type: 'success'
      });
      
      setSelectedFiles([]);
      setFileContents([]);
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';
      
      await fetchTests();
    } catch (error) {
      console.error('Помилка при збереженні:', error);
      setStatus({
        message: `Помилка при збереженні тестів: ${error.message || 'Невідома помилка'}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = async (test) => {
    try {
      const data = await getData(`${API_URL}/api/test/${test._id}`);
      setTestToDelete(data);
      setShowDeleteModal(true);
    } catch (error) {
      console.error('Помилка при завантаженні тесту:', error);
      setStatus({
        message: 'Помилка при завантаженні тесту',
        type: 'error'
      });
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setTestToDelete(null);
  };

  const confirmDelete = async () => {
    if (!testToDelete) return;

    try {
      setIsLoading(true);
      await deleteData(`${API_URL}/api/test/${testToDelete._id}`);
      
      setStatus({
        message: 'Тест успішно видалено',
        type: 'success'
      });
      
      await fetchTests();
    } catch (error) {
      console.error('Помилка при видаленні тесту:', error);
      setStatus({
        message: `Помилка при видаленні тесту: ${error.message || 'Невідома помилка'}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false);
      setTestToDelete(null);
    }
  };

  const handleLockTest = async (testId, isLocked) => {
    try {
      setIsLoading(true);
      await putData(`${API_URL}/api/test/${testId}/lock`, { isLocked });
      
      setStatus({
        message: `Тест успішно ${isLocked ? 'заблоковано' : 'розблоковано'}`,
        type: 'success'
      });
      
      await fetchTests();
    } catch (error) {
      console.error('Помилка при блокуванні тесту:', error);
      setStatus({
        message: `Помилка при блокуванні тесту: ${error.message || 'Невідома помилка'}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const SkeletonTestItem = () => (
    <div className="skeleton-test-item">
      <div className="skeleton-title"></div>
      <div className="skeleton-theme"></div>
      <div className="skeleton-date"></div>
      <div className="skeleton-count"></div>
      <div className="skeleton-buttons">
        <div className="skeleton-button"></div>
        <div className="skeleton-button"></div>
      </div>
    </div>
  );

  return (
    <div className="admin-panel">
      <div className="header">
        <h1>Адмін-панель</h1>
        {user && (
          <button onClick={handleLogout} className="logout-btn">
            Вийти
          </button>
        )}
      </div>

      <div className="upload-section">
        {user && (
          <>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="file-input"
              id="file-input"
              disabled={isLoading}
              multiple
            />
            <label htmlFor="file-input" className="file-label" style={{ opacity: isLoading ? 0.7 : 1 }}>
              Вибрати файли з тестами
            </label>
            {selectedFiles.length > 0 && (
              <div className="selected-files">
                {selectedFiles.map((file, index) => (
                  <p key={index} className="selected-file">{file.name}</p>
                ))}
              </div>
            )}

            <button
              className="upload-btn"
              onClick={handleUpload}
              disabled={!selectedFiles.length || !fileContents.length || isLoading}
            >
              {isLoading ? 'Завантаження...' : `Зберегти тести (${selectedFiles.length})`}
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
          [...Array(3)].map((_, index) => <SkeletonTestItem key={index} />)
        ) : tests.length > 0 ? (
          tests.map((test) => (
            <div key={test._id} className="test-item">
              <h3>{test.subject}</h3>
              <p className="test-theme">{test.theme}</p>
              <p className="test-date">
                Додано: {new Date(test.createdAt).toLocaleString()}
              </p>
              <p className="test-questions">
                Кількість питань: {test.questionsCount}
              </p>
              {user && (
                <div className="test-actions">
                  <button 
                    className={`lock-btn ${test.isLocked ? 'locked' : ''}`}
                    onClick={() => handleLockTest(test._id, !test.isLocked)}
                    disabled={isLoading}
                  >
                    {test.isLocked ? 'Розблокувати' : 'Заблокувати'}
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDeleteClick(test)}
                    disabled={isLoading}
                  >
                    Видалити
                  </button>
                </div>
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