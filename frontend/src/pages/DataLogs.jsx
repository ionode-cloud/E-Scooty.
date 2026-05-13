import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
    Database, Download, Calendar, FileText, ChevronRight, Clock, 
    MapPin, Activity, Navigation, Eye, Upload, X, ShieldAlert, Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DataLogs = () => {
    const [dashboards, setDashboards] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [deviceData, setDeviceData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { user } = useAuth();
    const isOperator = user?.role === 'operator';
    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        const fetchDashboards = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL ;
                const res = await axios.get(`${apiUrl}/api/dashboards`);
                setDashboards(res.data);
                if (res.data.length > 0) setSelectedDeviceId(res.data[0].deviceId);
            } catch (error) {
                console.error('Error fetching dashboards', error);
            }
        };
        fetchDashboards();
    }, []);

    useEffect(() => {
        if (!selectedDeviceId) return;

        const apiUrl = import.meta.env.VITE_API_URL;
        const socket = io(apiUrl);

        socket.on('device-data', (data) => {
            if (data.deviceId === selectedDeviceId) {
                setDeviceData(prev => {
                    const exists = prev.some(d => d._id === data._id || d.timestamp === data.timestamp);
                    if (exists) return prev;
                    return [data, ...prev].slice(0, 200);
                });
            }
        });

        const fetchHistory = async () => {
            setLoading(true);
            try {
                const url = `${apiUrl}/api/vehicle/history?deviceId=${selectedDeviceId}&limit=100` +
                            (startDate ? `&startDate=${startDate}` : '') +
                            (endDate ? `&endDate=${endDate}` : '');
                const res = await axios.get(url);
                setDeviceData(res.data);
            } catch (error) {
                console.error('Error fetching history', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();

        return () => {
            socket.disconnect();
        };
    }, [selectedDeviceId, startDate, endDate]);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            await axios.post(`${apiUrl}/api/upload-xlsx`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert('Data uploaded successfully!');
            // Refresh data
            const res = await axios.get(`${apiUrl}/api/vehicle/history?deviceId=${selectedDeviceId}&limit=100`);
            setDeviceData(res.data);
        } catch (error) {
            console.error('Upload failed', error);
            alert(error.response?.data?.message || 'Failed to upload XLSX data.');
        } finally {
            setUploading(false);
            e.target.value = ''; // Reset input
        }
    };

    const openDetails = (log) => {
        setSelectedLog(log);
        setIsModalOpen(true);
    };

    const handleClearHistory = async () => {
        if (!window.confirm(`CRITICAL ACTION: This will permanently delete all telemetry logs for node ${selectedDeviceId}. This cannot be undone. Proceed?`)) return;

        setLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            const token = localStorage.getItem('token');
            await axios.delete(`${apiUrl}/api/history/${selectedDeviceId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDeviceData([]);
            alert('Telemetry archive purged successfully.');
        } catch (error) {
            console.error('Clear failed', error);
            alert('Failed to purge history. Admin privileges required.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL ;
            const url = `${apiUrl}/api/download?deviceId=${selectedDeviceId}&startDate=${startDate}&endDate=${endDate}`;
            const response = await axios.get(url, { responseType: 'blob' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(new Blob([response.data]));
            link.setAttribute('download', `EV_Log_${selectedDeviceId}_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error downloading file', error);
            alert('Failed to download telemetry archive.');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#064E3B] shadow-lg shadow-black/10">
                        <Database size={28} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-[#064E3B] tracking-tight">Telemetry Logs</h1>
                        <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.2em] mt-1">Review & Export Historical Records</p>
                    </div>
                </div>
            </div>

            {/* Filter & Action Card */}
            <div className="bg-white border-2 border-[#D1FAE5] rounded-[32px] p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center text-[#10B981]">
                        <FileText size={18} />
                    </div>
                    <h3 className="text-xs font-black text-[#064E3B] uppercase tracking-[0.2em]">Extraction Parameters</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Select Vehicle Node</label>
                        <select className="auth-input font-bold border-[#D1FAE5] focus:border-[#10B981]" value={selectedDeviceId} onChange={e => setSelectedDeviceId(e.target.value)}>
                            {dashboards.map(d => (
                                <option key={d._id} value={d.deviceId}>{d.dashboardName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Start Epoch</label>
                        <div className="relative">
                            <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#10B981]" />
                            <input type="date" className="auth-input pl-11 border-[#D1FAE5] focus:border-[#10B981]" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">End Epoch</label>
                        <div className="relative">
                            <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#10B981]" />
                            <input type="date" className="auth-input pl-11 border-[#D1FAE5] focus:border-[#10B981]" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <button onClick={handleDownload} className="primary-btn h-[44px] flex-1 flex items-center justify-center gap-2 group bg-[#10B981] hover:bg-[#059669]">
                            <Download size={18} className="group-hover:scale-110 transition-transform" />
                            <span className="uppercase tracking-widest font-black text-[11px]">Export</span>
                        </button>
                        {/* Upload — Admin only */}
                        {isAdmin && (
                            <div className="relative flex-1">
                                <input
                                    type="file"
                                    id="xlsx-upload"
                                    className="hidden"
                                    accept=".xlsx"
                                    onChange={handleUpload}
                                    disabled={uploading}
                                />
                                <label
                                    htmlFor="xlsx-upload"
                                    className={`h-[44px] w-full flex items-center justify-center gap-2 cursor-pointer rounded-xl border-2 border-dashed border-[#D1FAE5] text-[#10B981] hover:bg-[#10B981]/5 transition-all ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {uploading ? (
                                        <div className="btn-spinner w-4 h-4 border-2 border-[#10B981]"></div>
                                    ) : (
                                        <Upload size={18} />
                                    )}
                                    <span className="uppercase tracking-widest font-black text-[11px]">
                                        {uploading ? 'Parsing...' : 'Upload'}
                                    </span>
                                </label>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Data Grid Card */}
            <div className="bg-white border-2 border-[#D1FAE5] rounded-[32px] overflow-hidden shadow-sm">
                <div className="px-8 py-6 border-b border-[#D1FAE5] bg-[#F8FAFC]/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center text-[#10B981]">
                            <Activity size={16} />
            
                        </div>
                        <h3 className="text-xs font-black text-[#064E3B] uppercase tracking-wider">Device History Buffer</h3>
                    </div>
                    {/* <span className="text-[10px] font-black text-[#10B981] bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-full uppercase tracking-widest">
                        {deviceData.length} Points Synchronized
                    </span> */}
                    {/* Purge button — Admin only */}
                    {isAdmin && (
                        <button 
                            onClick={handleClearHistory} 
                            disabled={loading}
                            className="w-[44px] h-[44px] rounded-xl flex items-center justify-center bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-100 transition-all shadow-sm group"
                            title="Purge Telemetry History"
                        >
                            <Trash2 size={18} className="group-hover:rotate-12 transition-transform" />
                        </button>
                    )}
                    {isOperator && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full">Read Only</span>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="saas-table">
                        <thead className="bg-[#F8FAFC]">
                            <tr>
                                <th className="text-[#064E3B]">Timestamp</th>
                                <th className="text-[#064E3B]">SOC</th>
                                <th className="text-[#064E3B]">SOH</th>
                                <th className="text-[#064E3B]">Voltage</th>
                                <th className="text-[#064E3B]">Speed</th>
                                <th className="text-[#064E3B]">Emergency Brake</th>
                                <th className="text-[#064E3B]">GPS Payload</th>
                                <th className="text-[#064E3B]">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="py-24 text-center"><div className="btn-spinner border-emerald-100 border-t-[#10B981] mx-auto w-10 h-10 border-4"></div></td></tr>
                            ) : deviceData.length === 0 ? (
                                <tr><td colSpan={7} className="py-24 text-center text-[#94A3B8] font-bold uppercase tracking-widest text-xs">Awaiting node telemetry synchronization...</td></tr>
                            ) : (
                                deviceData.map((d, index) => (
                                    <tr key={index} className="hover:bg-emerald-50/30 transition-colors">
                                        <td className="text-[10px] font-bold text-[#64748B] font-mono">{new Date(d.timestamp).toLocaleString()}</td>
                                        <td className="px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-16 h-2 bg-[#D1FAE5] rounded-full overflow-hidden">
                                                    <div className="h-full bg-[#10B981] rounded-full" style={{ width: `${Math.min(d.batterySOC, 100)}%` }}></div>
                                                </div>
                                                <span className="text-[#064E3B] font-black text-[11px]">{d.batterySOC}%</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="text-xs font-bold text-[#064E3B]">{d.batterySOH ?? 100}%</span>
                                        </td>
                                        <td>
                                            <span className="text-xs font-bold text-[#064E3B]">{d.batteryVoltage}V</span>
                                        </td>
                                        <td>
                                            <span className="text-xs font-bold text-[#064E3B]">{d.speed || 0} km/h</span>
                                        </td>
                                        <td>
                                            <div className="flex flex-col">
                                                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md border w-fit ${d.brakeStatus === 'APPLIED' ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                                    {d.brakeStatus || 'NORMAL'}
                                                </span>
                                                {d.brakeStatus === 'APPLIED' && (
                                                    <span className="text-[8px] font-mono font-bold text-rose-400 mt-1">
                                                        {new Date(d.emergencyBrakeTimestamp || d.timestamp).toLocaleTimeString()}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            {(() => {
                                                const lat = parseFloat(d.gpsLatitude);
                                                const lng = parseFloat(d.gpsLongitude);
                                                const hasGPS = !isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0);
                                                
                                                return hasGPS ? (
                                                    <a
                                                        href={`https://www.google.com/maps?q=${lat},${lng}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors group"
                                                        title={`${lat.toFixed(6)}, ${lng.toFixed(6)}`}
                                                    >
                                                        <Navigation size={10} className="text-[#10B981] group-hover:rotate-12 transition-transform" />
                                                        <span className="text-[10px] font-mono font-bold text-[#10B981] tracking-tight">
                                                            {lat.toFixed(4)}°, {lng.toFixed(4)}°
                                                        </span>
                                                    </a>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100">
                                                        <MapPin size={10} className="text-[#94A3B8]" />
                                                        <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">NO SIGNAL</span>
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td>
                                            <button 
                                                onClick={() => openDetails(d)}
                                                className="w-10 h-10 rounded-xl bg-emerald-50 text-[#10B981] hover:bg-[#10B981] hover:text-white transition-all flex items-center justify-center shadow-sm"
                                                title="View Detailed Log"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detailed View Modal */}
            {isModalOpen && selectedLog && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-[#064E3B]/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
                    <div className="bg-white border-2 border-[#D1FAE5] rounded-[40px] max-w-2xl w-full relative z-10 overflow-hidden animate-in zoom-in duration-300 shadow-2xl">
                        <div className="px-8 py-8 border-b border-[#D1FAE5] flex justify-between items-center bg-[#F8FAFC]">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-[#064E3B] flex items-center justify-center text-white shadow-lg">
                                    <Activity size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-[#064E3B] tracking-tight">Signal Diagnostic</h3>
                                    <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mt-1">NODE HANDSHAKE SUCCESSFUL</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-[#D1FAE5] text-[#6B7280] hover:text-[#064E3B] hover:shadow-md transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-8 grid grid-cols-2 lg:grid-cols-3 gap-6">
                            {[
                                { label: 'SOC', val: `${selectedLog.batterySOC}%` },
                                { label: 'Voltage', val: `${selectedLog.batteryVoltage}V` },
                                { label: 'B-Temp', val: `${selectedLog.batteryTemperature}°C` },
                                { label: 'M-Temp', val: `${selectedLog.motorTemperature}°C` },
                                { label: 'M-RPM', val: (selectedLog.motorRPM ?? 0).toLocaleString() },
                                { label: 'W-RPM', val: (selectedLog.wheelRPM ?? 0).toLocaleString() },
                                { label: 'Loss', val: `${selectedLog.loss}%` },
                                { label: 'Torque', val: `${selectedLog.torque} Nm` },
                                { label: 'Speed', val: `${selectedLog.speed ?? 0} km/h` },
                            ].map((item, i) => (
                                <div key={i} className="p-5 rounded-2xl border border-[#D1FAE5] bg-emerald-50/20">
                                    <p className="text-[9px] font-black text-[#94A3B8] uppercase tracking-[0.2em] mb-1.5">{item.label}</p>
                                    <p className="text-base font-black text-[#064E3B]">{item.val}</p>
                                </div>
                            ))}
                        </div>

                        <div className="px-8 py-8 bg-[#F8FAFC] border-t border-[#D1FAE5]">
                            <div className="p-5 rounded-2xl bg-white border border-[#D1FAE5] flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-[#10B981]">
                                        <MapPin size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-1">GPS Coordinates</p>
                                        <p className="text-sm font-mono font-bold text-[#064E3B]">{selectedLog.gpsLatitude}, {selectedLog.gpsLongitude}</p>
                                    </div>
                                </div>
                                <a 
                                    href={`https://www.google.com/maps?q=${selectedLog.gpsLatitude},${selectedLog.gpsLongitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-6 py-2.5 rounded-full bg-[#10B981] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#059669] transition-all shadow-md shadow-emerald-500/20"
                                >
                                    Open Map
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataLogs;
