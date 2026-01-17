import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRocket, faShieldAlt, faCheckCircle } from '@fortawesome/free-solid-svg-icons';

const Landing = () => {
    return (
        <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-6 text-center">
            {/* Hero Section */}
            <div className="max-w-4xl w-full mb-12">
                <div className="inline-block bg-accent/20 px-4 py-1 rounded-full mb-4">
                    <span className="text-accent text-xs font-black tracking-widest uppercase italic">
                        <FontAwesomeIcon icon={faRocket} className="mr-2" />
                        Next-Gen Trading Bridge
                    </span>
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter uppercase italic">
                    NIELS <span className="text-accent underline decoration-4 underline-offset-8">AUTOTRADE</span>
                </h1>
                <p className="text-gray-400 text-lg md:text-xl font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
                    The most advanced web-based automation for Pocket Option. Connect your account and start trading with precision.
                </p>

                {/* Main Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
                    <Link to="/register" className="bg-accent text-primary text-xl font-black px-12 py-6 rounded-2xl uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-accent/20">
                        Get Started
                    </Link>
                    <Link to="/login" className="bg-white/10 text-white text-xl font-black px-12 py-6 rounded-2xl uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10">
                        Login
                    </Link>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                    <div className="bg-secondary p-8 rounded-3xl border border-gray-800">
                        <div className="text-accent mb-4">
                            <FontAwesomeIcon icon={faRocket} size="2x" />
                        </div>
                        <h3 className="text-white font-black uppercase mb-2">Automated Trading</h3>
                        <p className="text-gray-500 text-sm">Real-time signal execution with zero latency. Powered by Playwright automation.</p>
                    </div>
                    <div className="bg-secondary p-8 rounded-3xl border border-gray-800">
                        <div className="text-green-500 mb-4">
                            <FontAwesomeIcon icon={faShieldAlt} size="2x" />
                        </div>
                        <h3 className="text-white font-black uppercase mb-2">Secure Connection</h3>
                        <p className="text-gray-500 text-sm">Your credentials are encrypted and stored securely. We never share your data.</p>
                    </div>
                    <div className="bg-secondary p-8 rounded-3xl border border-gray-800">
                        <div className="text-blue-500 mb-4">
                            <FontAwesomeIcon icon={faCheckCircle} size="2x" />
                        </div>
                        <h3 className="text-white font-black uppercase mb-2">Web-Based</h3>
                        <p className="text-gray-500 text-sm">No APKs or extensions needed. Connect directly from your dashboard and start trading.</p>
                    </div>
                </div>
            </div>

            {/* Footer Links */}
            <div className="flex gap-8 text-gray-500 text-xs font-bold uppercase tracking-widest mt-8">
                <span>&copy; 2026 NielsAutoTrade</span>
                <Link to="/login" className="hover:text-accent transition-colors">Dashboard</Link>
                <Link to="/register" className="hover:text-accent transition-colors">Join Now</Link>
            </div>
        </div>
    );
};

export default Landing;
