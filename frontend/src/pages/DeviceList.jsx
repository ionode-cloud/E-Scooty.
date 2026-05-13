import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Activity, Clock, Search, PlusCircle,
    Trash2, Wifi, WifiOff, AlertCircle,
    MonitorSmartphone, Cpu, Hash, X, MapPin, ChevronRight, Bike
} from 'lucide-react';

const DeviceList = () => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [deviceName, setDeviceName] = useState('');
    const [deviceId, setDeviceId] = useState('');
    const [location, setLocation] = useState('');
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : {};
    const isAdmin = user.role === 'admin';

    const fetchDevices = async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            const res = await axios.get(`${apiUrl}/api/devices`);
            setDevices(res.data);
        } catch (err) {
            console.error('Error fetching devices', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDevices(); }, []);

    const handleAddDevice = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');
        setFormLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            await axios.post(`${apiUrl}/api/devices`, { deviceName, deviceId, location });
            setFormSuccess(`Device added successfully!`);
            setDeviceName(''); setDeviceId(''); setLocation('');
            fetchDevices();
            setTimeout(() => { setFormSuccess(''); setShowForm(false); }, 2000);
        } catch (err) {
            setFormError(err.response?.data?.message || 'Failed to add device.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this device?')) return;
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            await axios.delete(`${apiUrl}/api/devices/${id}`);
            setDevices(prev => prev.filter(d => d._id !== id));
        } catch (err) {
            alert('Failed to delete device.');
        }
    };

    const filtered = devices.filter(d =>
        d.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.location || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#064E3B] shadow-lg shadow-black/10">
                        <Bike size={28} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-[#064E3B] tracking-tight">Hardware Node</h1>
                        <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.2em] mt-1">Fleet Management Console</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#10B981]" />
                        <input
                            type="text"
                            className="w-full bg-white border-2 border-[#D1FAE5] rounded-2xl py-3 pl-12 pr-4 text-sm font-bold text-[#064E3B] focus:outline-none focus:border-[#10B981] transition-all shadow-sm placeholder:text-[#94A3B8]"
                            placeholder="Search device signature..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {isAdmin && (
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="w-12 h-12 rounded-2xl bg-[#10B981] text-white flex items-center justify-center hover:bg-[#059669] transition-all shadow-lg shadow-emerald-500/20"
                        >
                            {showForm ? <X size={20} /> : <PlusCircle size={20} />}
                        </button>
                    )}
                </div>
            </div>

            {/* Registration Form (Slide-in card) */}
            {showForm && (
                <div className="bg-white border-2 border-[#D1FAE5] rounded-[32px] p-8 animate-in slide-in-from-top-4 duration-300 shadow-xl">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 flex items-center justify-center text-[#10B981]">
                            <Cpu size={20} />
                        </div>
                        <h3 className="text-xl font-black text-[#064E3B] tracking-tight">Provision New Node</h3>
                    </div>

                    {formError && <div className="p-4 mb-8 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black uppercase flex items-center gap-3"><AlertCircle size={16} /> {formError}</div>}
                    {formSuccess && <div className="p-4 mb-8 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-black uppercase flex items-center gap-3"><PlusCircle size={16} /> {formSuccess}</div>}

                    <form onSubmit={handleAddDevice} className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Node Name</label>
                            <input type="text" className="auth-input border-[#D1FAE5] focus:border-[#10B981]" value={deviceName} onChange={e => setDeviceName(e.target.value)} placeholder="e.g. Prototype X1" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Hardware ID</label>
                            <input type="text" className="auth-input font-mono border-[#D1FAE5] focus:border-[#10B981]" value={deviceId} onChange={e => setDeviceId(e.target.value)} placeholder="e.g. ESP32_MOD_1" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Location</label>
                            <input type="text" className="auth-input border-[#D1FAE5] focus:border-[#10B981]" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. India" required />
                        </div>
                        <div className="flex items-end">
                            <button type="submit" disabled={formLoading} className="primary-btn w-full h-[48px] rounded-2xl flex items-center justify-center gap-3 bg-[#10B981] hover:bg-[#059669] shadow-lg shadow-emerald-500/10">
                                {formLoading ? <span className="btn-spinner"></span> : <><PlusCircle size={18} /> Provision</>}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Device Table Card */}
            <div className="bg-white border-2 border-[#D1FAE5] rounded-[32px] overflow-hidden shadow-sm">
                <div className="px-8 py-6 border-b border-[#D1FAE5] bg-[#F8FAFC]/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center text-[#10B981]">
                            <Activity size={16} />
                        </div>
                        <h3 className="text-xs font-black text-[#064E3B] uppercase tracking-wider">Registered Hardware Fleet</h3>
                    </div>
                    <span className="text-[10px] font-black text-[#10B981] bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-full uppercase tracking-widest">
                        Node Security Active
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="saas-table">
                        <thead className="bg-[#F8FAFC]">
                            <tr>
                                <th className="text-[#064E3B]">Vehicle Node</th>
                                <th className="text-[#064E3B]">Signature</th>
                                <th className="text-[#064E3B]">Location</th>
                                <th className="text-[#064E3B]">Pulse State</th>
                                <th className="text-[#064E3B]">Diagnostic Time</th>
                                {isAdmin && <th className="text-right text-[#064E3B]">Management</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="py-24 text-center"><div className="btn-spinner border-emerald-100 border-t-[#10B981] mx-auto w-10 h-10 border-4"></div></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={6} className="py-24 text-center">
                                    <Cpu size={48} className="mx-auto mb-6 text-[#D1FAE5]" />
                                    <p className="text-sm font-black text-[#064E3B] uppercase tracking-widest">No Node Detected</p>
                                    <p className="text-xs text-[#94A3B8] mt-2 font-bold">Register hardware to initialize telemetry handshake.</p>
                                </td></tr>
                            ) : (
                                filtered.map((d) => (
                                    <tr key={d._id} className="hover:bg-emerald-50/30 transition-colors group">
                                        <td>
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-[#10B981] border border-emerald-100">
                                                    <Bike size={18} />
                                                </div>
                                                <span className="font-black text-[#064E3B]">{d.deviceName}</span>
                                            </div>
                                        </td>
                                        <td><span className="font-mono text-[11px] font-bold bg-white border border-[#D1FAE5] px-3 py-1.5 rounded-lg text-[#064E3B] shadow-sm">{d.deviceId}</span></td>
                                        <td>
                                            <div className="flex items-center gap-2 text-[#6B7280]">
                                                <MapPin size={12} className="text-[#10B981]" />
                                                <span className="font-bold text-xs">{d.location}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${d.status === 'Online' ? 'bg-[#10B981] shadow-[0_0_8px_#10B981]' : 'bg-rose-500 shadow-[0_0_8px_#F43F5E]'}`}></div>
                                                <span className={`text-[10px] font-black uppercase tracking-wider ${d.status === 'Online' ? 'text-[#10B981]' : 'text-rose-500'}`}>
                                                    {d.status === 'Online' ? 'Handshake Active' : 'Offline'}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2 text-[#94A3B8]">
                                                <Clock size={12} />
                                                <span className="text-[10px] font-mono font-bold">{new Date(d.lastSeen).toLocaleString()}</span>
                                            </div>
                                        </td>
                                        {isAdmin && (
                                            <td className="text-right px-6">
                                                <button onClick={() => handleDelete(d._id)} className="w-10 h-10 rounded-xl flex items-center justify-center text-rose-300 hover:text-rose-600 hover:bg-rose-50 transition-all">
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DeviceList;
