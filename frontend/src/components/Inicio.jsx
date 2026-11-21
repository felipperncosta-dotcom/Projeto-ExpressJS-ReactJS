import { useAuth } from '../contexts/AuthContext.jsx';

export default function Inicio() {
  const { usuario, logout } = useAuth();
  return <main className="inicio">
    <header><span className="brand">clareza<span>.</span></span><button className="button" onClick={logout}>Sair</button></header>
    <section className="panel-card"><span className="eyebrow">SUA CONTA</span>
      <h1>Olá, {usuario.nome}.</h1><p>Você está conectado como {usuario.email}.</p>
      <p>Seus lançamentos e relatórios estarão disponíveis nas próximas etapas do projeto.</p>
    </section>
  </main>;
}
