import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './components/Login.jsx';
import Cadastro from './components/Cadastro.jsx';
import Inicio from './components/Inicio.jsx';
import RotaProtegida from './components/RotaProtegida.jsx';

export default function App() {
  return <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/cadastro" element={<Cadastro />} />
    <Route path="/" element={<RotaProtegida><Inicio /></RotaProtegida>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
