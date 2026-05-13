import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, AlertCircle, Bike, X, Mail, ShieldCheck, KeyRound, CheckCircle2, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ─── Reset Access Modal ─────────────────────────────────────────────────────
const STEPS = { EMAIL: 'email', OTP: 'otp', PASSWORD: 'password', DONE: 'done' };

const ResetModal = ({ onClose }) => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const [step, setStep] = useState(STEPS.EMAIL);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');

    const clearMessages = () => { setError(''); setInfo(''); };

    // Step 1 – request OTP
    const handleSendOtp = async (e) => {
        e.preventDefault();
        clearMessages();
        setLoading(true);
        try {
            const res = await axios.post(`${apiUrl}/api/auth/forgot-password`, { email });
            setInfo(res.data.message);
            setStep(STEPS.OTP);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Step 1.5 – resend OTP
    const handleResend = async () => {
        clearMessages();
        setLoading(true);
        try {
            const res = await axios.post(`${apiUrl}/api/auth/forgot-password`, { email });
            setInfo('A new OTP has been sent to your email.');
        } catch (err) {
            setError(err.response?.data?.message || 'Resend failed.');
        } finally {
            setLoading(false);
        }
    };

    // Step 2 – verify OTP (just advance to password step; real verify happens at reset)
    const handleVerifyOtp = (e) => {
        e.preventDefault();
        clearMessages();
        if (otp.length !== 6) return setError('Enter the 6-digit OTP sent to your email.');
        setStep(STEPS.PASSWORD);
    };

    // Step 3 – reset password
    const handleReset = async (e) => {
        e.preventDefault();
        clearMessages();
        if (newPassword !== confirmPassword) return setError('Passwords do not match.');
        if (newPassword.length < 6) return setError('Password must be at least 6 characters.');
        setLoading(true);
        try {
            const res = await axios.post(`${apiUrl}/api/auth/reset-password`, { email, otp, newPassword });
            setInfo(res.data.message);
            setStep(STEPS.DONE);
        } catch (err) {
            setError(err.response?.data?.message || 'Reset failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const stepMeta = {
        [STEPS.EMAIL]: { icon: <Mail size={22} />, title: 'Reset Access', subtitle: "Enter your registered email and we'll send a verification code." },
        [STEPS.OTP]: { icon: <ShieldCheck size={22} />, title: 'Enter Code', subtitle: `A 6-digit OTP was sent to ${email}` },
        [STEPS.PASSWORD]: { icon: <KeyRound size={22} />, title: 'New Password', subtitle: 'Choose a strong new password for your account.' },
        [STEPS.DONE]: { icon: <CheckCircle2 size={22} />, title: 'Access Restored', subtitle: 'Your password has been reset successfully.' },
    };

    const meta = stepMeta[step];

    return (
        /* Backdrop */
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 100,
                background: 'rgba(2,20,15,0.72)', backdropFilter: 'blur(6px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                className="modal-container"
                style={{
                    background: '#fff', borderRadius: '24px', padding: '40px 36px',
                    width: '100%', maxWidth: '420px', boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
                    position: 'relative', animation: 'modalIn 0.25s cubic-bezier(.22,1,.36,1)',
                }}
            >
                {/* Close */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '18px', right: '18px',
                        background: '#F1F5F9', border: 'none', borderRadius: '10px',
                        width: '34px', height: '34px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B',
                    }}
                >
                    <X size={18} />
                </button>

                {/* Header */}
                <div style={{ marginBottom: '28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{
                            width: '44px', height: '44px', borderRadius: '12px',
                            background: step === STEPS.DONE ? '#DCFCE7' : '#ECFDF5',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#10B981',
                        }}>
                            {meta.icon}
                        </div>
                        {/* Step dots */}
                        <div style={{ display: 'flex', gap: '5px', marginLeft: 'auto', paddingRight: '36px' }}>
                            {[STEPS.EMAIL, STEPS.OTP, STEPS.PASSWORD].map((s, i) => (
                                <div key={s} style={{
                                    width: step === s ? '18px' : '7px', height: '7px',
                                    borderRadius: '4px', transition: 'all 0.3s',
                                    background: [STEPS.EMAIL, STEPS.OTP, STEPS.PASSWORD, STEPS.DONE].indexOf(step) >= i
                                        ? '#10B981' : '#E2E8F0',
                                }} />
                            ))}
                        </div>
                    </div>
                    <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 900, color: '#064E3B' }}>{meta.title}</h2>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>{meta.subtitle}</p>
                </div>

                {/* Error / Info banners */}
                {error && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        background: '#FEF2F2', border: '1px solid #FECACA',
                        borderRadius: '12px', padding: '12px 14px',
                        color: '#DC2626', fontSize: '12px', fontWeight: 700, marginBottom: '18px',
                    }}>
                        <AlertCircle size={16} /> {error}
                    </div>
                )}
                {info && !error && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        background: '#F0FDF4', border: '1px solid #BBF7D0',
                        borderRadius: '12px', padding: '12px 14px',
                        color: '#15803D', fontSize: '12px', fontWeight: 700, marginBottom: '18px',
                    }}>
                        <CheckCircle2 size={16} /> {info}
                    </div>
                )}

                {/* ── Step 1: Email ── */}
                {step === STEPS.EMAIL && (
                    <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>Operator Email</label>
                            <input
                                type="email" required autoFocus
                                value={email} onChange={e => setEmail(e.target.value)}
                                placeholder="operator@fleet.io"
                                style={inputStyle}
                            />
                        </div>
                        <button type="submit" disabled={loading} style={btnStyle(loading)}>
                            {loading ? <span className="btn-spinner" /> : 'Send OTP Code'}
                        </button>
                    </form>
                )}

                {/* ── Step 2: OTP ── */}
                {step === STEPS.OTP && (
                    <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>6-Digit OTP</label>
                            <input
                                type="text" required autoFocus maxLength={6}
                                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                                placeholder="· · · · · ·"
                                style={{ ...inputStyle, letterSpacing: '0.5em', fontSize: '22px', textAlign: 'center', fontWeight: 900 }}
                            />
                        </div>
                        <button type="submit" disabled={loading} style={btnStyle(loading)}>
                            {loading ? <span className="btn-spinner" /> : 'Verify Code'}
                        </button>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button type="button" onClick={() => { clearMessages(); setOtp(''); setStep(STEPS.EMAIL); }}
                                style={ghostBtn}>
                                <ArrowLeft size={14} /> Back
                            </button>
                            <button type="button" onClick={handleResend} disabled={loading}
                                style={{ ...ghostBtn, color: '#10B981' }}>
                                <RefreshCw size={13} /> Resend OTP
                            </button>
                        </div>
                    </form>
                )}

                {/* ── Step 3: New Password ── */}
                {step === STEPS.PASSWORD && (
                    <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>New Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPw ? 'text' : 'password'} required autoFocus
                                    value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Min. 6 characters"
                                    style={{ ...inputStyle, paddingRight: '44px' }}
                                />
                                <button type="button" onClick={() => setShowPw(!showPw)}
                                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>Confirm Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showConfirm ? 'text' : 'password'} required
                                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="Repeat password"
                                    style={{ ...inputStyle, paddingRight: '44px' }}
                                />
                                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        <button type="submit" disabled={loading} style={btnStyle(loading)}>
                            {loading ? <span className="btn-spinner" /> : 'Reset Password'}
                        </button>
                        <button type="button" onClick={() => { clearMessages(); setStep(STEPS.OTP); }}
                            style={ghostBtn}>
                            <ArrowLeft size={14} /> Back
                        </button>
                    </form>
                )}

                {/* ── Done ── */}
                {step === STEPS.DONE && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '56px', marginBottom: '8px' }}>🎉</div>
                        <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '24px' }}>
                            You can now log in with your new password.
                        </p>
                        <button onClick={onClose} style={btnStyle(false)}>Back to Login</button>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes modalIn {
                    from { opacity:0; transform:scale(0.93) translateY(16px); }
                    to   { opacity:1; transform:scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
};

// Shared inline styles for the modal
const inputStyle = {
    width: '100%', padding: '13px 16px', border: '1.5px solid #E2E8F0',
    borderRadius: '12px', fontSize: '15px', outline: 'none',
    fontFamily: 'inherit', background: '#F8FAFC', color: '#0F172A',
    boxSizing: 'border-box', transition: 'border-color 0.2s',
};
const btnStyle = (loading) => ({
    width: '100%', padding: '14px', background: loading ? '#6EE7B7' : '#10B981',
    color: '#fff', border: 'none', borderRadius: '12px',
    fontSize: '14px', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    transition: 'background 0.2s',
});
const ghostBtn = {
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#64748B', fontSize: '12px', fontWeight: 700,
    padding: '6px 2px',
};

// ─── Main Login Page ─────────────────────────────────────────────────────────
const Login = () => {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showReset, setShowReset] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            const res = await axios.post(`${apiUrl}/api/auth/login`, { email, password });
            const { token, user } = res.data;
            login(token, user);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="auth-page-container">
                <div className="auth-glass-card animate-in zoom-in duration-700">
                    {/* Form Side */}
                    <div className="auth-form-side">
                        <div className="white-login-card">
                            <div className="mb-10">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-xl bg-[#10B981] flex items-center justify-center text-white">
                                        <Bike size={24} />
                                    </div>
                                    <span className="text-[11px] font-black text-[#10B981] uppercase tracking-[0.3em]">Fleet Terminal</span>
                                </div>
                                <h1 className="text-4xl font-black text-[#064E3B] tracking-tighter">Login</h1>
                            </div>

                            {error && (
                                <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold mb-8">
                                    <AlertCircle size={18} />
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleLogin} className="space-y-6">
                                <div className="auth-input-group">
                                    <label className="auth-label">Operator Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="auth-field"
                                        placeholder="operator@fleet.io"
                                        required
                                    />
                                </div>

                                <div className="auth-input-group">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="auth-label mb-0">Secure Key</label>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="auth-field pr-12"
                                            placeholder="••••••••"
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#10B981]"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                    <div className="text-right mt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowReset(true)}
                                            className="text-[11px] font-bold text-[#10B981] hover:underline bg-transparent border-none cursor-pointer p-0"
                                        >
                                            Reset Access?
                                        </button>
                                    </div>
                                </div>

                                <button type="submit" disabled={loading} className="auth-main-btn mt-6">
                                    {loading ? <span className="btn-spinner"></span> : "Establish Link"}
                                </button>
                            </form>

                            <div className="mt-12 text-center text-xs font-bold text-[#64748B]">
                                New Operator?{' '}
                                <Link to="/register" className="text-[#10B981] hover:underline font-black">Register Node</Link>
                            </div>
                        </div>
                    </div>

                    {/* Hero Side */}
                    <div className="auth-hero-side hidden lg:flex">
                        <img
                            src="/scooty.png"
                            alt="E-Scooty Asset"
                            className="scooty-static"
                        />
                    </div>
                </div>
            </div>

            {showReset && <ResetModal onClose={() => setShowReset(false)} />}
        </>
    );
};

export default Login;
