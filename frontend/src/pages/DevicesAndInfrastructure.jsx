import { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, Cpu, ShieldCheck, Wifi, WifiOff, Globe, HardDrive, ChevronRight } from 'lucide-react';

const DevicesAndInfrastructure = () => {
    const [devices, setDevices] = useState([]);
    const [file, setFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('');
    const [gitLink, setGitLink] = useState('');
    const [selectedDevice, setSelectedDevice] = useState('');
    const [deviceStatus, setDeviceStatus] = useState(null);
    const [isLoading, setIsLoading] = useState({ check: false, link: false, upload: false });

    useEffect(() => { fetchDevices(); }, []);

    const fetchDevices = async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL ;
            const res = await axios.get(`${apiUrl}/api/devices`);
            setDevices(res.data);
        } catch (error) { console.error('Error fetching devices', error); }
    };

    const handleCheckDevice = async () => {
        if (!selectedDevice) return alert("Please select a device first");
        setIsLoading(prev => ({ ...prev, check: true }));
        setUploadStatus('QUERYING_HARDWARE_NODE...');
        try {
            const apiUrl = import.meta.env.VITE_API_URL ;
            const res = await axios.get(`${apiUrl}/api/ota/check-device?device=${selectedDevice}`);
            setDeviceStatus(res.data.online);
            setUploadStatus(res.data.online ? '✓ SYSTEM_STATUS: ONLINE' : '⚠ SYSTEM_STATUS: OFFLINE');
        } catch (error) {
            setUploadStatus('COMMUNICATION_ERROR');
        } finally {
            setIsLoading(prev => ({ ...prev, check: false }));
        }
    };

    const handleUpdateViaLink = async () => {
        if (!selectedDevice) return alert("Please select a device first");
        if (!gitLink) return alert("Please enter firmware URL");
        setIsLoading(prev => ({ ...prev, link: true }));
        setUploadStatus('INITIALIZING_REMOTE_FLASH...');
        try {
            const apiUrl = import.meta.env.VITE_API_URL ;
            const res = await axios.post(`${apiUrl}/api/ota/update-link/${selectedDevice}`, { url: gitLink });
            setUploadStatus(`✓ ${res.data}`);
            setGitLink('');
        } catch (error) {
            setUploadStatus(error.response?.data?.message || 'FLASH_FAILED');
        } finally {
            setIsLoading(prev => ({ ...prev, link: false }));
        }
    };

    const handleUploadFirmware = async () => {
        if (!selectedDevice) return alert("Please select a device first");
        if (!file) return alert("Please select a .bin file");
        const formData = new FormData();
        formData.append('firmware', file);
        setIsLoading(prev => ({ ...prev, upload: true }));
        setUploadStatus('TRANSMITTING_BINARY_PAYLOAD...');
        try {
            const apiUrl = import.meta.env.VITE_API_URL ;
            const res = await axios.post(`${apiUrl}/api/ota/upload/${selectedDevice}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUploadStatus(`✓ ${res.data}`);
            setFile(null);
        } catch (error) {
            setUploadStatus(error.response?.data?.message || 'UPLINK_FAILURE');
        } finally {
            setIsLoading(prev => ({ ...prev, upload: false }));
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#111827] rounded-xl flex items-center justify-center text-white shadow-lg">
                        <Cpu size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-[#111827] tracking-tight">OTA</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.2em]">INFRASTRUCTURE</span>
                            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Secure Firmware Deployment & Node Management</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                {/* OTA Control Card */}
                <div className="saas-card p-10 space-y-10">
                    <div className="flex items-center gap-3 pb-6 border-b border-[#F1F5F9]">
                        <ShieldCheck size={20} className="text-[#346eea]" />
                        <h3 className="text-sm font-black text-[#111827] uppercase tracking-[0.2em]">Hardware Dispatch Center</h3>
                    </div>

                    <div className="space-y-8">
                        {/* Device Selection */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Target Hardware Node</label>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <select
                                    className="auth-input font-bold flex-1"
                                    value={selectedDevice}
                                    onChange={(e) => { setSelectedDevice(e.target.value); setDeviceStatus(null); setUploadStatus(''); }}
                                >
                                    <option value="">-- Choose Connected Node --</option>
                                    {devices.map(d => (
                                        <option key={d._id} value={d.deviceId}>{d.deviceName} [{d.deviceId}]</option>
                                    ))}
                                </select>
                                <button
                                    onClick={handleCheckDevice}
                                    disabled={!selectedDevice || isLoading.check}
                                    className="primary-btn px-6 flex items-center justify-center gap-2 min-w-[180px]"
                                >
                                    {isLoading.check ? <div className="btn-spinner"></div> : 'Verify State'}
                                </button>
                            </div>
                            {deviceStatus !== null && (
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-black uppercase tracking-wider ${deviceStatus ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                                    {deviceStatus ? <Wifi size={14} /> : <WifiOff size={14} />}
                                    {deviceStatus ? 'Node is Reachable' : 'Node Unreachable'}
                                </div>
                            )}
                        </div>

                        <div className="h-px bg-[#F1F5F9]"></div>

                        {/* Remote Flash */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Globe size={14} className="text-[#346eea]" />
                                <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Remote Flash (Via URL)</label>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <input
                                    type="text"
                                    className="auth-input flex-1 font-mono text-[11px]"
                                    placeholder="https://assets.io/firmware_v2.bin"
                                    value={gitLink}
                                    onChange={e => setGitLink(e.target.value)}
                                />
                                <button
                                    onClick={handleUpdateViaLink}
                                    disabled={!deviceStatus || isLoading.link || !gitLink}
                                    className={`primary-btn px-6 flex items-center justify-center gap-2 min-w-[180px] ${(!deviceStatus || !gitLink) ? 'opacity-50 grayscale' : ''}`}
                                >
                                    {isLoading.link ? <div className="btn-spinner"></div> : 'Push Link'}
                                </button>
                            </div>
                        </div>

                        <div className="h-px bg-[#F1F5F9]"></div>

                        {/* Direct Binary Uplink */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <HardDrive size={14} className="text-[#346eea]" />
                                <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Direct Binary Uplink (.bin)</label>
                            </div>
                            <div className="group relative border-2 border-dashed border-[#E5E7EB] rounded-2xl p-8 hover:border-[#346eea] hover:bg-[#FFF7ED]/30 transition-all cursor-pointer text-center bg-[#F8FAFC]">
                                <input
                                    type="file" accept=".bin"
                                    onChange={e => setFile(e.target.files[0])}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <Upload className="mx-auto mb-3 text-[#94A3B8] group-hover:text-[#346eea] group-hover:scale-110 transition-all" size={32} />
                                <p className="text-sm font-bold text-[#111827]">Drop Firmware Binary</p>
                                <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest mt-1">Accepts raw .bin files up to 4MB</p>
                                {file && <div className="mt-4 px-3 py-1 bg-white border border-[#346eea]/30 rounded-lg text-xs font-bold text-[#346eea] inline-flex items-center gap-2">📎 {file.name}</div>}
                            </div>
                            <button
                                onClick={handleUploadFirmware}
                                disabled={!deviceStatus || !file || isLoading.upload}
                                className={`primary-btn w-full h-14 flex items-center justify-center gap-3 ${(!deviceStatus || !file) ? 'opacity-50 grayscale' : ''}`}
                            >
                                {isLoading.upload ? <div className="btn-spinner"></div> : (
                                    <>
                                        <Upload size={18} />
                                        <span className="uppercase tracking-[0.2em] font-black">Initiate Binary Flash</span>
                                        <ChevronRight size={18} />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Console Report */}
                    {uploadStatus && (
                        <div className="p-4 bg-[#111827] text-[#059669] rounded-xl font-mono text-[11px] leading-6 border border-white/5 shadow-inner">
                            <span className="text-[#94A3B8] mr-2">LOG:</span> {uploadStatus}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DevicesAndInfrastructure;
