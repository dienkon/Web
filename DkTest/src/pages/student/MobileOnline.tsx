import { Navigate } from 'react-router-dom';
import { useOnline } from '../../hooks/useOnline';
import Home from '../home/Home';

export default function MobileOnline() {
  return useOnline() ? <Home mobileOnline /> : <Navigate to="/student/offline" replace />;
}
