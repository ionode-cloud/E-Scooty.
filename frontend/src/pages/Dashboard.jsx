import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import Chart from 'react-apexcharts';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    Zap, MapPin, Battery, AlertTriangle, Shield,
    LayoutGrid, ChevronRight, Trash2, Cpu, Activity,
    MoreHorizontal, TrendingUp, TrendingDown, BellRing, X, Clock, Bike, FileText,
    Thermometer, ShieldAlert, Siren, LifeBuoy, ShieldCheck, Gauge, Power
} from 'lucide-react';
import '../index.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const MapUpdater = ({ lat, lng }) => {
    const map = useMap();
    useEffect(() => {
        if (!isNaN(lat) && !isNaN(lng)) {
            map.flyTo([lat, lng], map.getZoom(), { animate: true, duration: 1.2 });
            setTimeout(() => map.invalidateSize(), 500);
        }
    }, [lat, lng, map]);
    return null;
};

const Dashboard = () => {
    const [dashboards, setDashboards] = useState([]);
    const [selectedDashboard, setSelectedDashboard] = useState(null);
    const [deviceData, setDeviceData] = useState([]);
    const [latestData, setLatestData] = useState(null);
    const [isSelectingDashboard, setIsSelectingDashboard] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [accidentAlerts, setAccidentAlerts] = useState([]);
    const [alertHistory, setAlertHistory] = useState([]);
    const [activeEmergencyDeviceIds, setActiveEmergencyDeviceIds] = useState([]);
    const [emergencyCountdown, setEmergencyCountdown] = useState(0);
    const [ignitionLoading, setIgnitionLoading] = useState(false);
    const sirenActive = activeEmergencyDeviceIds.length > 0;
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const handleIgnitionToggle = async () => {
        if (!selectedDashboard || ignitionLoading) return;
        const currentStatus = latestData?.ignitionStatus || 'OFF';
        const newStatus = currentStatus === 'ON' ? 'OFF' : 'ON';
        setIgnitionLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            const token = localStorage.getItem('token');
            await axios.post(`${apiUrl}/api/escooty/ignition`, {
                deviceId: selectedDashboard.deviceId,
                ignitionStatus: newStatus
            }, { headers: { Authorization: `Bearer ${token}` } });
            // Optimistic UI update
            setLatestData(prev => ({ ...prev, ignitionStatus: newStatus }));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to set ignition status.');
        } finally {
            setIgnitionLoading(false);
        }
    };

    const handleDeleteDashboard = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm('Delete this vehicle dashboard?')) return;
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            const token = localStorage.getItem('token');
            await axios.delete(`${apiUrl}/api/dashboards/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const updated = dashboards.filter(d => d._id !== id);
            setDashboards(updated);
            if (selectedDashboard?._id === id) {
                setSelectedDashboard(null);
                setIsSelectingDashboard(true);
            }
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
                const all = Array.isArray(res.data) ? res.data : [];
                setDashboards(all);

                // Persistence Logic: Restore selected dashboard from localStorage if desired,
                // but keep the selection grid visible on every fresh navigation.
                const savedId = localStorage.getItem('lastSelectedDashboardId');
                if (savedId && all.length > 0) {
                    const saved = all.find(d => d._id === savedId);
                    if (saved) setSelectedDashboard(saved);
                }

                setIsSelectingDashboard(true); // Always show grid first on tab click
            } catch (err) {
                console.error("Dashboard fetch error:", err);
            }
        };
        fetchDashboards();
    }, []);

    // Persistence Logic: Restore selected dashboard and active alerts from localStorage
    useEffect(() => {
        const timer = setInterval(() => {
            const expiryMapStr = localStorage.getItem('emergencyExpiries');
            const expiryMap = expiryMapStr ? JSON.parse(expiryMapStr) : {};
            const now = Date.now();

            // Update active IDs
            const activeIds = Object.keys(expiryMap).filter(id => expiryMap[id] > now);
            if (JSON.stringify(activeIds) !== JSON.stringify(activeEmergencyDeviceIds)) {
                setActiveEmergencyDeviceIds(activeIds);
            }

            // Update countdown for current dashboard
            if (selectedDashboard?.deviceId && expiryMap[selectedDashboard.deviceId]) {
                const remaining = Math.max(0, Math.floor((expiryMap[selectedDashboard.deviceId] - now) / 1000));
                setEmergencyCountdown(remaining);
            } else {
                setEmergencyCountdown(0);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [activeEmergencyDeviceIds, selectedDashboard]);

    // Save selection to localStorage
    useEffect(() => {
        if (selectedDashboard?._id) {
            localStorage.setItem('lastSelectedDashboardId', selectedDashboard._id);
        }
    }, [selectedDashboard]);


    // Audio siren removed per user request

    // Audio logic removed for silent alerts

    useEffect(() => {
        const socket = io(import.meta.env.VITE_API_URL);

        socket.on('emergency-alert', (alert) => {
            // Update active IDs globally
            setActiveEmergencyDeviceIds(prev => Array.from(new Set([...prev, alert.deviceId])));

            // Save expiry to map
            const expiry = Date.now() + 120000;
            const currentExpiries = JSON.parse(localStorage.getItem('emergencyExpiries') || '{}');
            currentExpiries[alert.deviceId] = expiry;
            localStorage.setItem('emergencyExpiries', JSON.stringify(currentExpiries));
        });

        return () => {
            socket.off('emergency-alert');
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        if (!selectedDashboard) return;

        const socket = io(import.meta.env.VITE_API_URL);

        socket.on('device-data', (data) => {
            if (data.deviceId === selectedDashboard.deviceId) {
                const features = selectedDashboard.enabledFeatures || [];
                const filteredData = {
                    _id: data._id,
                    deviceId: data.deviceId,
                    timestamp: data.timestamp,
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                    action: data.action,
                    warningLevel: data.warningLevel,
                    accidentDetected: data.accidentDetected,
                    speed: data.speed,
                    batterySOH: data.batterySOH,
                };
                if (features.includes('batterySOC')) filteredData.batterySOC = data.batterySOC;
                if (features.includes('batteryVoltage')) filteredData.batteryVoltage = data.batteryVoltage;
                if (features.includes('batteryTemperature')) filteredData.batteryTemperature = data.batteryTemperature;
                if (features.includes('motorTemperature')) filteredData.motorTemperature = data.motorTemperature;
                if (features.includes('motorRPM')) filteredData.motorRPM = data.motorRPM;
                if (features.includes('ignitionSwitch')) filteredData.ignitionStatus = data.ignitionStatus;
                if (features.includes('gps')) {
                    filteredData.gpsLatitude = data.gpsLatitude;
                    filteredData.gpsLongitude = data.gpsLongitude;
                }
                if (features.includes('wheelRPM')) filteredData.wheelRPM = data.wheelRPM;
                if (features.includes('loss')) filteredData.loss = data.loss;
                if (features.includes('torque')) filteredData.torque = data.torque;

                setLatestData(filteredData);
                setDeviceData(prev => [filteredData, ...prev].slice(0, 200));
            }
        });

        const fetchData = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL;
                const token = localStorage.getItem('token');
                const [telemetryRes, alertsRes] = await Promise.all([
                    axios.get(`${apiUrl}/api/history/${selectedDashboard.deviceId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(`${apiUrl}/api/alerts/${selectedDashboard.deviceId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);
                setDeviceData(telemetryRes.data);
                setAlertHistory(alertsRes.data);
                if (telemetryRes.data.length > 0) {
                    setLatestData(telemetryRes.data[0]);
                }
            } catch (error) {
                console.error('Error fetching vehicle data:', error);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 5000);

        socket.on('emergency-alert', (alert) => {
            if (selectedDashboard && alert.deviceId === selectedDashboard.deviceId) {
                setAlertHistory(prev => [alert, ...prev].slice(0, 50));
            }
        });

        return () => {
            clearInterval(interval);
            socket.off('device-data');
            socket.off('emergency-alert');
            socket.disconnect();
        };
    }, [selectedDashboard, startDate, endDate]);

    const handleManualEmergency = async (alertType) => {
        if (!selectedDashboard) return;
        if (!window.confirm(`Are you sure you want to trigger a "${alertType}" alert for ${selectedDashboard.deviceId}?`)) return;

        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            const token = localStorage.getItem('token');

            // Trigger local visual immediately via localStorage map
            const expiry = Date.now() + 120000;
            const currentExpiries = JSON.parse(localStorage.getItem('emergencyExpiries') || '{}');
            currentExpiries[selectedDashboard.deviceId] = expiry;
            localStorage.setItem('emergencyExpiries', JSON.stringify(currentExpiries));

            const res = await axios.post(`${apiUrl}/api/escooty/emergency`, {
                deviceId: selectedDashboard.deviceId,
                alertType
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(res.data.message);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to trigger emergency alert.');
        }
    };

    const handleClearAlertHistory = async () => {
        if (!selectedDashboard) return;
        if (!window.confirm("CRITICAL: This will permanently purge the emergency alert history for this node. Proceed?")) return;

        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            const token = localStorage.getItem('token');
            await axios.delete(`${apiUrl}/api/alerts/${selectedDashboard.deviceId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAlertHistory([]);
        } catch (error) {
            console.error("Failed to clear alert history", error);
            alert("Unauthorized: Access Denied.");
        }
    };

    const getTempColor = (temp) => {
        if (temp <= 40) return '#10B981';
        if (temp <= 55) return '#F59E0B';
        return '#EF4444';
    };

    const hasSOC = latestData?.batterySOC !== undefined && latestData?.batterySOC !== null;
    const hasSOH = latestData?.batterySOH !== undefined && latestData?.batterySOH !== null;
    const hasVoltage = latestData?.batteryVoltage !== undefined && latestData?.batteryVoltage !== null;
    const hasSpeed = latestData?.speed !== undefined && latestData?.speed !== null;

    const kpis = [
        {
            icon: <Bike size={24} />,
            label: 'Battery SOC',
            value: hasSOC ? Number(latestData.batterySOC).toFixed(1) : '---',
            unit: '%',
            grad: hasSOC ? (Number(latestData.batterySOC) < 20 ? 'grad-emergency' : 'grad-emerald') : 'grad-dark border border-white/5',
            sub: hasSOC ? (Number(latestData.batterySOC) < 20 ? 'Critical Battery' : 'System Optimized') : '---',
        },
        {
            icon: <Shield size={24} />,
            label: 'Battery SOH',
            value: hasSOH ? Number(latestData.batterySOH).toFixed(1) : '---',
            unit: '%',
            grad: hasSOH ? 'grad-emerald' : 'grad-dark border border-white/5',
            sub: hasSOH ? 'Health indicator' : '---',
        },
        {
            icon: <Zap size={24} />,
            label: 'Voltage',
            value: hasVoltage ? `${latestData.batteryVoltage}` : '---',
            unit: 'V',
            grad: hasVoltage ? 'grad-emerald' : 'grad-dark border border-white/5',
            sub: hasVoltage ? 'Current potential' : '---',
        },
        {
            icon: <Activity size={24} />,
            label: 'Current Speed',
            value: hasSpeed ? Number(latestData.speed).toFixed(1) : '---',
            unit: 'km/h',
            grad: hasSpeed ? 'grad-emerald' : 'grad-dark border border-white/5',
            sub: hasSpeed ? 'Real-time velocity' : '---',
        },
    ];


    const barOptions = {
        chart: { type: 'bar', toolbar: { show: false }, background: 'transparent' },
        theme: { mode: 'dark' },
        plotOptions: {
            bar: {
                borderRadius: 4,
                columnWidth: '60%',
                distributed: false,
                dataLabels: { position: 'top' }
            }
        },
        colors: ['#10B981'],
        xaxis: {
            type: 'datetime',
            labels: { style: { colors: 'rgba(255,255,255,0.5)', fontSize: '10px' } }
        },
        yaxis: { labels: { style: { colors: 'rgba(255,255,255,0.5)', fontSize: '10px' } } },
        grid: { borderColor: 'rgba(255,255,255,0.05)' },
        dataLabels: { enabled: false },
        tooltip: { theme: 'dark' }
    };

    const socSeries = [{ name: 'SOC %', data: deviceData.map(d => ({ x: new Date(d.timestamp).getTime(), y: d.batterySOC })) }];

    const rawLat = latestData?.gpsLatitude;
    const rawLng = latestData?.gpsLongitude;
    const lat = parseFloat(rawLat);
    const lng = parseFloat(rawLng);
    const hasGPS = !isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0);
    const mapCenter = hasGPS ? [lat, lng] : [20.5937, 78.9629];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {isSelectingDashboard || !selectedDashboard ? (
                <div className="space-y-10">
                    <header className="flex flex-col gap-2">
                        <h1 className={`text-3xl font-black tracking-tight transition-all duration-500 ${sirenActive ? 'text-red-600 animate-pulse' : 'text-[#064E3B]'}`}>
                            {sirenActive && <Siren size={28} className="inline-block mr-3 animate-ping" />}
                            E-Scooty Dashboards
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
                                    onClick={() => { setSelectedDashboard(d); setIsSelectingDashboard(false); }}
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
            ) : (
                <div className={`min-h-screen bg-[#F8FAFC] p-4 md:p-8 flex flex-col gap-8 transition-colors duration-500 ${sirenActive ? 'animate-siren' : ''}`}>
                    <>
                        {sirenActive && (
                            <div className="mb-8 p-8 bg-[#FF0000] text-white rounded-[40px] shadow-[0_0_50px_rgba(255,0,0,0.4)] flex flex-col md:flex-row items-center justify-between animate-pulse border-4 border-white/20 gap-6">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center animate-ping">
                                        <Siren size={40} />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black uppercase tracking-tighter">🚨 ACCIDENT DETECTED</h2>
                                        <div className="flex items-center gap-3 mt-1">
                                            <p className="text-sm font-bold opacity-90 uppercase tracking-widest">Vehicle: {selectedDashboard?.dashboardName || selectedDashboard?.deviceId}</p>
                                            <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
                                            <div className="flex items-center gap-2 px-3 py-1 bg-white/20 rounded-lg backdrop-blur-sm border border-white/20">
                                                <Clock size={14} className="animate-spin" style={{ animationDuration: '3s' }} />
                                                <span className="text-sm font-black font-mono">{emergencyCountdown}s REMAINING</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-4">
                                    {hasGPS && (
                                        <a
                                            href={`https://www.google.com/maps?q=${lat},${lng}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-8 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-full font-black text-sm uppercase tracking-widest transition-all border border-white/30 flex items-center gap-2"
                                        >
                                            <MapPin size={18} />
                                            View on Google Maps
                                        </a>
                                    )}
                                    <button
                                        onClick={() => {
                                            setActiveEmergencyDeviceIds(prev => prev.filter(id => id !== selectedDashboard.deviceId));
                                            const latestMap = JSON.parse(localStorage.getItem('emergencyExpiries') || '{}');
                                            delete latestMap[selectedDashboard.deviceId];
                                            localStorage.setItem('emergencyExpiries', JSON.stringify(latestMap));
                                        }}
                                        className="px-8 py-3 bg-white text-[#FF0000] rounded-full font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                                    >
                                        Dismiss Alert
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#064E3B] shadow-lg shadow-black/20">
                                    <Bike size={28} className="text-white" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black text-[#064E3B] tracking-tight">E-Scooty Monitor</h1>
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.2em]">Real-time Telemetry Terminal</p>
                                        <div className="w-1 h-1 rounded-full bg-[#10B981]"></div>
                                        <p className="text-[10px] font-bold text-[#10B981] lowercase">By: {selectedDashboard?.user?.email || 'N/A'}</p>
                                        {selectedDashboard?.emergencyContacts?.length > 0 && (
                                            <>
                                                <div className="w-1 h-1 rounded-full bg-[#CBD5E1]"></div>
                                                <div className="flex items-center gap-1.5 bg-[#F1F5F9] px-2 py-0.5 rounded-md border border-[#E2E8F0]">
                                                    <span className="text-[9px] font-black text-[#64748B] uppercase tracking-wider">SMS Alert To:</span>
                                                    <span className="text-[9px] font-bold text-[#064E3B]">{selectedDashboard.emergencyContacts.join(', ')}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <select
                                className="bg-white border border-[#E5E7EB] rounded-2xl px-5 py-3 text-sm font-bold text-[#064E3B] outline-none shadow-sm min-w-[200px]"
                                value={selectedDashboard?._id || ''}
                                onChange={e => setSelectedDashboard(dashboards.find(d => d._id === e.target.value))}
                            >
                                {dashboards.map(d => <option key={d._id} value={d._id}>{d.dashboardName}</option>)}
                            </select>
                        </div>
                        {(() => {
                            const features = selectedDashboard?.enabledFeatures || [];
                            const cards = [];

                            // ── Ignition Switch card (always first if enabled) ──
                            if (features.includes('ignitionSwitch')) {
                                const hasIgnition = latestData?.ignitionStatus !== undefined && latestData?.ignitionStatus !== null;
                                const ignStatus = hasIgnition ? latestData.ignitionStatus : null;
                                const isOn = hasIgnition && ignStatus === 'ON';
                                cards.push(
                                    <div key="ignitionSwitch" className={`modern-kpi border relative overflow-hidden flex flex-col items-center justify-center transition-all duration-500
                                        ${isOn
                                            ? 'bg-gradient-to-br from-emerald-950/80 via-emerald-900/40 to-[#0a1a12] border-emerald-500/40 shadow-[0_0_50px_rgba(16,185,129,0.2)]'
                                            : 'bg-gradient-to-br from-[#0f172a] via-[#1e293b]/60 to-[#0f172a] border-white/5'}
                                    `}>
                                        {/* Outer glow ring */}
                                        <div className={`absolute inset-0 rounded-[inherit] transition-opacity duration-700 pointer-events-none
                                            ${isOn ? 'opacity-100' : 'opacity-0'}`}
                                            style={{ boxShadow: 'inset 0 0 60px rgba(16,185,129,0.08)' }} />

                                        {/* Power Button Ring */}
                                        <div className="relative flex flex-col items-center justify-center gap-5 py-4">
                                            <button
                                                onClick={handleIgnitionToggle}
                                                disabled={ignitionLoading || !hasIgnition}
                                                aria-label={isOn ? 'Turn ignition OFF' : 'Turn ignition ON'}
                                                className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 focus:outline-none
                                                    ${ignitionLoading ? 'cursor-wait opacity-60' :
                                                        !hasIgnition ? 'cursor-not-allowed opacity-30' :
                                                            isOn
                                                                ? 'hover:scale-105 active:scale-95'
                                                                : 'hover:scale-105 active:scale-95'
                                                    }
                                                `}
                                                style={{
                                                    background: isOn
                                                        ? 'radial-gradient(circle at 35% 35%, #064E3B, #022c22)'
                                                        : 'radial-gradient(circle at 35% 35%, #1e293b, #0f172a)',
                                                    boxShadow: isOn
                                                        ? '0 0 0 4px rgba(16,185,129,0.35), 0 0 0 8px rgba(16,185,129,0.12), 0 8px 30px rgba(16,185,129,0.3), inset 0 2px 4px rgba(255,255,255,0.06)'
                                                        : '0 0 0 4px rgba(255,255,255,0.06), 0 0 0 8px rgba(255,255,255,0.02), 0 8px 20px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.04)'
                                                }}
                                            >
                                                {/* Spinning loader ring */}
                                                {ignitionLoading && (
                                                    <span className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-400 animate-spin" />
                                                )}

                                                {/* Power icon */}
                                                <Power
                                                    size={36}
                                                    strokeWidth={2.5}
                                                    className={`transition-all duration-500 ${isOn ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]' : !hasIgnition ? 'text-white/20' : 'text-white/40'}`}
                                                />

                                                {/* ON pulse ring */}
                                                {isOn && !ignitionLoading && (
                                                    <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: 'rgba(16,185,129,0.4)' }} />
                                                )}
                                            </button>

                                            {/* Label & Status */}
                                            <div className="text-center">
                                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">Ignition Switch</p>
                                                <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all duration-500
                                                    ${!hasIgnition
                                                        ? 'border-white/10 text-white/20 bg-white/5'
                                                        : isOn
                                                            ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                                                            : 'border-red-500/30 text-red-400 bg-red-500/10'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${!hasIgnition ? 'bg-white/20' : isOn ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                                                    {!hasIgnition ? '---' : isOn ? 'Engine ON' : 'Engine OFF'}
                                                </div>
                                                {hasIgnition && (
                                                    <p className="mt-1.5 text-[9px] font-bold text-white/25 uppercase tracking-wider">
                                                        {ignitionLoading ? 'Applying...' : isOn ? 'Tap to turn off' : 'Tap to start'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            // Battery SOC
                            if (features.includes('batterySOC')) {
                                const k = kpis[0];
                                cards.push(
                                    <div key="batterySOC" className={`modern-kpi ${k.grad}`}>
                                        <div className="modern-icon-box">{k.icon}</div>
                                        <div className="mt-auto">
                                            <div className="flex items-baseline gap-1">
                                                <span className="modern-value">{k.value}</span>
                                                <span className="text-sm font-bold opacity-60">{k.unit}</span>
                                            </div>
                                            <p className="modern-label mt-1">{k.label}</p>
                                            <p className="modern-sub-value mt-0.5">{k.sub}</p>
                                        </div>
                                    </div>
                                );
                            }

                            // Battery SOH
                            if (features.includes('batterySOH')) {
                                const sohK = kpis[1];
                                cards.push(
                                    <div key="batterySOH" className={`modern-kpi ${sohK.grad}`}>
                                        <div className="modern-icon-box">{sohK.icon}</div>
                                        <div className="mt-auto">
                                            <div className="flex items-baseline gap-1">
                                                <span className="modern-value">{sohK.value}</span>
                                                <span className="text-sm font-bold opacity-60">{sohK.unit}</span>
                                            </div>
                                            <p className="modern-label mt-1">{sohK.label}</p>
                                            <p className="modern-sub-value mt-0.5">{sohK.sub}</p>
                                        </div>
                                    </div>
                                );
                            }

                            // Battery Voltage
                            if (features.includes('batteryVoltage')) {
                                const k = kpis[2];
                                cards.push(
                                    <div key="batteryVoltage" className={`modern-kpi ${k.grad}`}>
                                        <div className="modern-icon-box">{k.icon}</div>
                                        <div className="mt-auto">
                                            <div className="flex items-baseline gap-1">
                                                <span className="modern-value">{k.value}</span>
                                                <span className="text-sm font-bold opacity-60">{k.unit}</span>
                                            </div>
                                            <p className="modern-label mt-1">{k.label}</p>
                                            <p className="modern-sub-value mt-0.5">{k.sub}</p>
                                        </div>
                                    </div>
                                );
                            }

                            // Current Speed
                            if (features.includes('speed')) {
                                const speedK = kpis[3];
                                cards.push(
                                    <div key="currentSpeed" className={`modern-kpi ${speedK.grad}`}>
                                        <div className="modern-icon-box">{speedK.icon}</div>
                                        <div className="mt-auto">
                                            <div className="flex items-baseline gap-1">
                                                <span className="modern-value">{speedK.value}</span>
                                                <span className="text-sm font-bold opacity-60">{speedK.unit}</span>
                                            </div>
                                            <p className="modern-label mt-1">{speedK.label}</p>
                                            <p className="modern-sub-value mt-0.5">{speedK.sub}</p>
                                        </div>
                                    </div>
                                );
                            }

                            // Battery Temperature
                            if (features.includes('batteryTemperature')) {
                                const hasBatteryTemp = latestData?.batteryTemperature !== undefined && latestData?.batteryTemperature !== null;
                                cards.push(
                                    <div key="batteryTemperature" className="modern-kpi grad-dark border border-white/5 relative overflow-hidden group">
                                        <div className="modern-icon-box bg-white/10 text-white">
                                            <Thermometer size={20} />
                                        </div>
                                        <div className="mt-auto relative z-10">
                                            <div className="flex items-baseline gap-1">
                                                <span className="modern-value">{hasBatteryTemp ? latestData.batteryTemperature : '---'}</span>
                                                <span className="text-sm font-bold opacity-60">°C</span>
                                            </div>
                                            <p className="modern-label mt-1">Battery Temp</p>
                                            <p className="modern-sub-value mt-0.5" style={hasBatteryTemp ? { color: getTempColor(latestData.batteryTemperature) } : { color: 'rgba(255,255,255,0.4)' }}>
                                                {hasBatteryTemp ? (latestData.warningLevel || 'Normal State') : '---'}
                                            </p>
                                        </div>
                                    </div>
                                );
                            }

                            // Animated Scooty Card / System Status Card
                            if (features.includes('systemStatus')) {
                                const isAlerting = selectedDashboard && activeEmergencyDeviceIds.includes(selectedDashboard.deviceId);
                                const hasData = latestData !== null && latestData !== undefined;

                                let cardBgClass = 'grad-dark border-white/5';
                                let cardGlow = 'from-emerald-500/10 to-transparent opacity-50';
                                let iconContainerClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                                let icon = <ShieldCheck size={24} />;
                                let statusLabelColor = 'text-white/40';
                                let statusText = 'SECURE & ACTIVE';
                                let statusTextColor = 'text-emerald-400';
                                let subText = 'Operational Stream Online';
                                let subTextColor = 'text-emerald-500';

                                if (isAlerting) {
                                    cardBgClass = 'bg-rose-600/20 border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.2)]';
                                    cardGlow = 'from-rose-500/20 to-transparent opacity-100';
                                    iconContainerClass = 'bg-rose-500/20 border-rose-500/40 text-rose-500 animate-pulse';
                                    icon = <AlertTriangle size={24} />;
                                    statusLabelColor = 'text-rose-400';
                                    statusText = 'CRITICAL INCIDENT';
                                    statusTextColor = 'text-rose-500 animate-pulse';
                                    subText = 'Emergency Protocols Engaged';
                                    subTextColor = 'text-rose-400';
                                } else if (!hasData) {
                                    cardBgClass = 'grad-dark border-white/5';
                                    cardGlow = 'from-white/5 to-transparent opacity-20';
                                    iconContainerClass = 'bg-white/5 border-white/10 text-white/30';
                                    icon = <Activity size={24} />;
                                    statusLabelColor = 'text-white/30';
                                    statusText = '---';
                                    statusTextColor = 'text-white/30';
                                    subText = 'Awaiting Telemetry Stream';
                                    subTextColor = 'text-white/20';
                                }

                                cards.push(
                                    <div key="systemStatus" className={`modern-kpi border relative overflow-hidden group flex items-center justify-center p-0 transition-all duration-500 ${cardBgClass}`}>
                                        <div className={`absolute inset-0 bg-gradient-to-br transition-opacity duration-500 ${cardGlow}`}></div>
                                        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full text-center p-6">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500 ${iconContainerClass}`}>
                                                    {icon}
                                                </div>
                                                <div>
                                                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${statusLabelColor}`}>System Status</p>
                                                    <p className={`text-xl font-black uppercase tracking-tight mt-0.5 ${statusTextColor}`}>
                                                        {statusText}
                                                    </p>
                                                    <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 opacity-60 ${subTextColor}`}>
                                                        {subText}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <style>{`
                                            @keyframes roadMove {
                                                from { stroke-dashoffset: 20; }
                                                to { stroke-dashoffset: 0; }
                                            }
                                            .animate-road {
                                                animation: roadMove 0.5s linear infinite;
                                            }
                                            @keyframes scootyBounce {
                                                0%, 100% { transform: translateY(0); }
                                                50% { transform: translateY(-2px); }
                                            }
                                            .animate-scooty-bounce {
                                                animation: scootyBounce 0.3s ease-in-out infinite;
                                            }
                                            @keyframes wheelSpin {
                                                from { transform: rotate(0deg); }
                                                to { transform: rotate(360deg); }
                                            }
                                            .animate-wheel-spin {
                                                animation: wheelSpin 0.4s linear infinite;
                                                transform-box: fill-box;
                                                transform-origin: center;
                                            }
                                        `}</style>
                                    </div>
                                );
                            }

                            // 1. Motor RPM card
                            if (features.includes('motorRPM')) {
                                const hasMotorRPM = latestData?.motorRPM !== undefined && latestData?.motorRPM !== null;
                                cards.push(
                                    <div key="motorRPM" className="modern-kpi grad-dark border border-white/5 relative overflow-hidden group">
                                        <div className="modern-icon-box bg-white/10 text-white">
                                            <Gauge size={20} />
                                        </div>
                                        <div className="mt-auto relative z-10">
                                            <div className="flex items-baseline gap-1">
                                                <span className="modern-value">{hasMotorRPM ? latestData.motorRPM : '---'}</span>
                                                <span className="text-sm font-bold opacity-60">RPM</span>
                                            </div>
                                            <p className="modern-label mt-1">Motor RPM</p>
                                            <p className="modern-sub-value mt-0.5" style={hasMotorRPM ? { color: '#10B981' } : { color: 'rgba(255,255,255,0.4)' }}>
                                                {hasMotorRPM ? (latestData.motorRPM > 0 ? 'Motor Running' : 'Motor Idle') : '---'}
                                            </p>
                                        </div>
                                    </div>
                                );
                            }

                            // 2. Motor Temperature card
                            if (features.includes('motorTemperature')) {
                                const hasMotorTemp = latestData?.motorTemperature !== undefined && latestData?.motorTemperature !== null;
                                cards.push(
                                    <div key="motorTemperature" className="modern-kpi grad-dark border border-white/5 relative overflow-hidden group">
                                        <div className="modern-icon-box bg-white/10 text-white">
                                            <Thermometer size={20} />
                                        </div>
                                        <div className="mt-auto relative z-10">
                                            <div className="flex items-baseline gap-1">
                                                <span className="modern-value">{hasMotorTemp ? latestData.motorTemperature : '---'}</span>
                                                <span className="text-sm font-bold opacity-60">°C</span>
                                            </div>
                                            <p className="modern-label mt-1">Motor Temp</p>
                                            <p className="modern-sub-value mt-0.5" style={hasMotorTemp ? { color: getTempColor(latestData.motorTemperature) } : { color: 'rgba(255,255,255,0.4)' }}>
                                                {hasMotorTemp ? (latestData.motorTemperature > 55 ? 'High — Check Motor' : latestData.motorTemperature > 40 ? 'Warm' : 'Normal State') : '---'}
                                            </p>
                                        </div>
                                    </div>
                                );
                            }

                            // (Ignition Switch is already rendered as the first card above)

                            if (cards.length === 0) return null;
                            return (
                                <div className="space-y-4">
                                    <h2 className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.2em] ml-1">Operational Telemetry Overview</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {cards}
                                    </div>
                                </div>
                            );
                        })()}

                        {selectedDashboard?.enabledFeatures?.includes('batterySOC') && (
                            <div className="space-y-4">
                                <h2 className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.2em] ml-1">Live Activity Stream</h2>
                                <div className="modern-chart-card w-full">
                                    <div className="flex justify-between items-start mb-8">
                                        <div>
                                            <h3 className="text-xl font-black text-white tracking-tight">Real-time Data Stream</h3>
                                            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mt-1">Multi-parameter telemetry</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-white">Live</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="h-[260px] -ml-4">
                                        <Chart
                                            options={barOptions}
                                            series={socSeries}
                                            type="bar" height="100%" width="100%"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Location + Emergency History */}
                        {(() => {
                            const features = selectedDashboard?.enabledFeatures || [];
                            const showGPS = features.includes('gps');

                            return (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" style={{ maxHeight: "500px" }}>
                                    {/* Live GPS Map */}
                                    {showGPS && (
                                        <div className="lg:col-span-2 premium-kpi grad-dark p-8 flex flex-col" style={{ minHeight: '420px' }}>
                                            <div className="sparkline-bg opacity-10" />
                                            <div className="flex justify-between items-center mb-4 relative z-10 text-white">
                                                <div className="flex items-center gap-3">
                                                    <div className="glass-icon"><MapPin size={20} /></div>
                                                    <div>
                                                        <h3 className="text-lg font-black tracking-tight">Live Location Tracking</h3>
                                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mt-1">Real-time GPS</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    {hasGPS ? (
                                                        <>
                                                            <p className="text-[10px] font-mono font-bold text-white/80 tracking-widest">{lat.toFixed(6)}°N</p>
                                                            <p className="text-[10px] font-mono font-bold text-white/80 tracking-widest">{lng.toFixed(6)}°E</p>
                                                            <a
                                                                href={`https://www.google.com/maps?q=${lat},${lng}`}
                                                                target="_blank" rel="noreferrer"
                                                                className="text-[10px] text-blue-300 underline font-bold mt-1 inline-block"
                                                            >Open in Google Maps ↗</a>
                                                        </>
                                                    ) : (
                                                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">No Signal</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex-1 rounded-2xl overflow-hidden border border-white/5 bg-[#064E3B] relative z-10" style={{ minHeight: '300px' }}>
                                                {hasGPS ? (
                                                    <MapContainer key={selectedDashboard?.deviceId} center={mapCenter} zoom={15} style={{ height: '100%', width: '100%', minHeight: '300px' }} zoomControl={false}>
                                                        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://carto.com/">CARTO</a>' />
                                                        <MapUpdater lat={lat} lng={lng} />
                                                        <Marker position={[lat, lng]}>
                                                            <Popup>
                                                                <strong>E-Scooty Location</strong><br />
                                                                Lat: {lat.toFixed(6)}<br />
                                                                Lng: {lng.toFixed(6)}<br />
                                                                <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer">📍 Open in Google Maps</a>
                                                            </Popup>
                                                        </Marker>
                                                    </MapContainer>
                                                ) : (
                                                    <div className="h-full w-full flex flex-col items-center justify-center gap-3" style={{ minHeight: '300px' }}>
                                                        <MapPin size={36} className="text-white/20" />
                                                        <p className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em]">Awaiting GPS Signal...</p>
                                                        <div className="w-2 h-2 rounded-full bg-white/20 animate-pulse" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Emergency Alert History */}
                                    <div className={`premium-kpi grad-dark p-6 flex flex-col ${showGPS ? 'lg:col-span-1' : 'lg:col-span-3'}`} style={{ height: '500px' }}>
                                        <div className="flex items-center justify-between mb-5 relative z-10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-11 h-11 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-[#FF4D4D] border border-white/10">
                                                    <BellRing size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-black tracking-tight text-[#FF4D4D]">Emergency History</h3>
                                                    <p className="text-[10px] font-black text-[#FF4D4D]/60 uppercase tracking-[0.2em] mt-0.5">Critical Incident Log</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleClearAlertHistory}
                                                className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-rose-400 hover:bg-rose-400/10 transition-all group"
                                                title="Clear Alert History"
                                            >
                                                <Trash2 size={16} className="group-hover:rotate-12 transition-transform" />
                                            </button>
                                        </div>
                                        <div className="flex-1 overflow-hidden relative z-10">
                                            {alertHistory.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center h-full text-white/20 gap-2">
                                                    <ShieldCheck size={32} />
                                                    <p className="text-[11px] font-black uppercase tracking-widest">No Critical Alerts</p>
                                                </div>
                                            ) : (
                                                <div className="overflow-y-auto h-full custom-scrollbar">
                                                    <table className="w-full text-left border-separate border-spacing-y-2">
                                                        <thead>
                                                            <tr>
                                                                <th className="text-[8px] font-black uppercase tracking-widest text-white/30 px-2 pb-2">Timestamp</th>
                                                                <th className="text-[8px] font-black uppercase tracking-widest text-white/30 px-2 pb-2">Incident</th>
                                                                <th className="text-[8px] font-black uppercase tracking-widest text-white/30 px-2 pb-2 text-center">SOC/SOH</th>
                                                                <th className="text-[8px] font-black uppercase tracking-widest text-white/30 px-2 pb-2 text-center">Spd/Vlt</th>
                                                                <th className="text-[8px] font-black uppercase tracking-widest text-white/30 px-2 pb-2 text-right">SMS</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {alertHistory.map(alert => (
                                                                <tr key={alert._id} className="group">
                                                                    <td className="bg-white/5 border-l border-y border-white/10 rounded-l-xl px-2 py-3 text-[9px] font-mono font-bold text-white/80 group-hover:bg-white/10 transition-colors">
                                                                        {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </td>
                                                                    <td className="bg-white/5 border-y border-white/10 px-2 py-3 group-hover:bg-white/10 transition-colors">
                                                                        <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md bg-[#FF4D4D]/10 text-[#FF4D4D] border border-[#FF4D4D]/20 block w-fit">
                                                                            {alert.action === 'EMERGENCY_TRIGGER' ? 'MANUAL' : alert.action.split(' ')[0]}
                                                                        </span>
                                                                    </td>
                                                                    <td className="bg-white/5 border-y border-white/10 px-2 py-3 text-center group-hover:bg-white/10 transition-colors">
                                                                        <div className="flex flex-col items-center">
                                                                            <span className="text-[10px] font-black text-white">{alert.batterySOC ?? 0}%</span>
                                                                            <span className="text-[7px] font-bold text-white/40 uppercase">H:{alert.batterySOH ?? 100}%</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="bg-white/5 border-y border-white/10 px-2 py-3 text-center group-hover:bg-white/10 transition-colors">
                                                                        <div className="flex flex-col items-center">
                                                                            <span className="text-[10px] font-black text-white">{alert.speed ?? 0}</span>
                                                                            <span className="text-[7px] font-bold text-white/40 uppercase">{alert.batteryVoltage ?? 0}V</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="bg-white/5 border-r border-y border-white/10 rounded-r-xl px-2 py-3 text-[9px] font-black text-right group-hover:bg-white/10 transition-colors">
                                                                        <span className={alert.smsStatus === 'Sent' ? 'text-emerald-400' : 'text-rose-400'}>
                                                                            {alert.smsStatus === 'Sent' ? 'SENT' : 'FAIL'}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
