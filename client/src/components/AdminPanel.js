import React, { useState, useEffect, useContext } from 'react';
import '../styles/AdminPanel.css';
import { getData, postData, putData, deleteData } from '../utils/api';
import { AuthContext } from '../App';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function AdminPanel() {
  const { user: currentUser, handleLogout } = useContext(AuthContext);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileContents, setFileContents] = useState([]);
  const [tests, setTests] = useState([]);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [testToDelete, setTestToDelete] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openSections, setOpenSections] = useState({
    users: true,
    tests: true
  });
  const [selectedFaculty, setSelectedFaculty] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [faculties, setFaculties] = useState([]);
  const [subjects, setSubjects] = useState([]);
  
  // Стан для нового користувача
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    faculty: '',
    role: 'user'
  });

  const [editingFaculty, setEditingFaculty] = useState(null);
  const [newFaculty, setNewFaculty] = useState('');

  useEffect(() => {
    fetchTests();
    fetchUsers();
  }, []);

  useEffect(() => {
    // Extract unique faculties from tests
    const uniqueFaculties = [...new Set(tests.map(test => test.faculty))];
    setFaculties(uniqueFaculties);
  }, [tests]);

  // Update subjects when faculty changes
  useEffect(() => {
    if (selectedFaculty === 'all') {
      // If all faculties are selected, show all subjects
      const uniqueSubjects = [...new Set(tests.map(test => test.subject))];
      setSubjects(uniqueSubjects);
    } else {
      // Show only subjects for selected faculty
      const facultySubjects = [...new Set(
        tests
          .filter(test => test.faculty === selectedFaculty)
          .map(test => test.subject)
      )];
      setSubjects(facultySubjects);
    }
    // Reset subject selection when faculty changes
    setSelectedSubject('all');
  }, [selectedFaculty, tests]);

  // Filter tests based on selected faculty and subject
  const filteredTests = tests.filter(test => {
    const facultyMatch = selectedFaculty === 'all' || test.faculty === selectedFaculty;
    const subjectMatch = selectedSubject === 'all' || test.subject === selectedSubject;
    return facultyMatch && subjectMatch;
  });

  const fetchTests = async () => {
    try {
      setIsLoading(true);
      const data = await getData(`${API_URL}/api/admin/tests`);
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

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getData(`${API_URL}/api/auth/users`);
      setUsers(data);
      setError(null);
    } catch (err) {
      console.error('Помилка при завантаженні користувачів:', err);
      setError('Не вдалося завантажити список користувачів');
      setUsers([]);
    } finally {
      setLoading(false);
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

  const handleCreateUser = async (userData) => {
    try {
      setLoading(true);
      await postData(`${API_URL}/api/auth/register`, userData);
      await fetchUsers();
      setShowUserModal(false);
      setStatus({
        message: 'Користувача успішно створено',
        type: 'success'
      });
    } catch (err) {
      console.error('Помилка при створенні користувача:', err);
      setError('Не вдалося створити користувача');
      setStatus({
        message: 'Помилка при створенні користувача',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLockUser = async (userId) => {
    try {
      setLoading(true);
      await putData(`${API_URL}/api/auth/users/${userId}/toggle-lock`);
      await fetchUsers();
      setStatus({
        message: 'Статус користувача успішно змінено',
        type: 'success'
      });
    } catch (err) {
      console.error('Помилка при зміні статусу користувача:', err);
      setError('Не вдалося змінити статус користувача');
      setStatus({
        message: 'Помилка при зміні статусу користувача',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Ви впевнені, що хочете видалити цього користувача?')) {
      try {
        setLoading(true);
        await deleteData(`${API_URL}/api/auth/users/${userId}`);
        await fetchUsers();
        setStatus({
          message: 'Користувача успішно видалено',
          type: 'success'
        });
      } catch (err) {
        console.error('Помилка при видаленні користувача:', err);
        setError('Не вдалося видалити користувача');
        setStatus({
          message: 'Помилка при видаленні користувача',
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleFacultyUpdate = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/users/${userId}/faculty`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ faculty: newFaculty })
      });

      if (!response.ok) {
        throw new Error('Ошибка при обновлении факультета');
      }

      const updatedUser = await response.json();
      setUsers(users.map(user => user._id === userId ? updatedUser : user));
      setEditingFaculty(null);
      setNewFaculty('');
    } catch (error) {
      console.error('Ошибка при обновлении факультета:', error);
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
      <div className="admin-header">
        <h1>Панель адміністратора</h1>
        <button className="logout-btn" onClick={handleLogout}>
          Вийти
        </button>
      </div>

      {status.message && (
        <div className={`status-message ${status.type}`}>
          {status.message}
        </div>
      )}

      <div className="admin-sections">
        <div className="admin-section">
          <div className="section-header" onClick={() => toggleSection('users')}>
            <h2>Керування користувачами</h2>
            <span className={`toggle-icon ${openSections.users ? 'open' : ''}`}>▼</span>
          </div>
          <div className={`section-content ${openSections.users ? 'open' : ''}`}>
            <button className="add-user-btn" onClick={() => setShowUserModal(true)}>
              Додати користувача
            </button>

            <div className="users-list">
              {loading ? (
                <div className="no-users">Завантаження...</div>
              ) : error ? (
                <div className="no-users">Помилка: {error}</div>
              ) : users.length === 0 ? (
                <div className="no-users">Немає користувачів</div>
              ) : (
                users.map((user) => (
                  <div key={user._id} className="user-item">
                    <h3>{user.username}</h3>
                    {editingFaculty === user._id ? (
                      <div className="faculty-edit">
                        <input
                          type="text"
                          value={newFaculty}
                          onChange={(e) => setNewFaculty(e.target.value)}
                          placeholder="Новый факультет"
                        />
                        <button onClick={() => handleFacultyUpdate(user._id)}>Сохранить</button>
                        <button onClick={() => {
                          setEditingFaculty(null);
                          setNewFaculty('');
                        }}>Отмена</button>
                      </div>
                    ) : (
                      <p className="user-faculty">Факультет: {user.faculty}</p>
                    )}
                    <p className="user-role">Роль: {user.role === 'admin' ? 'Администратор' : 'Пользователь'}</p>
                    <div className="user-actions">
                      <button
                        className={`user-lock-btn ${user.isLocked ? 'locked' : ''}`}
                        onClick={() => handleLockUser(user._id)}
                        disabled={user._id === currentUser._id}
                      >
                        {user.isLocked ? 'Розблокувати' : 'Заблокувати'}
                      </button>
                      <button
                        className="user-delete-btn"
                        onClick={() => handleDeleteUser(user._id)}
                        disabled={user._id === currentUser._id}
                      >
                        Видалити
                      </button>
                      <button
                        className="user-edit-btn"
                        onClick={() => {
                          setEditingFaculty(user._id);
                          setNewFaculty(user.faculty);
                        }}
                      >
                        Змінити факультет
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="admin-section">
          <div className="section-header" onClick={() => toggleSection('tests')}>
            <h2>Керування тестами</h2>
            <span className={`toggle-icon ${openSections.tests ? 'open' : ''}`}>▼</span>
          </div>
          <div className={`section-content ${openSections.tests ? 'open' : ''}`}>
            <div className="upload-section">
              {currentUser && (
                <>
                  <div className="filters-container">
                    <div className="faculty-filter">
                      <select 
                        className="faculty-select"
                        value={selectedFaculty}
                        onChange={(e) => setSelectedFaculty(e.target.value)}
                      >
                        <option value="all">Всі факультети</option>
                        {faculties.map(faculty => (
                          <option key={faculty} value={faculty}>
                            {faculty}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="subject-filter">
                      <select 
                        className="subject-select"
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        disabled={subjects.length === 0}
                      >
                        <option value="all">Всі предмети</option>
                        {subjects.map(subject => (
                          <option key={subject} value={subject}>
                            {subject}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
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
            </div>

            <div className="tests-list">
              <h2>Збережені тести:</h2>
              {isLoading ? (
                [...Array(3)].map((_, index) => <SkeletonTestItem key={index} />)
              ) : filteredTests.length > 0 ? (
                filteredTests.map((test) => (
                  <div key={test._id} className="test-item">
                    <h3>{test.subject}</h3>
                    <p className="test-theme">{test.theme}</p>
                    <p className="test-date">
                      Додано: {new Date(test.createdAt).toLocaleString()}
                    </p>
                    <p className="test-questions">
                      Кількість питань: {test.questionsCount}
                    </p>
                    {currentUser && (
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
          </div>
        </div>
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

      {showUserModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Додати нового користувача</h3>
            <form className="user-form" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              handleCreateUser({
                username: formData.get('username'),
                password: formData.get('password'),
                faculty: formData.get('faculty'),
                role: formData.get('role')
              });
            }}>
              <div className="form-group">
                <label htmlFor="username">Ім'я користувача</label>
                <input type="text" id="username" name="username" required />
              </div>
              <div className="form-group">
                <label htmlFor="password">Пароль</label>
                <input type="password" id="password" name="password" required />
              </div>
              <div className="form-group">
                <label htmlFor="faculty">Факультет</label>
                <input type="text" id="faculty" name="faculty" required />
              </div>
              <div className="form-group">
                <label htmlFor="role">Роль</label>
                <select id="role" name="role" required>
                  <option value="user">Користувач</option>
                  <option value="admin">Адміністратор</option>
                </select>
              </div>
              <div className="modal-buttons">
                <button type="button" className="modal-button cancel" onClick={() => setShowUserModal(false)}>
                  Скасувати
                </button>
                <button type="submit" className="modal-button confirm">
                  Створити
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel; 