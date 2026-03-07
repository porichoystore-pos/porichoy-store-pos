import axios from 'axios';

// Get the current hostname (for mobile access)
const getBaseUrl = () => {
  // Check if we're running in a browser
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = '5000'; // Backend port
    
    console.log('📍 Current hostname:', hostname);
    
    // If accessing via localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//localhost:${port}/api`;
    }
    
    // If accessing via any network IP (192.168.x.x, 172.x.x.x, 10.x.x.x)
    if (hostname.match(/^(192\.168\.|172\.|10\.)/)) {
      return `${protocol}//${hostname}:${port}/api`;
    }
    
    // For any other IP, try to connect to same IP
    if (hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
      return `${protocol}//${hostname}:${port}/api`;
    }
  }
  
  // Default fallback
  return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
};

// Log the base URL for debugging
const BASE_URL = getBaseUrl();
console.log('🌐 API Base URL:', BASE_URL);
console.log('📱 You are accessing from:', window.location.href);

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log full URL for debugging
    console.log(`🚀 API Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
    
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error('❌ API Error Response:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
        baseURL: error.config?.baseURL
      });
      
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('❌ API No Response - Server might be down:', {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        message: error.message
      });
      
      // More helpful error message
      error.message = 'Cannot connect to server. Please check:\n' +
        `1. Backend server is running on port 5000\n` +
        `2. Your computer's IP is reachable from phone\n` +
        `3. Try accessing: http://172.21.70.157:5000/api/test from phone browser\n` +
        `4. Windows Firewall might be blocking the connection`;
    } else {
      // Something happened in setting up the request
      console.error('❌ API Request Setup Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;