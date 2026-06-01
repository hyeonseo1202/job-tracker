import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "" });

export const jobsApi = {
  list: () => api.get("/api/jobs/"),
  calendar: () => api.get("/api/jobs/calendar"),
  get: (id) => api.get(`/api/jobs/${id}`),
  create: (data) => api.post("/api/jobs/", data),
  update: (id, data) => api.put(`/api/jobs/${id}`, data),
  delete: (id) => api.delete(`/api/jobs/${id}`),
  rescrape: (id) => api.post(`/api/jobs/${id}/rescrape`),
};

export const companiesApi = {
  list: () => api.get("/api/companies/"),
  get: (id) => api.get(`/api/companies/${id}`),
  create: (data) => api.post("/api/companies/", data),
  update: (id, data) => api.put(`/api/companies/${id}`, data),
  news: (id) => api.get(`/api/companies/${id}/news`),
  jobs: (id) => api.get(`/api/companies/${id}/jobs`),
  coverLetters: (id) => api.get(`/api/companies/${id}/cover-letters`),
};

export const userApi = {
  getProfile: () => api.get("/api/user/profile"),
  saveProfile: (data) => api.post("/api/user/profile", data),
};

export const crawlApi = {
  jasoseol: () => api.post("/api/crawl/jasoseol"),
  inthiswork: () => api.post("/api/crawl/inthiswork"),
  all: () => api.post("/api/crawl/all"),
  status: () => api.get("/api/crawl/status"),
};

export const preferencesApi = {
  get: () => api.get("/api/preferences/"),
  save: (data) => api.post("/api/preferences/", data),
  updateJobStatus: (id, data) => api.put(`/api/preferences/jobs/${id}/status`, data),
  getCareerSites: () => api.get("/api/preferences/career-sites"),
  addCareerSite: (name, url, selector) =>
    api.post("/api/preferences/career-sites", null, { params: { name, url, selector } }),
};

export const aiApi = {
  generateCoverLetter: (data) => api.post("/api/ai/generate-cover-letter", data),
  analyzeCompany: (data) => api.post("/api/ai/analyze-company", data),
  updateCoverLetter: (id, answer) => api.put(`/api/ai/cover-letters/${id}`, null, { params: { answer } }),
  recommendJobs: (companyId) => api.get(`/api/ai/recommend-jobs/${companyId}`),
};
