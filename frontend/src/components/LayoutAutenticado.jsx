import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function LayoutAutenticado() {
  const { logout } = useAuth();
  return <main className="app-shell">
    <header className="app-header">
      <NavLink to="/" className="brand">clareza<span>.</span></NavLink>
      <nav aria-label="Navegação principal">
        <NavLink to="/" end>Início</NavLink>
        <NavLink to="/categorias">Categorias</NavLink>
        <NavLink to="/fontes-destinos">Contas e cartões</NavLink>
      </nav>
      <button className="button" onClick={logout}>Sair</button>
    </header>
    <Outlet />
  </main>;
}
