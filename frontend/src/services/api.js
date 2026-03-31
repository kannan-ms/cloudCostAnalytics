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
api.getAnomalies = () => api.get('/anomalies');
api.getCostSummary = () => api.get('/costs/summary');
api.getDashboardInsights = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.service) params.append('service', filters.service);
  if (filters.provider) params.append('provider', filters.provider);
  if (filters.region) params.append('region', filters.region);
  if (filters.account) params.append('account', filters.account);
  
  const queryString = params.toString();
  return api.get(`/costs/dashboard-insights${queryString ? '?' + queryString : ''}`);
};

// Category-level daily trends for a single month
api.getCategoryDailyTrends = (month) => api.get('/costs/trends/category-daily', { params: { month } });

//getForecasts for 30 days
api.getForecasts = (days = 30, detailed = false, options = {}) => {
  const params = { days, detailed, ...options };
  return api.get('/forecasts', { params });
};

// Budget Endpoints
api.getBudgets = () => api.get('/budgets');
api.createBudget = (data) => api.post('/budgets', data);
api.getBudgetDetails = (id) => api.get(`/budgets/${id}`);
api.deleteBudget = (id) => api.delete(`/budgets/${id}`);

// Ingestion / CSP Integration Endpoints
api.ingestFromApi = (provider, credentials, startDate, endDate) =>
  api.post('/ingestion/api', { provider, credentials, start_date: startDate, end_date: endDate });

api.ingestFromFile = (provider, file) => {
  const form = new FormData();
  form.append('provider', provider);
  form.append('file', file);
  return api.post('/ingestion/file', form);
};

api.ingestAndDetect = (provider, file) => {
  const form = new FormData();
  form.append('source_type', 'file');
  form.append('provider', provider);
  form.append('file', file);
  return api.post('/ingestion/detect', form);
};

api.getCategories = () => api.get('/ingestion/categories');

export default api;
