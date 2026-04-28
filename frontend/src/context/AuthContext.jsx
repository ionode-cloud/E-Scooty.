import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(true);

    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
        setIsAuthenticated(false);
    }, []);

    const verifySession = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            logout();
            setIsLoading(false);
            return;
        }

        try {
            // Using the robust /api/auth/verify endpoint for session stability
            const res = await axios.get(`${apiUrl}/api/auth/verify`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // If success, sync state and global headers
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setUser(res.data);
            setIsAuthenticated(true);
            localStorage.setItem('user', JSON.stringify(res.data));
        } catch (error) {
            console.log("Verify failed:", error.response?.data || error.message);

            // ⚠️ ONLY logout if truly invalid (401). 
            // Network errors or 500s should NOT trigger a logout.
            if (error.response?.status === 401) {
                logout();
            } else {
                console.warn("Temporary error – maintaining local session.");
                const cachedUser = localStorage.getItem('user');
                if (cachedUser) setUser(JSON.parse(cachedUser));
                setIsAuthenticated(true);
            }
        } finally {
            setIsLoading(false);
        }
    }, [apiUrl, logout]);

    useEffect(() => {
        verifySession();
    }, [verifySession]);

    // Axios Interceptor for 401s on any other request
    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response && error.response.status === 401) {
                    logout();
                }
                return Promise.reject(error);
            }
        );
        return () => axios.interceptors.response.eject(interceptor);
    }, [logout]);

    const login = useCallback((token, userData) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(userData);
        setIsAuthenticated(true);
    }, []);

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, verifySession }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
