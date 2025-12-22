import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUsers,
    faKey,
    faServer,
    faRefresh,
    faSignOut,
    faTimes,
    faPlus,
    faUserShield,
    faBroadcastTower,
    faCircleCheck
} from '@fortawesome/free-solid-svg-icons';
import { useModal } from '../context/ModalContext';

const AdminDashboard = () => {
    const { logout } = useAuth();
    const { showModal } = useModal();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [codes, setCodes] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [codeForm, setCodeForm] = useState({ maxUses: 1, expiresInHours: '', notes: '' });
    const [adminForm, setAdminForm] = useState({ email: '', fullName: '', password: '' });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, usersRes, codesRes] = await Promise.all([
                api.get('/admin/dashboard'),
                api.get('/admin/users'),
                api.get('/admin/access-codes')
            ]);
            setStats(statsRes.data.stats);
            setUsers(usersRes.data.users);
            setCodes(codesRes.data.accessCodes);
        } catch (error) {
            console.error("Failed to fetch admin data", error);
            showModal({
                title: 'Data Sync Error',
                message: error.response?.data?.error || error.message,
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRestartSessions = async () => {
        showModal({
            title: 'Restart Sessions',
            message: 'Are you sure you want to restart all active browser sessions? This will disconnect all users.',
            type: 'confirm',
            onConfirm: async () => {
                try {
                    await api.post('/admin/system/restart-sessions');
                    showModal({ title: 'Success', message: 'All sessions have been restarted.', type: 'success' });
                    fetchData();
                } catch (e) {
                    showModal({ title: 'System Error', message: e.response?.data?.error || 'Failed to restart sessions', type: 'error' });
                }
            }
        });
    };

    const handleToggleUserStatus = async (userId, currentStatus) => {
        try {
            await api.put(`/admin/users/${userId}`, { isActive: !currentStatus });
            showModal({
                title: 'Status Updated',
                message: `User ${!currentStatus ? 'activated' : 'deactivated'} successfully!`,
                type: 'success'
            });
            fetchData();
        } catch (e) {
            showModal({ title: 'Update Failed', message: e.response?.data?.error || 'Failed to toggle status', type: 'error' });
        }
    };

    const handleCreateCode = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/access-codes/create', codeForm);
            showModal({ title: 'Code Generated', message: 'New access code created successfully!', type: 'success' });
            setShowCodeModal(false);
            setCodeForm({ maxUses: 1, expiresInHours: '', notes: '' });
            fetchData();
        } catch (e) {
            showModal({ title: 'Creation Failed', message: e.response?.data?.error || 'Failed to create code', type: 'error' });
        }
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/create-admin', adminForm);
            showModal({ title: 'Admin Deployed', message: 'New administrator account created successfully!', type: 'success' });
            setShowAdminModal(false);
            setAdminForm({ email: '', fullName: '', password: '' });
            fetchData();
        } catch (e) {
            showModal({ title: 'Creation Failed', message: e.response?.data?.error || 'Failed to create admin', type: 'error' });
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
            {/* Admin Nav */}
            <nav className="bg-gray-800 border-b border-gray-700 p-4 sticky top-0 z-40 backdrop-blur-md bg-opacity-90">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-500/10 p-2 rounded-lg">
                            <FontAwesomeIcon icon={faServer} className="text-red-500 text-xl" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">Admin<span className="text-red-500">Panel</span></h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/admin/signals')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95"
                        >
                            <FontAwesomeIcon icon={faBroadcastTower} /> Send Signal
                        </button>
                        <div className="h-8 w-px bg-gray-700 mx-2"></div>
                        <button onClick={fetchData} className="text-gray-400 hover:text-white p-2" title="Refresh Data">
                            <FontAwesomeIcon icon={faRefresh} spin={loading} />
                        </button>
                        <button onClick={logout} className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                            <FontAwesomeIcon icon={faSignOut} className="mr-2" /> Logout
                        </button>
                    </div>
                </div>
            </nav>

            <div className="p-6 max-w-7xl mx-auto">
                {/* Tabs */}
                <div className="flex gap-2 mb-8 bg-gray-800/50 p-1 rounded-xl border border-gray-700 w-fit">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'overview' ? 'bg-red-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'users' ? 'bg-red-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        <FontAwesomeIcon icon={faUsers} className="mr-2" /> Users
                    </button>
                    <button
                        onClick={() => setActiveTab('codes')}
                        className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'codes' ? 'bg-red-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        <FontAwesomeIcon icon={faKey} className="mr-2" /> Codes
                    </button>
                </div>

                {/* Content */}
                {loading && !stats ? (
                    <div className="text-center py-32 flex flex-col items-center gap-6">
                        <div className="relative">
                            <div className="h-16 w-16 rounded-full border-4 border-red-500/20 border-t-red-500 animate-spin"></div>
                            <FontAwesomeIcon icon={faServer} className="absolute inset-0 m-auto text-xl text-red-500/50" />
                        </div>
                        <p className="text-gray-400 animate-pulse">Synchronizing system data...</p>
                    </div>
                ) : (
                    <>
                        {activeTab === 'overview' && stats && (
                            <div className="space-y-8 animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
                                        <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Users</div>
                                        <div className="text-4xl font-black text-white">{stats.totalUsers}</div>
                                        <div className="mt-4 text-[10px] text-gray-500">Registered in database</div>
                                    </div>

                                    <div className="bg-gray-800 p-6 rounded-2xl border border-green-500/20 shadow-lg hover:border-green-500/40 transition-all group">
                                        <div className="flex justify-between items-start">
                                            <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Live Sessions</div>
                                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                        </div>
                                        <div className="text-4xl font-black text-green-400">{stats.sessions?.active || 0}</div>
                                        <div className="mt-4 text-[10px] text-gray-400 flex items-center gap-1">
                                            <FontAwesomeIcon icon={faCircleCheck} className="text-green-500" />
                                            {stats.sessions?.onTradingPage || 0} users on trading page
                                        </div>
                                    </div>

                                    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
                                        <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Trades</div>
                                        <div className="text-4xl font-black text-blue-400">{stats.totalTrades}</div>
                                        <div className="mt-4 text-[10px] text-gray-500">All-time executions</div>
                                    </div>

                                    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
                                        <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Active Codes</div>
                                        <div className="text-4xl font-black text-yellow-400">{stats.accessCodes}</div>
                                        <div className="mt-4 text-[10px] text-gray-500">Available for signup</div>
                                    </div>
                                </div>

                                <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-xl overflow-hidden relative">
                                    <div className="absolute top-0 right-0 p-8 opacity-5">
                                        <FontAwesomeIcon icon={faBroadcastTower} size="6x" className="text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-6 text-white">System Actions</h3>
                                    <div className="flex flex-wrap gap-4">
                                        <button
                                            onClick={() => navigate('/admin/signals')}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-3 transition-all hover:translate-y-[-2px] shadow-lg shadow-blue-500/20"
                                        >
                                            <FontAwesomeIcon icon={faBroadcastTower} /> BROADCAST SIGNAL
                                        </button>
                                        <button
                                            onClick={handleRestartSessions}
                                            className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 px-6 py-3 rounded-xl font-bold transition-all shadow-lg"
                                        >
                                            Restart All Sessions
                                        </button>
                                        <button
                                            onClick={() => setShowAdminModal(true)}
                                            className="bg-purple-600/10 hover:bg-purple-600 text-purple-500 hover:text-white border border-purple-500/20 px-6 py-3 rounded-xl font-bold transition-all shadow-lg"
                                        >
                                            <FontAwesomeIcon icon={faUserShield} className="mr-2" /> Add New Admin
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'users' && (
                            <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 shadow-2xl animate-fade-in">
                                <div className="p-6 border-b border-gray-700 bg-gray-800/50 flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-white">User Directory</h3>
                                    <div className="text-xs text-gray-500 font-mono">Showing {users.length} users</div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="bg-gray-900/50 text-gray-400 font-bold text-[10px] uppercase tracking-widest border-b border-gray-700">
                                                <th className="px-8 py-4">User Details</th>
                                                <th className="px-8 py-4">Status</th>
                                                <th className="px-8 py-4">Live Browser</th>
                                                <th className="px-8 py-4">Joining Date</th>
                                                <th className="px-8 py-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700/50">
                                            {users.map(u => (
                                                <tr key={u._id} className="hover:bg-gray-700/30 transition-colors group">
                                                    <td className="px-8 py-5">
                                                        <div className="font-bold text-white group-hover:text-red-400 transition-colors">{u.fullName}</div>
                                                        <div className="text-xs text-gray-500">{u.email}</div>
                                                    </td>
                                                    <td className="px-8 py-5 text-xs font-bold uppercase tracking-wider mb-2">
                                                        {u.isActive ? (
                                                            <span className="text-green-500 flex items-center gap-2">
                                                                <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span> ACTIVE
                                                            </span>
                                                        ) : (
                                                            <span className="text-red-500 flex items-center gap-2">
                                                                <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span> INACTIVE
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        {stats.sessions?.activeUserIds?.includes(u._id) ? (
                                                            <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-[10px] font-black border border-green-500/20">CONNECTED</span>
                                                        ) : (
                                                            <span className="text-gray-600 text-[10px] font-medium tracking-wider">OFFLINE</span>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-5 text-gray-500 font-mono text-xs">
                                                        {new Date(u.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-8 py-5 text-right">
                                                        <button
                                                            onClick={() => handleToggleUserStatus(u._id, u.isActive)}
                                                            className={`text-[10px] font-black uppercase tracking-tighter px-4 py-2 rounded-lg transition-all ${u.isActive ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white'}`}
                                                        >
                                                            {u.isActive ? 'Deactivate' : 'Activate'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'codes' && (
                            <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 shadow-2xl animate-fade-in">
                                <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-800/50">
                                    <h3 className="text-lg font-bold text-white">Access Codes</h3>
                                    <button
                                        onClick={() => setShowCodeModal(true)}
                                        className="bg-green-600 hover:bg-green-700 text-white text-xs px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg"
                                    >
                                        <FontAwesomeIcon icon={faPlus} /> New Code
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="bg-gray-900/50 text-gray-400 font-bold text-[10px] uppercase tracking-widest border-b border-gray-700">
                                                <th className="px-8 py-4">Security Code</th>
                                                <th className="px-8 py-4">Created By</th>
                                                <th className="px-8 py-4">Usage Statistics</th>
                                                <th className="px-8 py-4">Expiration</th>
                                                <th className="px-8 py-4">Reference</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700/50">
                                            {codes.map(c => (
                                                <tr key={c._id} className="hover:bg-gray-700/30 transition-colors">
                                                    <td className="px-8 py-5">
                                                        <span className="bg-gray-900 text-red-400 font-mono px-3 py-1.5 rounded-lg border border-red-500/20 select-all font-bold tracking-widest">{c.code}</span>
                                                    </td>
                                                    <td className="px-8 py-5 text-gray-400 text-xs">
                                                        {c.createdBy?.email || 'System'}
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-white font-bold">{c.usage?.users?.length || 0}</span>
                                                            <div className="w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-red-500"
                                                                    style={{ width: `${Math.min(100, ((c.usage?.users?.length || 0) / c.usage?.maxUses) * 100)}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className="text-gray-500 text-xs">/ {c.usage?.maxUses}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5 text-xs">
                                                        {c.expiresAt ? (
                                                            <span className={new Date(c.expiresAt) < new Date() ? 'text-red-500 font-bold' : 'text-gray-400'}>
                                                                {new Date(c.expiresAt).toLocaleDateString()}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-600 font-medium italic">Unlimited</span>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-5 text-gray-500 text-[10px] italic max-w-xs truncate">
                                                        {c.notes || '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modals remain essentially the same but with improved styling to match */}
            {showCodeModal && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-xl animate-fade-in">
                    <div className="bg-gray-800 p-8 rounded-2xl max-w-md w-full border border-gray-700 shadow-2xl animate-scale-in">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-white">Generate Code</h3>
                            <button onClick={() => setShowCodeModal(false)} className="text-gray-500 hover:text-white transition-colors p-2">
                                <FontAwesomeIcon icon={faTimes} size="lg" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateCode} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Maximum Usage Count</label>
                                <input
                                    type="number"
                                    value={codeForm.maxUses}
                                    onChange={(e) => setCodeForm({ ...codeForm, maxUses: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 p-4 rounded-xl text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all font-bold"
                                    min="1"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Expires After (hours)</label>
                                <input
                                    type="number"
                                    value={codeForm.expiresInHours}
                                    onChange={(e) => setCodeForm({ ...codeForm, expiresInHours: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 p-4 rounded-xl text-white focus:border-red-500 outline-none transition-all placeholder:text-gray-700"
                                    placeholder="Leave empty for lifetime"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Administrative Notes</label>
                                <textarea
                                    value={codeForm.notes}
                                    onChange={(e) => setCodeForm({ ...codeForm, notes: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 p-4 rounded-xl text-white focus:border-red-500 outline-none transition-all placeholder:text-gray-700 text-sm"
                                    rows="3"
                                    placeholder="Reference for this batch (e.g. VIP Campaign Dec)"
                                />
                            </div>
                            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-red-600/20 active:scale-[0.98]">
                                CREATE ACCESS CODE
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Admin Modal */}
            {showAdminModal && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-xl animate-fade-in">
                    <div className="bg-gray-800 p-8 rounded-2xl max-w-md w-full border border-gray-700 shadow-2xl animate-scale-in">
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-3">
                                <FontAwesomeIcon icon={faUserShield} className="text-purple-500 text-xl" />
                                <h3 className="text-2xl font-black text-white">New Admin</h3>
                            </div>
                            <button onClick={() => setShowAdminModal(false)} className="text-gray-500 hover:text-white transition-colors p-2">
                                <FontAwesomeIcon icon={faTimes} size="lg" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateAdmin} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Full Legal Name</label>
                                <input
                                    type="text"
                                    value={adminForm.fullName}
                                    onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 p-4 rounded-xl text-white focus:border-purple-500 outline-none transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Login Email Address</label>
                                <input
                                    type="email"
                                    value={adminForm.email}
                                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 p-4 rounded-xl text-white focus:border-purple-500 outline-none transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Secure Password</label>
                                <input
                                    type="password"
                                    value={adminForm.password}
                                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 p-4 rounded-xl text-white focus:border-purple-500 outline-none transition-all placeholder:text-gray-700"
                                    placeholder="Leave empty for auto-generation"
                                />
                            </div>
                            <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-purple-600/20 active:scale-[0.98]">
                                DEPLOY NEW ADMINISTRATOR
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
