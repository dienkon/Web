import { Navigate } from 'react-router-dom';
import { useOnline } from '../../hooks/useOnline';
export default function MobileLanding() {
  return <Navigate to={useOnline() ? '/student/online' : '/student/offline'} replace />;
}
