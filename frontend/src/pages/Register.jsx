import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faEnvelope, faLock, faKey, faUser, faSpinner } from '@fortawesome/free-solid-svg-icons';
import api from '../api/axios';
import { useModal } from '../context/ModalContext';

const Register = () => {
    const { showModal } = useModal();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        accessCode: ''
    });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const response = await api.post('/auth/register', formData);

            if (response.data.success) {
                // Save token and user
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));

                showModal({
                    title: 'Account Created',
                    message: `Welcome, ${formData.fullName}! Your account has been set up successfully.`,
                    type: 'success'
                });

                // Redirect to dashboard
                navigate('/dashboard');
            }
        } catch (err) {
            const errMsg = err.response?.data?.error || 'Registration failed. Please check your access code.';
            setError(errMsg);
            showModal({
                title: 'Registration Failed',
                message: errMsg,
                type: 'error'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary via-secondary to-primary p-4">
            <div className="card w-full max-w-md p-8 animate-slide-up border-t-4 border-success">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/20 text-success mb-4">
                        <FontAwesomeIcon icon={faUserPlus} size="2x" />
                    </div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Create Account
                    </h1>
                    <p className="text-gray-400 mt-2">Join the trading platform</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-6 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            <FontAwesomeIcon icon={faUser} className="mr-2" />
                            Full Name
                        </label>
                        <input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="John Doe"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
                            Email Address
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="name@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            <FontAwesomeIcon icon={faLock} className="mr-2" />
                            Password
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="••••••••"
                            required
                            minLength="6"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            <FontAwesomeIcon icon={faKey} className="mr-2" />
                            Access Code
                        </label>
                        <input
                            type="text"
                            name="accessCode"
                            value={formData.accessCode}
                            onChange={handleChange}
                            className="input-field uppercase"
                            placeholder="XXXX-XXXX-XXXX"
                            required
                            style={{ textTransform: 'uppercase' }}
                        />
                        <p className="text-xs text-gray-500 mt-1">Enter the access code provided by admin</p>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full btn-primary flex justify-center items-center gap-2 mt-6"
                    >
                        {isSubmitting ? (
                            <>
                                <FontAwesomeIcon icon={faSpinner} spin /> Creating Account...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faUserPlus} /> Sign Up
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-500">
                    Already have an account? <Link to="/" className="text-accent hover:underline">Sign In</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
