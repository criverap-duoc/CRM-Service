// frontend\src\lib\api-client.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Serializa arrays como claves repetidas (?stage=a&stage=b).
  // Requerido por los MultipleChoiceFilter de django-filter, que NO aceptan CSV.
  paramsSerializer: {
    indexes: null,
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = 'Bearer ' + token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Un 401 en los endpoints de auth (login / refresh) NO debe recargar la
    // página: eso destruiría el mensaje de error del formulario de login.
    const requestUrl = String(error.config?.url || '');
    const isAuthEndpoint =
      requestUrl.includes('/auth/token') || requestUrl.includes('/auth/demo');
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const auth = {
  login: async (username: string, password: string) => {
    const response = await apiClient.post('/auth/token/', { username, password });
    const { access, refresh } = response.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    return response.data;
  },
  loginAsDemo: async () => {
    const response = await apiClient.post('/auth/demo/');
    const { access, refresh } = response.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
  },
  refreshToken: async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) throw new Error('No refresh token');
    const response = await apiClient.post('/auth/token/refresh/', { refresh });
    const { access } = response.data;
    localStorage.setItem('access_token', access);
    return access;
  },
};

export const contacts = {
  list: (params?: any) => apiClient.get('/contacts/', { params }),
  create: (data: any) => apiClient.post('/contacts/', data),
  get: (id: number) => apiClient.get('/contacts/' + id + '/'),
  update: (id: number, data: any) => apiClient.patch('/contacts/' + id + '/', data),
  delete: (id: number) => apiClient.delete('/contacts/' + id + '/'),
  changeStatus: (id: number, status: string) =>
    apiClient.patch('/contacts/' + id + '/status/', { status }),
  assign: (id: number, assignedToId: number) =>
    apiClient.patch('/contacts/' + id + '/assign/', { assigned_to_id: assignedToId }),
  mine: (params?: any) => apiClient.get('/contacts/mine/', { params }),
  assignTags: (id: number, tagIds: number[]) =>
    apiClient.patch(`/contacts/${id}/`, { tag_ids: tagIds }),
  assignInterests: (id: number, interestIds: number[]) =>
    apiClient.patch(`/contacts/${id}/`, { interest_ids: interestIds }),
};

export const interactions = {
  list: (params?: any) => apiClient.get('/interactions/', { params }),
  create: (data: any) => apiClient.post('/interactions/', data),
  get: (id: number) => apiClient.get('/interactions/' + id + '/'),
};

export const companies = {
  list: (params?: any) => apiClient.get('/companies/', { params }),
  get: (id: number) => apiClient.get(`/companies/${id}/`),
  create: (data: any) => apiClient.post('/companies/', data),
  update: (id: number, data: any) => apiClient.patch(`/companies/${id}/`, data),
  delete: (id: number) => apiClient.delete(`/companies/${id}/`),
  health: (id: number) => apiClient.get(`/companies/${id}/health/`),
};

export const tags = {
  list: (params?: any) => apiClient.get('/tags/', { params }),
  get: (id: number) => apiClient.get(`/tags/${id}/`),
  create: (data: any) => apiClient.post('/tags/', data),
  update: (id: number, data: any) => apiClient.patch(`/tags/${id}/`, data),
  delete: (id: number) => apiClient.delete(`/tags/${id}/`),
};

export const tasks = {
  list: (params?: any) => apiClient.get('/tasks/', { params }),
  get: (id: number) => apiClient.get(`/tasks/${id}/`),
  create: (data: any) => apiClient.post('/tasks/', data),
  update: (id: number, data: any) => apiClient.patch(`/tasks/${id}/`, data),
  delete: (id: number) => apiClient.delete(`/tasks/${id}/`),
  overdue: (params?: any) => apiClient.get('/tasks/overdue/', { params }),
  mySummary: () => apiClient.get('/tasks/my-summary/'),
};

export const products = {
  list: (params?: any) => apiClient.get('/products/', { params }),
  get: (id: number) => apiClient.get(`/products/${id}/`),
  create: (data: any) => apiClient.post('/products/', data),
  update: (id: number, data: any) => apiClient.patch(`/products/${id}/`, data),
  delete: (id: number) => apiClient.delete(`/products/${id}/`),
};

export const opportunities = {
  list: (params?: any) => apiClient.get('/opportunities/', { params }),
  get: (id: number) => apiClient.get(`/opportunities/${id}/`),
  create: (data: any) => apiClient.post('/opportunities/', data),
  update: (id: number, data: any) => apiClient.patch(`/opportunities/${id}/`, data),
  delete: (id: number) => apiClient.delete(`/opportunities/${id}/`),
  pipeline: () => apiClient.get('/opportunities/pipeline/'),
  forecast: () => apiClient.get('/opportunities/forecast/'),
  mySummary: () => apiClient.get('/opportunities/my-summary/'),
};