import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Inicio() {
  const { usuario } = useAuth();
  return <section className="panel-card">
    <span className="eyebrow">SUA CONTA</span>
    <h1>Olá, {usuario.nome}.</h1><p>Você está conectado como {usuario.email}.</p>
    <p>Organize suas categorias e contas e registre suas movimentações.</p>
    <div className="quick-links"><Link to="/lancamentos">Ver lançamentos</Link><Link to="/categorias">Gerenciar categorias</Link><Link to="/fontes-destinos">Contas e cartões</Link></div>
  </section>;
}
