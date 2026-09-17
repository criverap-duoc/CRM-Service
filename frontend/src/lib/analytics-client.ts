import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const V3_BASE_URL = API_URL.replace('/v1', '/v3');

// Crear un cliente separado para V3
const v3Client = axios.create({
  baseURL: V3_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token
v3Client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores
v3Client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const analytics = {
  getLeadScore: (contactId: number) => 
    v3Client.get(`/lead-score/${contactId}/`),
  
  analyzeSentiment: (interactionId: number) => 
    v3Client.post(`/sentiment/${interactionId}/`),
  
  getSentimentStats: (contactId?: number) => {
    const params = contactId ? { contact_id: contactId } : {};
    return v3Client.get('/sentiment/stats/', { params });
  },
};