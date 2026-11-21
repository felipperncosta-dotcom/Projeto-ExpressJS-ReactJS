import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Inicio() {
  const { usuario } = useAuth();
  return <section className="panel-card">
    <span className="eyebrow">SUA CONTA</span>
    <h1>Olá, {usuario.nome}.</h1><p>Você está conectado como {usuario.email}.</p>
    <p>Comece organizando as categorias de suas entradas e saídas.</p>
    <Link to="/categorias">Gerenciar categorias</Link>
  </section>;
}
