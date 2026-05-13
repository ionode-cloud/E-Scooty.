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
    MoreHorizontal, TrendingUp, TrendingDown, BellRing, X, Clock, Bike, FileText
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
    const [isSelectingDashboard, setIsSelectingDashboard] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [accidentAlerts, setAccidentAlerts] = useState([]);
    const [emergencyBrakeLogs, setEmergencyBrakeLogs] = useState([]);
    const prevBrakeRef = useRef('RELEASED');
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const handleDeleteDashboard = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm('Delete this vehicle dashboard?')) return;
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            await axios.delete(`${apiUrl}/api/dashboards/${id}`);
            const updated = dashboards.filter(d => d._id !== id);
            setDashboards(updated);
            if (selectedDashboard?._id === id) {
                setSelectedDashboard(updated.length > 0 ? null : null);
                if (updated.length > 0) setIsSelectingDashboard(true);
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
                if (all.length > 1) setIsSelectingDashboard(true);
                else if (all.length === 1) setSelectedDashboard(all[0]);
            } catch (err) {
                console.error("Dashboard fetch error:", err);
            }
        };
        fetchDashboards();
    }, []);

    useEffect(() => {
        if (!selectedDashboard) return;

        const socket = io(import.meta.env.VITE_API_URL);

        socket.on('device-data', (data) => {
            if (data.deviceId === selectedDashboard.deviceId) {
                setLatestData(data);
                // Update history series for charts
                setDeviceData(prev => {
                    const exists = prev.some(d => d._id === data._id || d.timestamp === data.timestamp);
                    if (exists) return prev;
                    return [data, ...prev].slice(0, 100);
                });

                // Live update emergency logs
                if (data.brakeStatus === 'APPLIED') {
                    setEmergencyBrakeLogs(prev => {
                        const exists = prev.some(log => log.id === data._id);
                        if (exists) return prev;
                        return [{
                            id: data._id || Date.now(),
                            timestamp: new Date(data.timestamp),
                            deviceId: data.deviceId
                        }, ...prev].slice(0, 50);
                    });
                }
            }
        });

        const fetchData = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL;
                const historyUrl = `${apiUrl}/api/vehicle/history?deviceId=${selectedDashboard.deviceId}&limit=50`
                    + (startDate ? `&startDate=${startDate}` : '')
                    + (endDate ? `&endDate=${endDate}` : '');

                const [latestRes, historyRes, emergencyRes] = await Promise.all([
                    axios.get(`${apiUrl}/api/vehicle/latest?deviceId=${selectedDashboard.deviceId}`),
                    axios.get(historyUrl),
                    axios.get(`${apiUrl}/api/emergency-logs/${selectedDashboard.deviceId}`)
                ]);

                if (emergencyRes.data) {
                    setEmergencyBrakeLogs(emergencyRes.data.map(log => ({
                        id: log._id,
                        timestamp: new Date(log.timestamp),
                        deviceId: log.deviceId
                    })));
                }

                if (latestRes.data && Object.keys(latestRes.data).length > 0) {
                    const data = latestRes.data;
                    setLatestData(data);

                    // Detect accident
                    if (data.accidentDetected) {
                        const lat = data.gpsLatitude;
                        const lng = data.gpsLongitude;
                        const mapsLink = (lat && lng) ? `https://www.google.com/maps?q=${lat},${lng}` : null;
                        const alert = {
                            id: Date.now(),
                            timestamp: new Date(data.timestamp),
                            deviceId: data.deviceId,
                            mapsLink,
                            lat, lng,
                        };
                        setAccidentAlerts(prev => {
                            const alreadyExists = prev.some(a => Math.abs(new Date(a.timestamp) - new Date(data.timestamp)) < 5000);
                            return alreadyExists ? prev : [alert, ...prev].slice(0, 5);
                        });
                    }

                    // Update brake state ref for other logic if needed
                    prevBrakeRef.current = data.brakeStatus;
                }
                if (historyRes.data) setDeviceData([...historyRes.data].reverse());
            } catch (error) {
                console.error('Error fetching vehicle data:', error);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => {
            clearInterval(interval);
            socket.disconnect();
        };
    }, [selectedDashboard, startDate, endDate]);

    const kpis = [
        {
            icon: <Bike size={24} />,
            label: 'Battery SOC',
            value: `${latestData?.batterySOC ?? '—'}`,
            unit: '%',
            grad: 'grad-emerald',
            sub: 'Live charge status',
        },
        {
            icon: <Shield size={24} />,
            label: 'Battery SOH',
            value: latestData?.batterySOH != null ? `${latestData.batterySOH}` : '—',
            unit: '%',
            grad: 'grad-emerald',
            sub: 'Health indicator',
        },
        {
            icon: <Zap size={24} />,
            label: 'Voltage',
            value: `${latestData?.batteryVoltage ?? '—'}`,
            unit: 'V',
            grad: 'grad-emerald',
            sub: 'Current potential',
        },
        {
            icon: <Activity size={24} />,
            label: 'Accident Sensor',
            value: latestData?.accidentDetected ? 'ALERT' : 'STABLE',
            unit: '',
            grad: latestData?.accidentDetected ? 'grad-dark' : 'grad-emerald',
            sub: latestData?.accidentDetected ? 'Crash Detected!' : 'No impacts detected',
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
    const voltageSeries = [{ name: 'Voltage V', data: deviceData.map(d => ({ x: new Date(d.timestamp).getTime(), y: d.batteryVoltage })) }];
    const sohSeries = [{ name: 'SOH %', data: deviceData.map(d => ({ x: new Date(d.timestamp).getTime(), y: d.batterySOH ?? 0 })) }];

    const rawLat = latestData?.gpsLatitude;
    const rawLng = latestData?.gpsLongitude;
    const lat = parseFloat(rawLat);
    const lng = parseFloat(rawLng);
    const hasGPS = !isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0);
    const mapCenter = hasGPS ? [lat, lng] : [20.5937, 78.9629];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* Accident Alert Banners */}
            {accidentAlerts.length > 0 && (
                <div className="space-y-3">
                    {accidentAlerts.map(alert => (
                        <div key={alert.id} className="flex items-start gap-4 grad-dark text-[#FF4D4D] rounded-2xl px-5 py-4 shadow-2xl border border-white/10 animate-pulse">
                            <BellRing size={22} className="shrink-0 mt-0.5 text-[#FF4D4D]" />
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-sm uppercase tracking-widest text-[#FF4D4D]">🚨 Accident Detected!</p>
                                <p className="text-xs mt-1 text-white/80 font-bold">
                                    Emergency — crash detected at{' '}
                                    {alert.mapsLink
                                        ? <a href={alert.mapsLink} target="_blank" rel="noreferrer" className="underline font-black text-[#FF4D4D]">{alert.mapsLink}</a>
                                        : `Device Node: ${alert.deviceId}`}
                                </p>
                                <p className="text-[10px] text-white/40 mt-1 font-black uppercase tracking-tighter">Event Time: {alert.timestamp.toLocaleString()}</p>
                            </div>
                            <button onClick={() => setAccidentAlerts(prev => prev.filter(a => a.id !== alert.id))} className="text-white/30 hover:text-[#FF4D4D] transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {isSelectingDashboard ? (
                <div className="space-y-10">
                    <header className="flex flex-col gap-2">
                        <h1 className="text-3xl font-black text-[#064E3B] tracking-tight">E-Scooty Dashboards</h1>
                        <p className="text-sm text-[#6B7280] font-medium">Select a connected vehicle node to initialize telemetry stream.</p>
                    </header>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {dashboards.map((d) => (
                            <div
                                key={d._id}
                                onClick={() => { setSelectedDashboard(d); setIsSelectingDashboard(false); }}
                                className="bg-white border-2 border-[#D1FAE5] rounded-[32px] group cursor-pointer hover:border-[#10B981] hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500 p-8 relative overflow-hidden"
                            >
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
                        ))}
                    </div>
                </div>
            ) : (
                <>
                    {/* Header */}
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
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
            
                            <select
                                className="bg-white border border-[#E5E7EB] rounded-2xl px-5 py-3 text-sm font-bold text-[#064E3B] outline-none shadow-sm min-w-[200px]"
                                value={selectedDashboard?._id || ''}
                                onChange={e => setSelectedDashboard(dashboards.find(d => d._id === e.target.value))}
                            >
                                {dashboards.map(d => <option key={d._id} value={d._id}>{d.dashboardName}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="modern-grid-container">
                        {/* KPI Grid */}
                        <div className="space-y-6">
                            <h2 className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.2em]">Quick Metrics</h2>
                            <div className="modern-small-grid">
                                {kpis.map((k, i) => (
                                    <div key={i} className={`modern-kpi ${k.grad}`}>
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
                                ))}
                            </div>
                        </div>

                        {/* Activity Chart */}
                        <div className="space-y-6">
                            <h2 className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.2em]">Activity Chart</h2>
                            <div className="modern-chart-card">
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
                                        <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                                            <MoreHorizontal size={20} />
                                        </button>
                                    </div>
                                </div>
                                <div className="h-[280px] -ml-4">
                                    <Chart
                                        options={barOptions}
                                        series={socSeries}
                                        type="bar" height="100%" width="100%"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Location + Emergency Brake Log */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Live GPS Map */}
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

                        {/* Emergency Brake Log */}
                        <div className="premium-kpi grad-dark p-6 flex flex-col" style={{ minHeight: '420px' }}>
                            <div className="flex items-center gap-3 mb-5 relative z-10">
                                <div className="w-11 h-11 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-[#FF4D4D] border border-white/10">
                                    <Activity size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-black tracking-tight text-[#FF4D4D]">Emergency Brake</h3>
                                    <p className="text-[10px] font-black text-[#FF4D4D]/60 uppercase tracking-[0.2em] mt-0.5">Timestamp Log</p>
                                </div>
                            </div>
                            <div className="flex-1 overflow-hidden relative z-10">
                                {emergencyBrakeLogs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-white/20 gap-2">
                                        <Shield size={32} />
                                        <p className="text-[11px] font-black uppercase tracking-widest">Safe State</p>
                                    </div>
                                ) : (
                                    <div className="overflow-y-auto h-full custom-scrollbar">
                                        <table className="w-full text-left border-separate border-spacing-y-2">
                                            <thead>
                                                <tr>
                                                    <th className="text-[9px] font-black uppercase tracking-widest text-[#FF4D4D]/40 px-4 pb-2">Timestamp</th>
                                                    <th className="text-[9px] font-black uppercase tracking-widest text-[#FF4D4D]/40 px-4 pb-2">Signal</th>
                                                    <th className="text-[9px] font-black uppercase tracking-widest text-[#FF4D4D]/40 px-4 pb-2 text-right">Node</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {emergencyBrakeLogs.map(log => (
                                                    <tr key={log.id} className="group">
                                                        <td className="bg-white/5 border-l border-y border-white/10 rounded-l-xl px-4 py-3 text-[10px] font-mono font-bold text-white/80 group-hover:bg-white/10 transition-colors">
                                                            {log.timestamp.toLocaleTimeString()}
                                                            <span className="block text-[8px] opacity-40 mt-0.5">{log.timestamp.toLocaleDateString()}</span>
                                                        </td>
                                                        <td className="bg-white/5 border-y border-white/10 px-4 py-3 group-hover:bg-white/10 transition-colors">
                                                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-[#FF4D4D]/10 text-[#FF4D4D] border border-[#FF4D4D]/20">
                                                                Engaged
                                                            </span>
                                                        </td>
                                                        <td className="bg-white/5 border-r border-y border-white/10 rounded-r-xl px-4 py-3 text-[10px] font-black text-white/40 text-right group-hover:bg-white/10 transition-colors">
                                                            {log.deviceId}
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
                </>
            )}
        </div>
    );
};

export default Dashboard;
