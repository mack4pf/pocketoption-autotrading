import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faEnvelope, faSpinner, faChartLine } from '@fortawesome/free-solid-svg-icons';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Failed to login');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary via-secondary to-primary p-4">
            <div className="card w-full max-w-md p-8 animate-slide-up border-t-4 border-accent">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/20 text-accent mb-4">
                        <FontAwesomeIcon icon={faChartLine} size="2x" />
                    </div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Welcome Back
                    </h1>
                    <p className="text-gray-400 mt-2">Sign in to your trading dashboard</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-6 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input-field"
                            placeholder="name@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input-field"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full btn-primary flex justify-center items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <FontAwesomeIcon icon={faSpinner} spin /> Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-500 space-y-2">
                    <div>Don't have an account? <Link to="/register" className="text-accent hover:underline">Sign Up</Link></div>
                    <div><Link to="/admin" className="hover:text-accent transition-colors">Admin Login</Link></div>
                </div>
            </div>
        </div>
    );
};

export default Login;
