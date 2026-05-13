import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * OperatorRoute — allows access for both 'admin' and 'operator' roles.
 * Regular 'user' role is redirected to the home dashboard.
 */
const OperatorRoute = ({ children }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) return null;

    if (!user || (user.role !== 'admin' && user.role !== 'operator')) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default OperatorRoute;
