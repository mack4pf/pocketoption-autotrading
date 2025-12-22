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
    faRefresh
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
    const [isConnecting, setIsConnecting] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isAutoTrading, setIsAutoTrading] = useState(user?.tradingSettings?.isAutoTrading || false);
    const [defaultAmount, setDefaultAmount] = useState(user?.tradingSettings?.defaultAmount || 1);
    const [martingaleEnabled, setMartingaleEnabled] = useState(user?.tradingSettings?.martingaleEnabled !== false);
    const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

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
        fetchUserData();

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

    const handleConnectPocketOption = async () => {
        setIsConnecting(true);
        try {
            const response = await api.post('/users/connect-pocketoption/start');
            if (response.data.success) {
                showModal({
                    title: 'Browser Launched',
                    message: response.data.message,
                    type: 'success'
                });
            }
        } catch (error) {
            showModal({
                title: 'Connection Error',
                message: error.response?.data?.error || error.message,
                type: 'error'
            });
        } finally {
            setIsConnecting(false);
        }
    };

    const handleVerifyConnection = async () => {
        setIsVerifying(true);
        try {
            const response = await api.post('/users/connect-pocketoption/verify');
            if (response.data.success) {
                setConnectionStatus(true);
                setIsAutoTrading(true); // Verifying typically auto-enables
                showModal({
                    title: 'System Verified',
                    message: response.data.message,
                    type: 'success'
                });
            }
        } catch (error) {
            const data = error.response?.data;
            const fullMessage = [
                data?.error,
                data?.message,
                data?.instructions
            ].filter(Boolean).join('\n\n');

            showModal({
                title: 'Verification Failed',
                message: fullMessage || error.message,
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
                showModal({
                    title: newValue ? 'Automation Resumed' : 'Automation Paused',
                    message: newValue ? 'The bot is now monitoring for signals.' : 'Signal processing has been temporarily suspended.',
                    type: 'info'
                });
            }
        } catch (error) {
            showModal({
                title: 'Settings Error',
                message: error.response?.data?.error || error.message,
                type: 'error'
            });
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
                showModal({
                    title: 'Settings Saved',
                    message: `Initial trade amount set to $${defaultAmount} and Martingale ${martingaleEnabled ? 'enabled' : 'disabled'}.`,
                    type: 'success'
                });
            }
        } catch (error) {
            showModal({
                title: 'Save Failed',
                message: error.response?.data?.error || error.message,
                type: 'error'
            });
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

                {/* Automation & Status Section */}
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
                                        {connectionStatus ? 'PLATFORM CONNECTED' : 'CONNECTION REQUIRED'}
                                    </h3>
                                    <p className="text-sm text-gray-400">
                                        {connectionStatus
                                            ? 'Auto-trading bridge is actively synchronized with Pocket Option.'
                                            : 'Please establish a browser session to begin receiving signals.'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                {!connectionStatus ? (
                                    <>
                                        <button
                                            onClick={handleConnectPocketOption}
                                            disabled={isConnecting}
                                            className="bg-accent hover:bg-accent/90 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-accent/20 active:scale-95 disabled:opacity-50"
                                        >
                                            <FontAwesomeIcon icon={faGlobe} className="mr-2" />
                                            {isConnecting ? 'Opening...' : 'Launch Browser'}
                                        </button>
                                        <button
                                            onClick={handleVerifyConnection}
                                            disabled={isVerifying}
                                            className="bg-success hover:bg-success/90 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-success/20 active:scale-95 disabled:opacity-50"
                                        >
                                            <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                                            {isVerifying ? 'Verifying...' : 'Verify'}
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={handleConnectPocketOption}
                                        className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold px-4 py-2 rounded-xl transition-all text-sm"
                                    >
                                        <FontAwesomeIcon icon={faRefresh} className="mr-2" /> Reconnect
                                    </button>
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
                                title={!connectionStatus ? "Connect to platform first" : "Toggle Automation"}
                            >
                                <FontAwesomeIcon icon={isAutoTrading ? faToggleOn : faToggleOff} className={isAutoTrading ? 'text-blue-500' : 'text-gray-700'} />
                            </button>
                        </div>
                        <div className="text-2xl font-black text-white mb-2">
                            {isAutoTrading ? 'ACTIVE' : 'DISABLED'}
                        </div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                            {isAutoTrading
                                ? 'Bot is executing signals in real-time'
                                : 'Automation paused - Manual mode'}
                        </p>
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
                        {/* Initial Amount */}
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
                                    min="1"
                                    step="1"
                                />
                            </div>
                        </div>

                        {/* Martingale Toggle */}
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

                        {/* Save Action */}
                        <div className="flex items-end">
                            <button
                                onClick={handleSaveTradingSettings}
                                disabled={isUpdatingSettings}
                                className="w-full bg-accent hover:bg-accent/90 text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-accent/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {isUpdatingSettings ? (
                                    <FontAwesomeIcon icon={faRefresh} spin />
                                ) : (
                                    <FontAwesomeIcon icon={faCircleCheck} />
                                )}
                                SAVE CONFIGURATION
                            </button>
                        </div>
                    </div>

                    {martingaleEnabled && (
                        <div className="mt-6 p-4 bg-accent/5 border border-accent/10 rounded-xl">
                            <p className="text-[10px] text-gray-400 flex items-center gap-2">
                                <FontAwesomeIcon icon={faTriangleExclamation} className="text-yellow-500" />
                                <span>MARTINGALE ACTIVE: Amount will multiply by 2.0x on each loss (Level 0-6). Starting at: <b>${defaultAmount}</b></span>
                            </p>
                        </div>
                    )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-secondary p-8 rounded-3xl border border-gray-800 hover:border-purple-500/30 transition-all shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <FontAwesomeIcon icon={faChartSimple} size="4x" className="text-white" />
                        </div>
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 bg-purple-500/10 rounded-2xl text-purple-400">
                                <FontAwesomeIcon icon={faChartSimple} size="xl" />
                            </div>
                            <span className="text-[10px] text-gray-500 font-black tracking-[0.2em] uppercase">Execution History</span>
                        </div>
                        <div className="text-4xl font-black text-white mb-2">{activeTradesCount}</div>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-600 font-bold">Total trades processed</span>
                        </div>
                    </div>

                    <div className="bg-secondary p-8 rounded-3xl border border-gray-800 hover:border-accent/50 cursor-pointer transition-all shadow-xl relative overflow-hidden group">
                        <Link to="/signals" className="block h-full">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <FontAwesomeIcon icon={faSignal} size="4x" className="text-white" />
                            </div>
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-4 bg-accent/10 rounded-2xl text-accent group-hover:bg-accent group-hover:text-white transition-all">
                                    <FontAwesomeIcon icon={faSignal} size="xl" />
                                </div>
                                <span className="text-[10px] text-gray-500 font-black tracking-[0.2em] uppercase">Signal Center</span>
                            </div>
                            <div className="text-2xl font-black text-white mb-2 flex items-center gap-3">
                                Live Logs <span className="group-hover:translate-x-2 transition-transform">&rarr;</span>
                            </div>
                            <div className="text-xs text-gray-600 font-bold">Review incoming signal stream</div>
                        </Link>
                    </div>
                </div>

                {/* Section Header */}
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                        <span className="h-2 w-10 bg-accent rounded-full"></span>
                        RECENT ACTIVITY
                    </h3>
                    <Link to="/signals" className="text-[10px] font-black text-accent uppercase tracking-widest hover:underline">View All &rarr;</Link>
                </div>

                {/* Risk Management Tip */}
                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4 flex items-center gap-4">
                    <div className="bg-yellow-500/20 p-3 rounded-xl text-yellow-500">
                        <FontAwesomeIcon icon={faTriangleExclamation} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-yellow-500 uppercase tracking-widest mb-1">Risk Management Advice</p>
                        <p className="text-[11px] text-gray-400">Please set your "Initial Amount" based on your actual available balance on the platform. We recommend a starting stake of no more than 1-2% of your total balance to handle potential Martingale sequences safely.</p>
                    </div>
                </div>

                {/* Recent Activity Table */}
                <div className="bg-secondary rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
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
                                            <td className="px-8 py-5">
                                                <div className="font-black text-white group-hover:text-accent transition-colors">{trade.asset}</div>
                                                <div className="text-[10px] text-gray-600 font-bold uppercase">{trade.source} Trade</div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black ${trade.direction === 'CALL' ? 'bg-success/10 text-success' : 'bg-red-500/10 text-red-500'}`}>
                                                    {trade.direction}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 font-bold text-white">${trade.amount}</td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className={`h-1.5 w-1.5 rounded-full ${trade.status === 'completed' ? 'bg-success' : 'bg-yellow-500 animate-pulse'}`}></div>
                                                    <span className="text-xs font-bold text-gray-400 capitalize">{trade.status}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right text-xs text-gray-500 font-mono">
                                                {new Date(trade.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-12 text-center space-y-4">
                            <div className="h-20 w-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto text-gray-700">
                                <FontAwesomeIcon icon={faGear} size="2x" className="animate-spin-slow" />
                            </div>
                            <div>
                                <p className="text-white font-bold">No active history found</p>
                                <p className="text-gray-500 text-sm max-w-xs mx-auto">Connect your account and enable auto-trading to see live execution logs here.</p>
                            </div>
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
};

export default Dashboard;
