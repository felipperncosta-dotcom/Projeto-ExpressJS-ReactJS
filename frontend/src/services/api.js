import axios from 'axios';
import { TOKEN_KEY, EVENTO_SESSAO_EXPIRADA } from './sessao.js';

const api = axios.create({
  baseURL: import.meta.env?.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 12000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  resposta => resposta,
  erro => {
    const config = erro.config;
    const tokenAtual = localStorage.getItem(TOKEN_KEY);
    // Uma resposta atrasada da sessão anterior não deve apagar um novo login.
    if (erro.response?.status === 401 && tokenAtual
      && config?.headers?.Authorization === `Bearer ${tokenAtual}`
      && !config.url?.includes('/auth/login')) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
    }
    return Promise.reject(erro);
  },
);

export default api;
