import axios from 'axios';

const getBaseUrl = () => {
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_URL || 'https://porichoy-store-pos.onrender.com/api';
  }
  
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = '5000';
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//localhost:${port}/api`;
    }
    
    if (hostname.match(/^(192\.168\.|172\.|10\.)/)) {
      return `${protocol}//${hostname}:${port}/api`;
    }
  }
  
  return 'http://localhost:5000/api';
};

const BASE_URL = getBaseUrl();
console.log('🌐 API Base URL:', BASE_URL);

export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // Get base URL without /api
  const baseUrl = BASE_URL.replace('/api', '');
  
  // Ensure imagePath starts with /
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  const fullUrl = `${baseUrl}${cleanPath}`;
  
  console.log('🖼️ Generated image URL:', fullUrl);
  return fullUrl;
};

export const checkImageExists = async (imagePath) => {
  try {
    const filename = imagePath.split('/').pop();
    const response = await axios.get(`${BASE_URL}/image-check/${filename}`);
    return response.data.exists;
  } catch (error) {
    console.error('Error checking image:', error);
    return false;
  }
};

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

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