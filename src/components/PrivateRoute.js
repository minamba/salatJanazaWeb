import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

export function PrivateRoute({ children }) {
  const { isAuthenticated } = useSelector((s) => s.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/connexion" state={{ from: location }} replace />;
  }
  return children;
}

export function AdminRoute({ children }) {
  const { isAuthenticated, user } = useSelector((s) => s.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/connexion" state={{ from: location }} replace />;
  }
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
}
