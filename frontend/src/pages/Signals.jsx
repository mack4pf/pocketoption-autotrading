import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faHistory, faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';

const Signals = () => {
    const [trades, setTrades] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrades = async () => {
            try {
                // Assuming GET /api/trades/history returns user's trades
                const response = await api.get('/trades/history');
                setTrades(response.data.trades || []);
            } catch (error) {
                console.error("Failed to fetch trades", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTrades();
    }, []);

    return (
        <div className="min-h-screen bg-primary">
            <nav className="bg-secondary p-4 flex items-center gap-4">
                <Link to="/dashboard" className="text-gray-400 hover:text-white">
                    <FontAwesomeIcon icon={faArrowLeft} /> Back
                </Link>
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <FontAwesomeIcon icon={faHistory} /> Trade History
                </h1>
            </nav>

            <div className="p-6 max-w-7xl mx-auto">
                {loading ? (
                    <div className="text-center">Loading trades...</div>
                ) : (
                    <div className="card overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-800 text-gray-400 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3">Asset</th>
                                    <th className="px-6 py-3">Direction</th>
                                    <th className="px-6 py-3">Amount</th>
                                    <th className="px-6 py-3">Result</th>
                                    <th className="px-6 py-3">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {trades.map((trade, idx) => (
                                    <tr key={idx} className="text-sm text-gray-300">
                                        <td className="px-6 py-4 font-bold">{trade.asset}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs ${trade.direction === 'call' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {trade.direction?.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">${trade.amount}</td>
                                        <td className="px-6 py-4">
                                            {trade.outcome === 'win' && <span className="text-green-500"><FontAwesomeIcon icon={faCheckCircle} /> Win</span>}
                                            {trade.outcome === 'loss' && <span className="text-red-500"><FontAwesomeIcon icon={faTimesCircle} /> Loss</span>}
                                            {!trade.outcome && <span className="text-yellow-500">Pending</span>}
                                        </td>
                                        <td className="px-6 py-4">{new Date(trade.createdAt).toLocaleDateString()} {new Date(trade.createdAt).toLocaleTimeString()}</td>
                                    </tr>
                                ))}
                                {trades.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                            No history found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Signals;
