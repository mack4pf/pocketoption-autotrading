import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSignal,
    faArrowLeft,
    faBullhorn,
    faArrowUp,
    faArrowDown,
    faClock,
    faSpinner,
    faLock
} from '@fortawesome/free-solid-svg-icons';
import api from '../api/axios';
import { useModal } from '../context/ModalContext';

const AdminSignals = () => {
    const { showModal } = useModal();
    const [signalForm, setSignalForm] = useState({
        asset: 'EURUSD-OTC',
        direction: 'call',
        time: 300
    });
    const [adminSecret, setAdminSecret] = useState('');
    const [isSending, setIsSending] = useState(false);
    const navigate = useNavigate();

    const handleSendSignal = async (e) => {
        e.preventDefault();

        if (!adminSecret) {
            showModal({
                title: 'Secret Required',
                message: 'Please enter the Admin Secret to broadcast signals.',
                type: 'warning'
            });
            return;
        }

        setIsSending(true);

        try {
            const response = await api.post('/signals/create', signalForm, {
                headers: {
                    'X-Admin-Secret': adminSecret
                }
            });

            if (response.data.success) {
                showModal({
                    title: 'Signal Broadcasted',
                    message: `✅ Signal sent successfully!\n\nAsset: ${signalForm.asset}\nDirection: ${signalForm.direction.toUpperCase()}\nTime: ${signalForm.time}s`,
                    type: 'success'
                });
                // Reset form
                setSignalForm({
                    asset: 'EURUSD-OTC',
                    direction: 'call',
                    time: 300
                });
            }
        } catch (error) {
            showModal({
                title: 'Broadcast Failed',
                message: error.response?.data?.error || error.message,
                type: 'error'
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100">
            {/* Header */}
            <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center gap-4">
                <Link to="/admin/dashboard" className="text-gray-400 hover:text-white">
                    <FontAwesomeIcon icon={faArrowLeft} /> Back
                </Link>
                <h1 className="text-xl font-bold text-red-500 flex items-center gap-2">
                    <FontAwesomeIcon icon={faSignal} /> Broadcast Trading Signals
                </h1>
            </div>

            <div className="p-6 max-w-4xl mx-auto">
                {/* Warning Banner */}
                <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 mb-6">
                    <h3 className="font-bold text-red-500 mb-2 flex items-center gap-2">
                        <FontAwesomeIcon icon={faBullhorn} /> ADMIN ONLY - BROADCAST TO ALL USERS
                    </h3>
                    <p className="text-sm text-gray-300">
                        This signal will be sent to ALL connected users. Their bots will automatically place trades based on this signal.
                        Make sure the signal is accurate before broadcasting.
                    </p>
                </div>

                {/* Signal Form */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-xl font-bold mb-6">Create New Signal</h2>

                    <form onSubmit={handleSendSignal} className="space-y-6">
                        {/* Asset Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Trading Pair / Asset
                            </label>
                            <select
                                value={signalForm.asset}
                                onChange={(e) => setSignalForm({ ...signalForm, asset: e.target.value })}
                                className="input-field bg-gray-900"
                                required
                            >
                                <option value="EURUSD-OTC">EUR/USD (OTC)</option>
                                <option value="EURUSD">EUR/USD</option>
                                <option value="GBPUSD">GBP/USD</option>
                                <option value="USDJPY">USD/JPY</option>
                                <option value="AUDUSD">AUD/USD</option>
                                <option value="BITCOIN">Bitcoin</option>
                                <option value="ETHEREUM">Ethereum</option>
                            </select>
                        </div>

                        {/* Direction */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Direction (Call/Put)
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setSignalForm({ ...signalForm, direction: 'call' })}
                                    className={`p-4 rounded-lg border-2 transition-all ${signalForm.direction === 'call'
                                        ? 'border-green-500 bg-green-500/20 text-green-500'
                                        : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-green-500'
                                        }`}
                                >
                                    <FontAwesomeIcon icon={faArrowUp} size="2x" className="mb-2" />
                                    <div className="font-bold">CALL (Buy)</div>
                                    <div className="text-xs">Price will go UP</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setSignalForm({ ...signalForm, direction: 'put' })}
                                    className={`p-4 rounded-lg border-2 transition-all ${signalForm.direction === 'put'
                                        ? 'border-red-500 bg-red-500/20 text-red-500'
                                        : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-red-500'
                                        }`}
                                >
                                    <FontAwesomeIcon icon={faArrowDown} size="2x" className="mb-2" />
                                    <div className="font-bold">PUT (Sell)</div>
                                    <div className="text-xs">Price will go DOWN</div>
                                </button>
                            </div>
                        </div>

                        {/* Time Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                <FontAwesomeIcon icon={faClock} className="mr-2" />
                                Expiration Time (seconds)
                            </label>
                            <select
                                value={signalForm.time}
                                onChange={(e) => setSignalForm({ ...signalForm, time: parseInt(e.target.value) })}
                                className="input-field bg-gray-900"
                                required
                            >
                                <option value="60">1 Minute (60s)</option>
                                <option value="120">2 Minutes (120s)</option>
                                <option value="180">3 Minutes (180s)</option>
                                <option value="300">5 Minutes (300s) - Recommended</option>
                                <option value="600">10 Minutes (600s)</option>
                                <option value="900">15 Minutes (900s)</option>
                            </select>
                        </div>

                        {/* Signal Summary */}
                        <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                            <h3 className="font-bold mb-3 text-gray-300">Signal Summary</h3>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <div className="text-xs text-gray-500 uppercase">Asset</div>
                                    <div className="text-lg font-bold text-white">{signalForm.asset}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 uppercase">Direction</div>
                                    <div className={`text-lg font-bold ${signalForm.direction === 'call' ? 'text-green-500' : 'text-red-500'}`}>
                                        {signalForm.direction.toUpperCase()}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 uppercase">Time</div>
                                    <div className="text-lg font-bold text-white">{signalForm.time}s</div>
                                </div>
                            </div>
                        </div>

                        {/* Admin Secret */}
                        <div className="bg-gray-900/50 p-4 rounded-xl border border-red-500/20">
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                <FontAwesomeIcon icon={faLock} className="mr-2 text-red-500" />
                                Admin Authorization Secret
                            </label>
                            <input
                                type="password"
                                value={adminSecret}
                                onChange={(e) => setAdminSecret(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 p-3 rounded-lg focus:border-red-500 outline-none transition-all font-mono"
                                placeholder="Enter secret key to authorize broadcast"
                                required
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSending}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-red-600/20 active:scale-[0.98]"
                        >
                            {isSending ? (
                                <>
                                    <FontAwesomeIcon icon={faSpinner} spin className="text-xl" />
                                    <span className="tracking-widest">BROADCASTING...</span>
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faBullhorn} className="text-xl" />
                                    <span className="tracking-widest">BROADCAST SIGNAL TO ALL USERS</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Instructions */}
                <div className="mt-6 bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h3 className="font-bold mb-2 text-gray-300">How It Works</h3>
                    <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
                        <li>Select the trading asset (currency pair, crypto, etc.)</li>
                        <li>Choose direction: CALL if you think price will go up, PUT if it will go down</li>
                        <li>Set expiration time (how long the trade will run)</li>
                        <li>Click "Broadcast Signal" - all connected users will receive the signal</li>
                        <li>Users' bots will automatically place trades with their Martingale settings</li>
                    </ol>
                </div>
            </div>
        </div>
    );
};

export default AdminSignals;
