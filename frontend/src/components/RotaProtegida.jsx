import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function RotaProtegida({ children }) {
  const { usuario, token, carregando, erroSessao, tentarNovamente, logout } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (carregando) return <main className="center-screen" role="status">Verificando sua sessão…</main>;
  if (erroSessao) return <main className="center-screen"><div className="auth-card">
    <p className="alert" role="alert">{erroSessao}</p>
    <button className="button button-primary" onClick={tentarNovamente}>Tentar novamente</button>{' '}
    <button className="button" onClick={logout}>Sair</button>
  </div></main>;
  if (!usuario) return <Navigate to="/login" replace />;
  return children;
}
