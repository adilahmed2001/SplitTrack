import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api', // Update with your backend URL
});

// Add a request interceptor to include the Authorization header with the JWT token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); // Retrieve token from localStorage
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Authentication APIs
export const login = (data) => API.post('/auth/login', data);
export const signup = (data) => API.post('/auth/signup', data);

// Group APIs
export const createGroup = (data) => API.post('/groups/create', data);
export const getUserGroups = () => API.get('/groups/user_groups');
export const getGroupDetails = (groupId) => API.get(`/groups/${groupId}`);
export const addMember = (groupId, data) => API.post(`/groups/${groupId}/add_member`, data);

// Expense APIs
export const createExpense = (data) => API.post('/expenses/', data);
export const getExpensesOwedTo = () => API.get('/expenses/owed_to');
export const getExpensesOwedBy = () => API.get('/expenses/owed_by');
export const settleExpense = (data) => API.post('/expenses/settle', data);
export const getGroupTransactions = (groupId) => API.get(`/expenses/${groupId}/details`);
export const getBalance = () => API.get('/expenses/balance');
