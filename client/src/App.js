import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import TestList from './components/TestList';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import './App.css';

// Контекст для аутентифікації
export const AuthContext = React.createContext();

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Перевірка чи користувач вже залогінений
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setIsLoggedIn(true);
      setUser(JSON.parse(userData));
    }
    
    setIsLoading(false);
  }, []);

  const handleLogin = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setIsLoggedIn(true);
      setUser(JSON.parse(userData));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
  };

  // Компонент для захищених маршрутів
  const ProtectedRoute = ({ children, requireAdmin }) => {
    if (isLoading) {
      return <div>Завантаження...</div>;
    }

    if (!isLoggedIn) {
      return <Navigate to="/login" />;
    }

    if (requireAdmin && user.role !== 'admin') {
      return <Navigate to="/" />;
    }

    return children;
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, handleLogin, handleLogout }}>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={
              isLoggedIn ? <Navigate to="/" /> : <Login onLogin={handleLogin} />
            } />
            
            <Route path="/" element={
              <ProtectedRoute>
                <TestList />
              </ProtectedRoute>
            } />
            
            <Route path="/admin" element={
              <ProtectedRoute requireAdmin>
                <AdminPanel />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;
