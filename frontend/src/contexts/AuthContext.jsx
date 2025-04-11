import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { CircularProgress, Box, Typography } from '@mui/material';

// Color scheme
const colors = {
  primary: '#4e54c8',
  secondary: '#8f94fb',
  accent: '#4776E6',
  background: '#f8f9fa',
  text: '#343a40',
  success: '#28a745',
  error: '#dc3545'
};

// Create context
const AuthContext = createContext();

// Custom hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Show notification
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Initialize auth state
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (!token) {
          setLoading(false);
          return;
        }

        // Set up axios headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Fetch user profile
        const response = await axios.get('http://localhost:5000/api/auth/profile');
        setUser(response.data);
        showNotification('Successfully logged in', 'success');
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Only clear auth state if it's an auth error
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          delete axios.defaults.headers.common['Authorization'];
          showNotification('Session expired. Please log in again.', 'error');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [token]);

  const login = async (email, password) => {
    try {
      setAuthLoading(true);
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password,
      });

      const { token: newToken, user: userData } = response.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      showNotification('Login successful!', 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      showNotification(errorMessage, 'error');
      throw new Error(errorMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setAuthLoading(true);
      const response = await axios.post('http://localhost:5000/api/auth/register', userData);
      const { token: newToken, user: newUser } = response.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(newUser);
      showNotification('Registration successful!', 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      showNotification(errorMessage, 'error');
      throw new Error(errorMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    showNotification('Logged out successfully', 'info');
  };

  const value = {
    user,
    token,
    loading,
    authLoading,
    login,
    register,
    logout,
    isAuthenticated: !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Loading overlay */}
      {loading && (
        <Box
          component={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.9)',
            zIndex: 9999
          }}
        >
          <CircularProgress 
            size={60} 
            thickness={4} 
            sx={{ color: colors.primary }} 
          />
          <Typography variant="h6" sx={{ mt: 3, color: colors.text }}>
            Loading your session...
          </Typography>
        </Box>
      )}

      {/* Notification */}
      {notification && (
        <Box
          component={motion.div}
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          style={{
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 24px',
            borderRadius: '8px',
            backgroundColor: notification.type === 'error' ? colors.error : 
                          notification.type === 'success' ? colors.success : colors.primary,
            color: 'white',
            zIndex: 9998,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Typography variant="body1">
            {notification.message}
          </Typography>
        </Box>
      )}

      {/* Main content */}
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;