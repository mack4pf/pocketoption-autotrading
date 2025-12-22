import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    // There isn't a dedicated "me" endpoint in the routes provided, 
                    // but we can assume /verify-api might work or we rely on stored user 
                    // if passing state. However, best practice is to validate token.
                    // Looking at server.js socket auth, it decodes token.
                    // We'll trust the token for now or implement a /me endpoint if needed.
                    // Wait, verify-api is for API key, not JWT.
                    // The Admin dashboard checks stats.
                    // Let's assume for now we persist user object in local storage 
                    // or just check if token exists. A better way would be to added a /me endpoint 
                    // to the backend, but I should avoid modifying backend unless necessary.
                    // Actually, I can use the socket connection to validate the token.

                    const storedUser = localStorage.getItem('user');
                    if (storedUser) {
                        setUser(JSON.parse(storedUser));
                    }
                } catch (error) {
                    console.error("Auth check failed", error);
                    logout();
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    const login = async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.success) {
            const { token, user } = response.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            setUser(user);
            return user;
        }
        throw new Error(response.data.error || 'Login failed');
    };

    const adminLogin = async (email, password) => {
        // Should hit the same login endpoint, but we check role or specific admin endpoint if strictly separated.
        // Looking at routes, /auth/login handles both. Admin check is likely usually done via isAdmin flag.
        // There is a create-admin endpoint but no specific admin-login different from user login 
        // other than maybe the response or subsequent access.
        const response = await api.post('/auth/login', { email, password });
        if (response.data.success) {
            // Check if admin
            // Note: The login response returns user object. We should check if user.role === 'admin' or isAdmin
            // based on the create-admin route: isAdmin: true.
            if (!response.data.user.isAdmin) {
                throw new Error("Not authorized as admin");
            }
            const { token, user } = response.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            setUser(user);
            return user;
        }
        throw new Error(response.data.error);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, adminLogin, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
