import axios from 'axios';

// Get the base URL for API calls
const getBaseUrl = () => {
  // In production (Vercel), use environment variable
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_URL || 'https://porichoy-store-pos.onrender.com/api';
  }
  
  // In development, handle local and network access
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = '5000';
    
    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//localhost:${port}/api`;
    }
    
    // Network IP (mobile testing)
    if (hostname.match(/^(192\.168\.|172\.|10\.)/)) {
      return `${protocol}//${hostname}:${port}/api`;
    }
  }
  
  // Fallback
  return 'http://localhost:5000/api';
};

const BASE_URL = getBaseUrl();
console.log('🌐 API Base URL:', BASE_URL);

// Helper function to get full image URL
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // In production, use the Render backend URL
  if (import.meta.env.PROD) {
    return `https://porichoy-store-pos.onrender.com${imagePath}`;
  }
  
  // In development, use localhost
  return `http://localhost:5000${imagePath}`;
};

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (import.meta.env.DEV) {
      console.log(`🚀 API Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    if (error.response) {
      console.error('❌ API Error:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
      });
      
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } else if (error.request) {
      console.error('❌ No response from server');
      error.message = 'Cannot connect to server. Please try again.';
    }
    
    return Promise.reject(error);
  }
);

export default api;