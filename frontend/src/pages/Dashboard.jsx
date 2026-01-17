import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPowerOff,
    faCircleCheck,
    faCircleXmark,
    faWallet,
    faChartSimple,
    faSignal,
    faRobot,
    faGlobe,
    faCheckCircle,
    faGear,
    faToggleOn,
    faToggleOff,
    faTriangleExclamation,
    faRefresh,
    faPaperPlane,
    faRocket,
    faPlus,
    faXmark
} from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useModal } from '../context/ModalContext';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const { showModal } = useModal();
    const [socket, setSocket] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState(false);
    const [trades, setTrades] = useState([]);
    const [activeTradesCount, setActiveTradesCount] = useState(0);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isAutoTrading, setIsAutoTrading] = useState(user?.tradingSettings?.isAutoTrading || false);
    const [defaultAmount, setDefaultAmount] = useState(user?.tradingSettings?.defaultAmount || 1);
    const [martingaleEnabled, setMartingaleEnabled] = useState(user?.tradingSettings?.martingaleEnabled !== false);
    const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

    // Login Modal State
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [loginForm, setLoginForm] = useState({ email: '', password: '', accountType: 'DEMO' });
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    useEffect(() => {
        // Fetch current user settings to ensure sync
        const fetchUserData = async () => {
            try {
                const response = await api.get('/users/profile');
                if (response.data.success) {
                    const settings = response.data.user.tradingSettings;
                    setIsAutoTrading(settings.isAutoTrading);
                    setDefaultAmount(settings.defaultAmount);
                    setMartingaleEnabled(settings.martingaleEnabled);
                    setConnectionStatus(response.data.user.pocketOptionConnection?.isConnected || false);
                }
            } catch (err) {
                console.error("Error fetching profile:", err);
            }
        };

        const fetchStatus = async () => {
            try {
                const response = await api.get('/users/connect-pocketoption/status');
                if (response.data.success && response.data.status) {
                    // Check if BOTH the DB says connected AND the server has an active session
                    const isConnected = response.data.status.connected && response.data.status.sessionActive;
                    setConnectionStatus(isConnected);
                }
            } catch (err) {
                console.error("Error fetching status:", err);
            }
        };

        fetchUserData();
        fetchStatus();

        // Connect to socket
        const newSocket = io('/', {
            transports: ['websocket'],
            path: '/socket.io'
        });

        newSocket.on('connect', () => {
            console.log('Connected to WebSocket');
            const token = localStorage.getItem('token');
            if (token) {
                newSocket.emit('authenticate', { token });
            }
        });

        newSocket.on('authenticated', (data) => {
            console.log('Socket Authenticated', data);
            setConnectionStatus(data.user.isConnected);
        });

        newSocket.on('status_update', (data) => {
            if (data.isConnected !== undefined) setConnectionStatus(data.isConnected);
        });

        // Fetch Recent History
        const fetchHistory = async () => {
            try {
                const response = await api.get('/trades/history?limit=5');
                if (response.data.success) {
                    setTrades(response.data.trades);
                    setActiveTradesCount(response.data.pagination.total);
                }
            } catch (err) {
                console.error("Error fetching history:", err);
            }
        };
        fetchHistory();

        setSocket(newSocket);

        return () => newSocket.close();
    }, []);

    const handleConnectAccount = async () => {
        if (!loginForm.email || !loginForm.password) {
            showModal({ title: 'Missing Info', message: 'Please enter both email and password.', type: 'error' });
            return;
        }

        setIsLoggingIn(true);
        try {
            const response = await api.post('/users/connect-pocketoption/login', loginForm);
            if (response.data.success) {
                setShowLoginModal(false);
                showModal({
                    title: 'Login Initiated',
                    message: 'Browser is starting. Please wait for the connection to be established.',
                    type: 'success'
                });

                // Poll for status
                let attempts = 0;
                const interval = setInterval(async () => {
                    attempts++;
                    const statusRes = await api.get('/users/connect-pocketoption/status');
                    if (statusRes.data.success && statusRes.data.status.connected) {
                        setConnectionStatus(true);
                        setIsAutoTrading(true);
                        clearInterval(interval);
                    }
                    if (attempts > 30) clearInterval(interval);
                }, 2000);
            }
        } catch (error) {
            showModal({
                title: 'Login Failed',
                message: error.response?.data?.message || 'Failed to start automated login.',
                type: 'error'
            });
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleVerifyConnection = async () => {
        setIsVerifying(true);
        try {
            const response = await api.post('/users/connect-pocketoption/verify');
            if (response.data.success) {
                setConnectionStatus(true);
                setIsAutoTrading(true);
                showModal({
                    title: 'System Verified',
                    message: response.data.message,
                    type: 'success'
                });
            }
        } catch (error) {
            showModal({
                title: 'Verification Failed',
                message: error.response?.data?.message || error.message,
                type: 'warning'
            });
        } finally {
            setIsVerifying(false);
        }
    };

    const toggleAutoTrading = async () => {
        setIsUpdatingSettings(true);
        try {
            const newValue = !isAutoTrading;
            const response = await api.put('/users/settings', {
                tradingSettings: { isAutoTrading: newValue }
            });
            if (response.data.success) {
                setIsAutoTrading(newValue);
            }
        } catch (error) {
            showModal({ title: 'Error', message: error.message, type: 'error' });
        } finally {
            setIsUpdatingSettings(false);
        }
    };

    const handleSaveTradingSettings = async () => {
        setIsUpdatingSettings(true);
        try {
            const response = await api.put('/users/settings', {
                tradingSettings: {
                    defaultAmount: parseFloat(defaultAmount),
                    martingaleEnabled
                }
            });
            if (response.data.success) {
                showModal({ title: 'Saved', message: 'Settings updated successfully.', type: 'success' });
            }
        } catch (error) {
            showModal({ title: 'Error', message: error.message, type: 'error' });
        } finally {
            setIsUpdatingSettings(false);
        }
    };

    return (
        <div className="min-h-screen bg-primary">
            {/* Navigation */}
            <nav className="bg-secondary border-b border-gray-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="bg-accent/10 p-2 rounded-lg">
                        <FontAwesomeIcon icon={faRobot} className="text-accent text-xl" />
                    </div>
                    <span className="font-bold text-xl tracking-tight text-white">Niels<span className="text-accent">AutoTrade</span></span>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold text-white">{user?.fullName || 'User'}</p>
                        <p className="text-[10px] text-gray-500 font-mono">{user?.email}</p>
                    </div>
                    <div className="h-8 w-px bg-gray-800"></div>
                    <button onClick={logout} className="text-gray-500 hover:text-white transition-colors p-2">
                        <FontAwesomeIcon icon={faPowerOff} size="lg" />
                    </button>
                </div>
            </nav>

            {/* Main Content */}
            <main className="p-6 max-w-7xl mx-auto space-y-8">

                {/* Warning Banner */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-4 animate-pulse">
                    <div className="bg-red-500/20 p-3 rounded-full text-red-500">
                        <FontAwesomeIcon icon={faTriangleExclamation} size="lg" />
                    </div>
                    <div>
                        <h4 className="text-red-500 font-bold uppercase tracking-wider text-sm">Action Required</h4>
                        <p className="text-gray-400 text-xs">
                            Make sure you have selected the <strong className="text-white">EURUSD</strong> chart in your Pocket Option account. The bot will no longer select the asset automatically.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Connection Panel */}
                    <div className={`lg:col-span-2 rounded-2xl p-6 border transition-all ${connectionStatus ? 'bg-success/5 border-success/20' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${connectionStatus ? 'bg-success/20 text-success' : 'bg-yellow-500/20 text-yellow-500 animate-pulse'}`}>
                                    <FontAwesomeIcon icon={connectionStatus ? faCircleCheck : faTriangleExclamation} size="lg" />
                                </div>
                                <div>
                                    <h3 className={`text-xl font-black ${connectionStatus ? 'text-success' : 'text-yellow-500'}`}>
                                        {connectionStatus ? 'CONNECTED & VERIFIED' : 'CONNECTION REQUIRED'}
                                    </h3>
                                    <p className="text-sm text-gray-400">
                                        {connectionStatus
                                            ? 'Auto-trading bridge is active.'
                                            : 'Please connect your account or verify the current session.'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                {!connectionStatus ? (
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => setShowLoginModal(true)}
                                            className="bg-accent hover:bg-accent/90 text-white font-black px-8 py-4 rounded-2xl transition-all shadow-xl shadow-accent/30 active:scale-95 uppercase tracking-widest text-sm"
                                        >
                                            <FontAwesomeIcon icon={faRocket} className="mr-3" />
                                            Connect Account
                                        </button>
                                        <button
                                            onClick={handleVerifyConnection}
                                            disabled={isVerifying}
                                            className="text-gray-400 hover:text-white text-[10px] uppercase font-bold tracking-widest flex items-center justify-center gap-2"
                                        >
                                            <FontAwesomeIcon icon={faRefresh} className={isVerifying ? 'animate-spin' : ''} />
                                            {isVerifying ? 'Checking...' : 'Manually Verify Session'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4">
                                        <span className="text-[10px] font-black text-success uppercase tracking-widest bg-success/10 px-3 py-1 rounded-full border border-success/20">
                                            LIVE SYNC ACTIVE
                                        </span>
                                        <button
                                            onClick={handleVerifyConnection}
                                            disabled={isVerifying}
                                            className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold px-4 py-2 rounded-xl transition-all text-[10px] uppercase tracking-widest"
                                        >
                                            <FontAwesomeIcon icon={faRefresh} className={`mr-2 ${isVerifying ? 'animate-spin' : ''}`} /> Re-Verify
                                        </button>
                                        <button
                                            onClick={() => setShowLoginModal(true)}
                                            className="text-gray-500 hover:text-white text-[10px] uppercase font-bold"
                                        >
                                            Switch
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Auto-Trading Switch */}
                    <div className={`rounded-2xl p-6 border transition-all ${isAutoTrading ? 'bg-blue-500/5 border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'bg-gray-800/50 border-gray-700'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <FontAwesomeIcon icon={faRobot} className={isAutoTrading ? 'text-blue-400' : 'text-gray-600'} />
                                <span className="font-bold text-gray-300">AUTO-TRADING</span>
                            </div>
                            <button
                                onClick={toggleAutoTrading}
                                disabled={isUpdatingSettings || !connectionStatus}
                                className={`text-4xl transition-all ${!connectionStatus ? 'opacity-20 cursor-not-allowed' : 'hover:scale-110 active:scale-90 text-blue-500'}`}
                            >
                                <FontAwesomeIcon icon={isAutoTrading ? faToggleOn : faToggleOff} className={isAutoTrading ? 'text-blue-500' : 'text-gray-700'} />
                            </button>
                        </div>
                        <div className="text-2xl font-black text-white mb-2">
                            {isAutoTrading ? 'ACTIVE' : 'DISABLED'}
                        </div>
                    </div>
                </div>

                {/* Trading Configuration Section */}
                <div className="bg-secondary/50 rounded-2xl p-8 border border-gray-800 shadow-xl">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="bg-purple-500/10 p-2 rounded-lg">
                            <FontAwesomeIcon icon={faGear} className="text-purple-500" />
                        </div>
                        <h3 className="text-xl font-black text-white">Bot Configurations</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Initial Trade Amount ($)</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-accent transition-colors">
                                    <FontAwesomeIcon icon={faWallet} />
                                </div>
                                <input
                                    type="number"
                                    value={defaultAmount}
                                    onChange={(e) => setDefaultAmount(e.target.value)}
                                    className="w-full bg-primary border border-gray-700 rounded-xl py-4 pl-12 pr-4 text-white font-bold focus:border-accent outline-none transition-all"
                                    placeholder="1.00"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Martingale Strategy</label>
                            <button
                                onClick={() => setMartingaleEnabled(!martingaleEnabled)}
                                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${martingaleEnabled ? 'bg-accent/5 border-accent/30 text-accent' : 'bg-gray-800/50 border-gray-700 text-gray-500'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <FontAwesomeIcon icon={faChartSimple} />
                                    <span className="font-bold">{martingaleEnabled ? 'MULTIPLIER ENABLED' : 'FIXED AMOUNT'}</span>
                                </div>
                                <FontAwesomeIcon icon={martingaleEnabled ? faToggleOn : faToggleOff} size="lg" />
                            </button>
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={handleSaveTradingSettings}
                                disabled={isUpdatingSettings}
                                className="w-full bg-accent hover:bg-accent/90 text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-accent/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {isUpdatingSettings ? <FontAwesomeIcon icon={faRefresh} spin /> : <FontAwesomeIcon icon={faCircleCheck} />}
                                SAVE CONFIGURATION
                            </button>
                        </div>
                    </div>
                </div>

                {/* Recent Activity Table */}
                <div className="bg-secondary rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
                    <div className="p-8 border-b border-gray-800">
                        <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                            <span className="h-2 w-10 bg-accent rounded-full"></span>
                            RECENT ACTIVITY
                        </h3>
                    </div>
                    {trades.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-800/50 text-gray-500 uppercase text-[10px] font-black tracking-widest">
                                    <tr>
                                        <th className="px-8 py-5">Asset</th>
                                        <th className="px-8 py-5">Action</th>
                                        <th className="px-8 py-5">Stake</th>
                                        <th className="px-8 py-5">Status</th>
                                        <th className="px-8 py-5 text-right">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {trades.map((trade) => (
                                        <tr key={trade._id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-8 py-5 text-white font-bold">{trade.asset}</td>
                                            <td className="px-8 py-5">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black ${trade.direction === 'CALL' ? 'bg-success/10 text-success' : 'bg-red-500/10 text-red-500'}`}>
                                                    {trade.direction}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 font-bold text-white">${trade.amount}</td>
                                            <td className="px-8 py-5 text-gray-400 text-xs">{trade.status}</td>
                                            <td className="px-8 py-5 text-right text-xs text-gray-500">
                                                {new Date(trade.createdAt).toLocaleTimeString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-12 text-center text-gray-500">No recent activity.</div>
                    )}
                </div>
            </main>

            {/* Login Modal */}
            {showLoginModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-primary/90 backdrop-blur-sm">
                    <div className="bg-secondary w-full max-w-md rounded-3xl border border-gray-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-gray-800 flex justify-between items-center">
                            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                                Connect <span className="text-accent underline decoration-2 underline-offset-4">Account</span>
                            </h3>
                            <button onClick={() => setShowLoginModal(false)} className="text-gray-500 hover:text-white transition-colors">
                                <FontAwesomeIcon icon={faXmark} size="lg" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Platform Email</label>
                                <input
                                    type="email"
                                    value={loginForm.email}
                                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                                    className="w-full bg-primary border border-gray-700 rounded-xl py-4 px-4 text-white outline-none focus:border-accent transition-all"
                                    placeholder="your@email.com"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Platform Password</label>
                                <input
                                    type="password"
                                    value={loginForm.password}
                                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                    className="w-full bg-primary border border-gray-700 rounded-xl py-4 px-4 text-white outline-none focus:border-accent transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Account Type</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setLoginForm({ ...loginForm, accountType: 'DEMO' })}
                                        className={`py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${loginForm.accountType === 'DEMO' ? 'bg-accent text-primary' : 'bg-gray-800 text-gray-500'}`}
                                    >
                                        Demo
                                    </button>
                                    <button
                                        onClick={() => setLoginForm({ ...loginForm, accountType: 'REAL' })}
                                        className={`py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${loginForm.accountType === 'REAL' ? 'bg-success text-primary' : 'bg-gray-800 text-gray-500'}`}
                                    >
                                        Real
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={handleConnectAccount}
                                disabled={isLoggingIn}
                                className="w-full bg-accent hover:bg-accent/90 text-primary font-black py-5 rounded-2xl uppercase tracking-widest text-sm shadow-xl shadow-accent/20 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                            >
                                {isLoggingIn ? <FontAwesomeIcon icon={faRefresh} spin /> : <FontAwesomeIcon icon={faRocket} />}
                                {isLoggingIn ? 'Establishing Connection...' : 'Launch Automated Browser'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
