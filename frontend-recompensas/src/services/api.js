import axios from 'axios';

// Ahora React buscará la URL secreta. Si no la encuentra, usará la de desarrollo.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000', 
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token_profesora');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;