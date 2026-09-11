import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('findback_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('findback_token');
      localStorage.removeItem('findback_user');
    }
    return Promise.reject(err);
  }
);

export const authService = {
  login: async (creds) => (await api.post('/auth/login', creds)).data,
  register: async (data) => (await api.post('/auth/register', data)).data,
  getMe: async () => (await api.get('/auth/me')).data,
};

export const reportService = {
  getCategories: async () => (await api.get('/reports/categories')).data,
  getLostReports: async (mine = false) => (await api.get(`/reports/lost?mine=${mine}`)).data,
  createLostReport: async (data) => (await api.post('/reports/lost', data)).data,
  getFoundReports: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return (await api.get(`/reports/found${query ? `?${query}` : ''}`)).data;
  },
  createFoundReport: async (data) => (await api.post('/reports/found', data)).data,
  approveFoundReport: async (id) => (await api.patch(`/reports/found/${id}/approve`)).data,
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return (await api.post('/reports/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })).data;
  },
};

export const matchService = {
  getMatches: async () => (await api.get('/matches')).data,
  getMatchDetail: async (id) => (await api.get(`/matches/${id}`)).data,
  findMatches: async (lostReportId) => (await api.post(`/matches/find-matches/${lostReportId}`)).data,
  submitClaim: async (matchId, claimData = {}) => (await api.post(`/matches/${matchId}/claim`, claimData)).data,
  getClaims: async () => (await api.get('/matches/claims/all')).data,
  updateClaimStatus: async (claimId, statusData) =>
    (await api.patch(`/matches/claims/${claimId}`, typeof statusData === 'string' ? { status: statusData } : statusData)).data,
};

export const notificationService = {
  getNotifications: async () => (await api.get('/notifications')).data,
  markRead: async (id) => (await api.patch(`/notifications/${id}/read`)).data,
  markAllRead: async () => (await api.patch('/notifications/read-all')).data,
};

export default api;
