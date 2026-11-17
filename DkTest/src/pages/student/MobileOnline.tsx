import { Navigate } from 'react-router-dom';
import { useOnline } from '../../hooks/useOnline';
import { isNativeAndroid } from '../../services/offline/sync';
import Home from '../home/Home';

export default function MobileOnline() {
  const online = useOnline();
  if (!isNativeAndroid()) return <Navigate to="/" replace />;
  return online ? <Home mobileOnline /> : <Navigate to="/student/offline" replace />;
}
