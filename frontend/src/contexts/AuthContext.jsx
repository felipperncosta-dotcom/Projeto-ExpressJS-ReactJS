import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import { TOKEN_KEY, EVENTO_SESSAO_EXPIRADA, expiracaoToken } from '../services/sessao.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));
  const [erroSessao, setErroSessao] = useState('');
  const [tentativa, setTentativa] = useState(0);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUsuario(null);
    setCarregando(false);
    setErroSessao('');
    navigate('/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, logout);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, logout);
  }, [logout]);

  useEffect(() => {
    if (!token) return undefined;
    const restante = expiracaoToken(token) - Date.now();
    if (restante <= 0) { logout(); return undefined; }
    // Os tokens da API duram uma hora; o teto evita overflow de setTimeout.
    const timer = window.setTimeout(logout, Math.min(restante, 2147483647));
    return () => window.clearTimeout(timer);
  }, [token, logout]);

  useEffect(() => {
    if (!token || expiracaoToken(token) <= Date.now()) return undefined;
    let ativo = true;
    setCarregando(true);
    setErroSessao('');
    api.get('/auth/me').then(({ data }) => {
      if (ativo) setUsuario(data.usuario);
    }).catch(falha => {
      if (!ativo) return;
      if (falha.response?.status === 404) logout();
      else if (falha.response?.status !== 401) {
        setErroSessao('Não foi possível verificar sua sessão. Confira a conexão e tente novamente.');
      }
    }).finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [token, tentativa, logout]);

  const login = useCallback(async (email, senha) => {
    const { data } = await api.post('/auth/login', { email, senha });
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUsuario(data.usuario);
    setErroSessao('');
    navigate('/', { replace: true });
  }, [navigate]);

  const cadastrar = useCallback(dados => api.post('/auth/cadastro', dados), []);
  const tentarNovamente = useCallback(() => setTentativa(atual => atual + 1), []);
  const valor = useMemo(() => ({
    usuario, token, carregando, erroSessao, login, logout, cadastrar, tentarNovamente,
  }), [usuario, token, carregando, erroSessao, login, logout, cadastrar, tentarNovamente]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return contexto;
}
