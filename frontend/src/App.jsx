import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './components/Login.jsx';
import Cadastro from './components/Cadastro.jsx';
import Inicio from './components/Inicio.jsx';
import Categorias from './components/Categorias.jsx';
import FontesDestinos from './components/FontesDestinos.jsx';
import LayoutAutenticado from './components/LayoutAutenticado.jsx';
import RotaProtegida from './components/RotaProtegida.jsx';

export default function App() {
  return <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/cadastro" element={<Cadastro />} />
    <Route element={<RotaProtegida><LayoutAutenticado /></RotaProtegida>}>
      <Route path="/" element={<Inicio />} />
      <Route path="/categorias" element={<Categorias />} />
      <Route path="/fontes-destinos" element={<FontesDestinos />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
