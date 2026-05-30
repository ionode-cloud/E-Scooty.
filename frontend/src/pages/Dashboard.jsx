import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChevronRight, Trash2, Bike, MapPin, FileText, Siren } from 'lucide-react';
import '../index.css';



const Dashboard = () => {
    const [dashboards, setDashboards] = useState([]);
    const [activeEmergencyDeviceIds, setActiveEmergencyDeviceIds] = useState([]);
    const sirenActive = activeEmergencyDeviceIds.length > 0;
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const navigate = useNavigate();

    const handleDeleteDashboard = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm('Delete this vehicle dashboard?')) return;
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            const token = localStorage.getItem('token');
            await axios.delete(`${apiUrl}/api/dashboards/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDashboards(prev => prev.filter(d => d._id !== id));
            // Clear saved selection if the deleted dashboard was selected
            const savedId = localStorage.getItem('lastSelectedDashboardId');
            if (savedId === id) localStorage.removeItem('lastSelectedDashboardId');
        } catch (err) {
            alert('Failed to delete dashboard.');
        }
    };

    useEffect(() => {
        const fetchDashboards = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL;
                const token = localStorage.getItem('token');
                const res = await axios.get(`${apiUrl}/api/dashboards`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setDashboards(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                console.error("Dashboard fetch error:", err);
            }
        };
        fetchDashboards();
    }, []);

    // Poll localStorage for active emergency alerts (fleet-wide siren indicator)
    useEffect(() => {
        const timer = setInterval(() => {
            const expiryMapStr = localStorage.getItem('emergencyExpiries');
            const expiryMap = expiryMapStr ? JSON.parse(expiryMapStr) : {};
            const now = Date.now();
            const activeIds = Object.keys(expiryMap).filter(id => expiryMap[id] > now);
            if (JSON.stringify(activeIds) !== JSON.stringify(activeEmergencyDeviceIds)) {
                setActiveEmergencyDeviceIds(activeIds);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [activeEmergencyDeviceIds]);

    // Global socket for emergency alerts
    useEffect(() => {
        const socket = io(import.meta.env.VITE_API_URL);
        socket.on('emergency-alert', (alert) => {
            setActiveEmergencyDeviceIds(prev => Array.from(new Set([...prev, alert.deviceId])));
            const expiry = Date.now() + 120000;
            const currentExpiries = JSON.parse(localStorage.getItem('emergencyExpiries') || '{}');
            currentExpiries[alert.deviceId] = expiry;
            localStorage.setItem('emergencyExpiries', JSON.stringify(currentExpiries));
        });
        return () => { socket.off('emergency-alert'); socket.disconnect(); };
    }, []);



    // Navigate to monitor page for a selected dashboard
    const handleSelectDashboard = (d) => {
        localStorage.setItem('lastSelectedDashboardId', d._id);
        navigate('/monitor');
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="space-y-10">
                <header className="flex flex-col gap-2">
                    <h1 className={`text-3xl font-black tracking-tight transition-all duration-500 ${sirenActive ? 'text-red-600 animate-pulse' : 'text-[#064E3B]'}`}>
                        {sirenActive && <Siren size={28} className="inline-block mr-3 animate-ping" />}
                        E-Vehicle Dashboards
                    </h1>
                    <p className={`text-sm font-medium transition-colors ${sirenActive ? 'text-red-500' : 'text-[#6B7280]'}`}>
                        {sirenActive ? 'CRITICAL ALERT DETECTED IN FLEET - INITIALIZE MONITOR IMMEDIATELY' : 'Select a connected vehicle node to initialize telemetry stream.'}
                    </p>
                </header>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {dashboards.map((d) => {
                        const isAlerting = activeEmergencyDeviceIds.includes(d.deviceId);
                        return (
                            <div
                                key={d._id}
                                onClick={() => handleSelectDashboard(d)}
                                    className={`bg-white border-2 rounded-[32px] group cursor-pointer transition-all duration-500 p-8 relative overflow-hidden
                                        ${isAlerting ? 'animate-pulse border-red-500 shadow-[0_0_40px_rgba(255,0,0,0.3)]' : 'border-[#D1FAE5] hover:border-[#10B981] hover:shadow-2xl hover:shadow-emerald-500/10'}
                                    `}
                                >
                                    {isAlerting && (
                                        <div className="absolute inset-0 bg-red-500/5 pointer-events-none animate-pulse"></div>
                                    )}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#10B981]/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                                    <div className="flex justify-between items-start relative z-10">
                                        <div className="flex gap-4">
                                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#10B981] text-white shadow-lg shadow-emerald-500/20 group-hover:rotate-12 transition-transform duration-500">
                                                <Bike size={28} />
                                            </div>
                                            {isAdmin && (
                                                <button
                                                    onClick={(e) => handleDeleteDashboard(d._id, e)}
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-100 transition-all opacity-0 group-hover:opacity-100 mt-2"
                                                    title="Delete Dashboard"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                        <div className="bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 h-fit">
                                            <span className="text-[10px] font-black tracking-widest uppercase text-[#10B981]">SYSTEM READY</span>
                                        </div>
                                    </div>
                                    <div className="mt-8 relative z-10">
                                        <h3 className="text-xl font-black text-[#064E3B] leading-tight group-hover:text-[#10B981] transition-colors">{d.dashboardName}</h3>
                                        <div className="space-y-1.5 mt-3">
                                            <div className="flex items-center gap-2 text-[#6B7280]">
                                                <MapPin size={12} className="text-[#10B981]" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">{d.location || 'Fleet Node'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[#6B7280]">
                                                <FileText size={12} className="text-[#10B981]" />
                                                <span className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">By: </span>
                                                <span className="text-[10px] font-bold text-[#064E3B] lowercase">{d.user?.email || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-8 flex items-center justify-between relative z-10 pt-6 border-t border-[#D1FAE5]">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-[#94A3B8] uppercase tracking-widest">Device ID</span>
                                            <span className="text-xs font-mono font-bold text-[#064E3B]">{d.deviceId}</span>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-[#10B981]/10 flex items-center justify-center text-[#10B981] group-hover:bg-[#10B981] group-hover:text-white transition-all duration-300">
                                            <ChevronRight size={18} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
        </div>
    );
};

export default Dashboard;
