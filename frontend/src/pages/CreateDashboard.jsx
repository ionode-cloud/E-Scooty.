import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    PlusCircle, Cpu, MapPin, CheckCircle2, AlertCircle, Sparkles, ChevronRight, User,
    ShieldCheck, MonitorCheck, LayoutGrid, Bike, Mail
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CreateDashboard = () => {
    const { user } = useAuth();
    const [dashboardName, setDashboardName] = useState('');
    const [deviceId, setDeviceId] = useState('');
    const [email, setEmail] = useState(user?.email || '');
    const [password, setPassword] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [createdParticleId, setCreatedParticleId] = useState('');
    const [devices, setDevices] = useState([]);

    useEffect(() => {
        if (user?.email) setEmail(user.email);
    }, [user]);

    useEffect(() => {
        const fetchDevices = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL ;
                const res = await axios.get(`${apiUrl}/api/devices`);
                setDevices(res.data);
            } catch (error) {
                console.error("Error fetching devices", error);
            }
        };
        fetchDevices();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        setCreatedParticleId('');

        try {
            const apiUrl = import.meta.env.VITE_API_URL ;
            const res = await axios.post(
                `${apiUrl}/api/dashboards`,
                { dashboardName, deviceId, email, password, description }
            );

            setCreatedParticleId(res.data.dashboard.particleId);
            setSuccess('Dashboard initialized successfully!');
            setDashboardName(''); setDeviceId(''); setEmail(''); setPassword(''); setDescription('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create dashboard.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#064E3B] rounded-xl flex items-center justify-center text-white shadow-lg">
                        <Bike size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-[#064E3B] tracking-tight">Create Dashboard</h1>
                        <div className="flex flex-wrap items-center gap-3 mt-1">
                            <div className="flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                <Mail size={10} className="text-[#10B981]" />
                                <span className="text-[10px] font-black text-[#10B981] lowercase">{user?.email || 'initializing...'}</span>
                            </div>
                            <div className="w-1 h-1 rounded-full bg-[#CBD5E1]"></div>
                            <span className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.2em]">CONFIGURATION HANDSHAKE</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alerts */}
            {error && <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold flex items-center gap-3 animate-in fade-in duration-300"><AlertCircle size={18}/> {error}</div>}
            {success && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-bold space-y-3 animate-in fade-in duration-300">
                    <div className="flex items-center gap-3"><CheckCircle2 size={18}/> {success}</div>
                    {createdParticleId && (
                        <div className="ml-7 p-3 bg-white border border-emerald-200 rounded-lg flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-[#94A3B8]">Security Key (Particle ID)</span>
                            <span className="font-mono text-emerald-700 font-bold">{createdParticleId}</span>
                        </div>
                    )}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Device Config */}
                    <div className="saas-card p-8 flex flex-col gap-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-[#F1F5F9]">
                            <Cpu size={18} className="text-[#22C55E]" />
                            <h3 className="text-sm font-black text-[#064E3B] uppercase tracking-wider">Node Identification</h3>
                        </div>

                        <div className="space-y-5 flex-1">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Linked Hardware Node</label>
                                <select 
                                    className="auth-input font-bold"
                                    value={deviceId} 
                                    onChange={e => setDeviceId(e.target.value)} 
                                    required
                                >
                                    <option value="">-- Select Registered Device --</option>
                                    {devices.map(d => (
                                        <option key={d._id} value={d.deviceId}>{d.deviceName} [{d.deviceId}]</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Dashboard Alias</label>
                                <input type="text" className="auth-input" placeholder="e.g. Model S Chassis #1" value={dashboardName} onChange={e => setDashboardName(e.target.value)} required />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Telemetry Metadata</label>
                                <textarea className="auth-input h-24 resize-none" placeholder="Provide additional context for this dashboard..." value={description} onChange={e => setDescription(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Account Config */}
                    <div className="saas-card p-8 flex flex-col gap-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-[#F1F5F9]">
                            <User size={18} className="text-[#22C55E]" />
                            <h3 className="text-sm font-black text-[#064E3B] uppercase tracking-wider">Ownership & Permissions</h3>
                        </div>

                        <div className="space-y-5 flex-1">
                            <p className="text-xs text-[#6B7280] font-medium leading-relaxed">
                                Assign this dashboard to a user account. If the email doesn't exist, a new profile will be provisioned automatically.
                            </p>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Authorized Email</label>
                                <input type="email" className="auth-input" placeholder="operator@fleet.io" value={email} onChange={e => setEmail(e.target.value)} required />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Secure Access Phrase</label>
                                <input type="password" className="auth-input" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                            </div>

                            <div className="p-4 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl flex items-start gap-3 mt-4">
                                <ShieldCheck size={18} className="text-emerald-500 mt-0.5" />
                                <div>
                                    <p className="text-[10px] font-black text-[#064E3B] uppercase tracking-widest">End-to-End Encryption</p>
                                    <p className="text-[10px] text-[#6B7280] mt-1 font-medium leading-relaxed">Dashboards are isolated per user. Security keys are required for hardware handshake.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button type="submit" disabled={loading} className="primary-btn h-14 min-w-[280px] flex items-center justify-center gap-3">
                        {loading ? <span className="btn-spinner"></span> : (
                            <>
                                <Sparkles size={18} />
                                <span className="uppercase tracking-widest font-black">Generate Workstation</span>
                                <ChevronRight size={18} />
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateDashboard;
