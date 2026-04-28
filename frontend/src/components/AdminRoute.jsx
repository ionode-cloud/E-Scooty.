import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute = ({ children }) => {
    const { user, isLoading } = useAuth();
    
    if (isLoading) return null; // Wait for auth to settle

    // If user is not an admin, redirect them safely back to their dashboard
    if (!user || user.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default AdminRoute;
