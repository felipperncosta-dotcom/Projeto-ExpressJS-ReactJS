import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './components/Login.jsx';
import Cadastro from './components/Cadastro.jsx';
import Painel from './components/Painel.jsx';
import Categorias from './components/Categorias.jsx';
import Lancamentos from './components/Lancamentos.jsx';
import FontesDestinos from './components/FontesDestinos.jsx';
import LayoutAutenticado from './components/LayoutAutenticado.jsx';
import RotaProtegida from './components/RotaProtegida.jsx';
import Relatorios from './components/Relatorios.jsx';
import Faturas from './components/Faturas.jsx';
import SaudeFinanceira from './components/SaudeFinanceira.jsx';

export default function App() {
  return <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/cadastro" element={<Cadastro />} />
    <Route element={<RotaProtegida><LayoutAutenticado /></RotaProtegida>}>
      <Route path="/" element={<Painel />} />
      <Route path="/categorias" element={<Categorias />} />
      <Route path="/lancamentos" element={<Lancamentos />} />
      <Route path="/fontes-destinos" element={<FontesDestinos />} />
      <Route path="/relatorios" element={<Relatorios />} />
      <Route path="/faturas" element={<Faturas />} />
      <Route path="/saude-financeira" element={<SaudeFinanceira />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
