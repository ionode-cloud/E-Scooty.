import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, ShieldAlert, Users, Edit, Eye, EyeOff, Lock, ChevronRight } from 'lucide-react';

const AdminPanel = () => {
    const [users, setUsers] = useState([]);
    const [newUser, setNewUser] = useState({ email: '', password: '', role: 'user' });
    const [editingUser, setEditingUser] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        if (currentUser.role === 'admin') fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            const res = await axios.get(`${apiUrl}/api/users`);
            setUsers(res.data);
        } catch (error) { console.error('Error fetching users', error); }
    };

    const handleAddOrEditUser = async (e) => {
        e.preventDefault();
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            if (editingUser) {
                if (newUser.password && newUser.password.length < 6) return alert('New password must be at least 6 characters.');
                await axios.put(`${apiUrl}/api/users/${editingUser._id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                if (!newUser.password) return alert('Password is required for new users.');
                if (newUser.password.length < 6) return alert('Password must be at least 6 characters.');
                await axios.post(`${apiUrl}/api/users`, newUser, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setNewUser({ email: '', password: '', role: 'user' });
            setEditingUser(null);
            fetchUsers();
        } catch (error) { alert(error.response?.data?.message || 'Error saving user'); }
    };

    const handleEditClick = (user) => { setEditingUser(user); setNewUser({ email: user.email, password: '', role: user.role }); };
    const handleCancelEdit = () => { setEditingUser(null); setNewUser({ email: '', password: '', role: 'user' }); };

    const handleDeleteUser = async (id) => {
        if (!window.confirm('Delete this user?')) return;
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            const token = localStorage.getItem('token');
            await axios.delete(`${apiUrl}/api/users/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchUsers();
        } catch (error) { alert(error.response?.data?.message || 'Error deleting user'); }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#064E3B] shadow-lg shadow-black/10">
                        <Lock size={28} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-[#064E3B] tracking-tight">Admin Console</h1>
                        <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.2em] mt-1">Access Control & Security Kernel</p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            {currentUser.role === 'admin' ? (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* User Form Card */}
                    <div className="bg-white border-2 border-[#D1FAE5] rounded-[32px] p-8 h-fit lg:col-span-1 shadow-sm">
                        <div className="flex items-center gap-3 pb-6 border-b border-[#D1FAE5] mb-8">
                            <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 flex items-center justify-center text-[#10B981]">
                                {editingUser ? <Edit size={20} /> : <Plus size={20} />}
                            </div>
                            <h3 className="text-xs font-black text-[#064E3B] uppercase tracking-wider">{editingUser ? 'Update Security' : 'Provision User'}</h3>
                        </div>

                        <form onSubmit={handleAddOrEditUser} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Email Identity</label>
                                <input type="email" className="auth-input border-[#D1FAE5] focus:border-[#10B981]" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">
                                    Security Phrase {editingUser && <span className="text-[8px] text-slate-400 normal-case">(empty to keep)</span>}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="auth-input pr-10 border-[#D1FAE5] focus:border-[#10B981]"
                                        value={newUser.password || ''}
                                        onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                        required={!editingUser}
                                        placeholder={editingUser ? '••••••••' : 'Min 6 chars'}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#064E3B] transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">System Role</label>
                                <select className="auth-input font-bold border-[#D1FAE5] focus:border-[#10B981]" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                                    <option value="user">Standard User</option>
                                    <option value="operator">System Operator</option>
                                    <option value="admin">Root Admin</option>
                                </select>
                            </div>

                            <div className="pt-4 space-y-3">
                                <button type="submit" className="primary-btn w-full h-[52px] rounded-2xl flex items-center justify-center gap-3 bg-[#10B981] hover:bg-[#059669] shadow-lg shadow-emerald-500/10">
                                    {editingUser ? <Edit size={18} /> : <Plus size={18} />}
                                    <span className="uppercase tracking-widest font-black text-[11px]">{editingUser ? 'Save Updates' : 'Confirm Provision'}</span>
                                </button>
                                {editingUser && (
                                    <button type="button" onClick={handleCancelEdit} className="w-full text-[10px] font-black uppercase text-[#94A3B8] hover:text-rose-500 transition-colors py-3">
                                        Abort Editing
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* User Records Table */}
                    <div className="saas-card lg:col-span-3 overflow-hidden flex flex-col">
                        <div className="px-8 py-5 border-b border-[#F1F5F9] bg-[#F8FAFC]/50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Users size={14} className="text-[#346eea]" />
                                <h3 className="text-[10px] font-black text-[#111827] uppercase tracking-wider">Authenticated Personnel</h3>
                            </div>
                            <span className="text-[10px] font-black text-[#94A3B8] bg-white border border-[#E5E7EB] px-3 py-1.5 rounded-lg uppercase tracking-widest">
                                {users.length} Authorized Entities
                            </span>
                        </div>

                        <div className="overflow-x-auto overflow-y-auto max-h-[700px]">
                            <table className="saas-table">
                                <thead>
                                    <tr>
                                        <th>Email Address</th>
                                        <th>System Privilege</th>
                                        {currentUser.role === 'admin' && <th>Cleartext Ref</th>}
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length === 0 ? (
                                        <tr><td colSpan={4} className="py-20 text-center text-[#94A3B8] font-bold uppercase tracking-widest text-[10px]">No personnel records found.</td></tr>
                                    ) : (
                                        users.map(u => (
                                            <tr key={u._id} className="hover:bg-[#F8FAFC] transition-colors">
                                                <td><span className="font-bold text-[#111827]">{u.email}</span></td>
                                                <td>
                                                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md border ${u.role === 'admin' ? 'bg-orange-50 border-orange-200 text-orange-600' : u.role === 'operator' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                                        {u.role === 'admin' ? 'Root Admin' : u.role === 'operator' ? 'System Operator' : 'Standard User'}
                                                    </span>
                                                </td>
                                                {currentUser.role === 'admin' && (
                                                    <td className="font-mono text-[11px] text-[#94A3B8] tracking-widest blur-[2px] hover:blur-none transition-all cursor-help">
                                                        {u.plainPassword || '••••••••'}
                                                    </td>
                                                )}
                                                <td className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <button onClick={() => handleEditClick(u)} className="p-2 text-[#94A3B8] hover:text-[#346eea] hover:bg-orange-50 rounded-lg transition-all" title="Modify Privilege"><Edit size={16} /></button>
                                                        <button onClick={() => handleDeleteUser(u._id)} className="p-2 text-[#94A3B8] hover:text-[#EF4444] hover:bg-red-50 rounded-lg transition-all" title="Revoke Access"><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white border-2 border-[#D1FAE5] rounded-[40px] p-24 text-center space-y-6 shadow-sm max-w-2xl mx-auto mt-10">
                    <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-500 mx-auto border border-rose-100">
                        <ShieldAlert size={40} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-[#064E3B] uppercase tracking-tighter">Security Violation</h2>
                        <p className="text-[#94A3B8] text-sm font-bold mt-2 leading-relaxed">
                            Your account does not possess the requisite privilege level<br/> 
                            to access the administrative operations kernel.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
