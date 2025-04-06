import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Login.css';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Перевірка чи користувач вже залогінений
    const token = localStorage.getItem('token');
    if (token) {
      onLogin();
      navigate('/');
    }
  }, [onLogin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrorDetails('');
    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Помилка при вході');
        setErrorDetails(data.details || '');
        throw new Error(data.message || 'Помилка при вході');
      }

      // Зберігаємо токен та інформацію про користувача
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Викликаємо функцію onLogin для оновлення стану аутентифікації
      onLogin();
      
      // Перенаправляємо на головну сторінку
      navigate('/');
    } catch (error) {
      // Помилка вже встановлена вище
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h2>Вхід до системи</h2>
        
        {error && (
          <div className="error-message">
            <div className="error-title">{error}</div>
            {errorDetails && <div className="error-details">{errorDetails}</div>}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Ім'я користувача</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
              placeholder="Введіть ім'я користувача"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Пароль</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              placeholder="Введіть пароль"
            />
          </div>
          
          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? 'Вхід...' : 'Увійти'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login; 