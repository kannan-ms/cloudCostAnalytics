import axios from 'axios';

// Get API URL from enviroment or default to local
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`; // Use Bearer scheme and string
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
// Updated to simpler endpoints
api.getSummary = () => api.get('/summary'); // Assuming backend provides /api/summary for dashboard overview
api.getTrends = () => api.get('/costs/trends'); // General trends endpoint

api.getAnomalies = () => api.get('/anomalies');
api.getCostSummary = () => api.get('/costs/summary');

api.getForecasts = (days = 30, detailed = false, options = {}) => {
  const params = { days, detailed, ...options };
  return api.get('/forecasts', { params });
};

// Budget Endpoints
api.getBudgets = () => api.get('/budgets');
api.createBudget = (data) => api.post('/budgets', data);
api.getBudgetDetails = (id) => api.get(`/budgets/${id}`);
api.deleteBudget = (id) => api.delete(`/budgets/${id}`);

export default api;
