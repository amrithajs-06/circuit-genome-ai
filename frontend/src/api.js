import axios from "axios";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authApi = {
  register: (data) => api.post("/auth/register", data).then((r) => r.data),
  login: (data) => api.post("/auth/login", data).then((r) => r.data),
  forgotPassword: (data) => api.post("/auth/forgot-password", data).then((r) => r.data),
};

export const projectApi = {
  list: () => api.get("/projects").then((r) => r.data),
  get: (id) => api.get(`/projects/${id}`).then((r) => r.data),
  create: (data) => api.post("/projects", data).then((r) => r.data),
  remove: (id) => api.delete(`/projects/${id}`),
  library: () => api.get("/projects/library").then((r) => r.data),
  pdfUrl: (id) => `/api/projects/${id}/pdf`,
};

export default api;
