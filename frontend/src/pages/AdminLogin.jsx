import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldHalved, faSpinner } from '@fortawesome/free-solid-svg-icons';

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { adminLogin } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            await adminLogin(email, password);
            navigate('/admin/dashboard');
        } catch (err) {
            setError(err.message || 'Failed to login as admin');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-primary px-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-secondary via-primary to-primary">
            <div className="card w-full max-w-md p-8 animate-slide-up border border-gray-700 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 text-red-500 mb-4">
                        <FontAwesomeIcon icon={faShieldHalved} size="2x" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">
                        Admin Access
                    </h1>
                    <p className="text-gray-400 mt-2 text-sm">Restricted area. Authorized personnel only.</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-6 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input-field bg-primary border-gray-700 focus:border-red-500"
                            placeholder="admin@niels.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input-field bg-primary border-gray-700 focus:border-red-500"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded transition-all duration-300 transform hover:-translate-y-1 shadow-lg shadow-red-900/20 flex justify-center items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <FontAwesomeIcon icon={faSpinner} spin /> Verifying...
                            </>
                        ) : (
                            'Enter Panel'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
