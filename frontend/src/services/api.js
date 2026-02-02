import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);


// Cost endpoints
api.getDailyTrends = (startDate, endDate) => {
  const params = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  return api.get('/costs/trends/daily', { params });
};

api.getAutoTrends = () => {
  return api.get('/costs/trends/auto');
};

api.getAnomalies = () => api.get('/anomalies'); // Assuming this exists based on context
api.getCostSummary = () => api.get('/costs/summary');

export default api;
