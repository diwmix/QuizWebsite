import { Navigate } from 'react-router-dom';

// Функція для виконання API-запитів з обробкою помилок
export const fetchWithAuth = async (url, options = {}) => {
  // Отримуємо токен з localStorage
  const token = localStorage.getItem('token');
  
  // Додаємо токен до заголовків, якщо він є
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };
  
  try {
    // Виконуємо запит з оновленими заголовками
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    // Якщо отримали помилку 401 або 403, перенаправляємо на сторінку логіну
    if (response.status === 401 || response.status === 403) {
      // Видаляємо токен і дані користувача
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Перенаправляємо на сторінку логіну
      window.location.href = '/login';
      return null;
    }
    
    // Повертаємо відповідь
    return response;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Функція для отримання даних з API
export const getData = async (url) => {
  const response = await fetchWithAuth(url);
  if (!response) return null;
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Функція для відправки даних на API
export const postData = async (url, data) => {
  const response = await fetchWithAuth(url, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  
  if (!response) return null;
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Функція для оновлення даних на API
export const putData = async (url, data) => {
  const response = await fetchWithAuth(url, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  
  if (!response) return null;
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Функція для видалення даних з API
export const deleteData = async (url) => {
  const response = await fetchWithAuth(url, {
    method: 'DELETE'
  });
  
  if (!response) return null;
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}; 