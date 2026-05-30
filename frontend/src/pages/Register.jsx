import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, AlertCircle, ShieldCheck, Mail, Lock, Bike } from 'lucide-react';

const STEPS = { INFO: 'info', OTP: 'otp', DONE: 'done' };

const Register = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [step, setStep] = useState(searchParams.get('step') === 'otp' ? STEPS.OTP : STEPS.INFO);
    const [email, setEmail] = useState(searchParams.get('email') || '');
    const [password, setPassword] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);

    useEffect(() => {
        if (countdown <= 0) return;
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL ;
            await axios.post(`${apiUrl}/api/auth/register`, { email, password, role: 'user' });
            setStep(STEPS.OTP);
            setCountdown(60);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (countdown > 0) return;
        setError('');
        setLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL ;
            await axios.post(`${apiUrl}/api/auth/send-otp`, { email });
            setCountdown(60);
            setSuccess('OTP resent successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to resend OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index, value) => {
        if (!/^\d?$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`)?.focus();
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        const code = otp.join('');
        if (code.length < 6) return setError('Please enter all 6 digits.');
        setError('');
        setLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL ;
            await axios.post(`${apiUrl}/api/auth/verify-otp`, { email, otp: code });
            setStep(STEPS.DONE);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
            setOtp(['', '', '', '', '', '']);
            document.getElementById('otp-0')?.focus();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page-container">
            <div className="auth-glass-card animate-in zoom-in duration-700">
                {/* Form Side */}
                <div className="auth-form-side">
                    <div className="white-login-card">
                        {step === STEPS.INFO && (
                            <>
                                <div className="mb-10">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-xl bg-[#10B981] flex items-center justify-center text-white">
                                            <Bike size={24} />
                                        </div>
                                        <span className="text-[11px] font-black text-[#10B981] uppercase tracking-[0.3em]">Node Provisioning</span>
                                    </div>
                                    <h1 className="text-4xl font-black text-[#064E3B] tracking-tighter">Register</h1>
                                </div>

                                {error && (
                                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold mb-8">
                                        <AlertCircle size={18} />
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleRegister} className="space-y-6">
                                    <div className="auth-input-group">
                                        <label className="auth-label">Operator Email</label>
                                        <div className="relative">
                                            <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="auth-field pl-12"
                                                placeholder="operator@fleet.io"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="auth-input-group">
                                        <label className="auth-label">Secure Access Key</label>
                                        <div className="relative">
                                            <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="auth-field pl-12 pr-12"
                                                placeholder="Min 6 characters"
                                                required
                                                minLength={6}
                                            />
                                            <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#10B981]" onClick={() => setShowPassword(!showPassword)}>
                                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        </div>
                                    </div>

                                    <button type="submit" disabled={loading} className="auth-main-btn mt-6">
                                        {loading ? <span className="btn-spinner"></span> : "Initialize Node"}
                                    </button>
                                </form>

                                <div className="mt-8 text-center text-xs font-bold text-[#64748B]">
                                    Already an operator?{' '}
                                    <Link to="/login" className="text-[#10B981] hover:underline font-black">Sign in</Link>
                                </div>
                            </>
                        )}

                        {step === STEPS.OTP && (
                            <form onSubmit={handleVerifyOtp} className="space-y-8">
                                <div className="mb-8">
                                    <h2 className="text-3xl font-black text-[#064E3B] tracking-tighter">Handshake</h2>
                                    <p className="text-sm font-bold text-[#64748B] mt-2">Transmit code to: {email}</p>
                                </div>

                                <div className="flex gap-2 justify-center">
                                    {otp.map((digit, i) => (
                                        <input
                                            key={i}
                                            id={`otp-${i}`}
                                            type="text"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(i, e.target.value)}
                                            className={`w-12 h-14 bg-slate-50 border-2 rounded-2xl text-center text-xl font-bold outline-none transition-all ${digit ? 'border-[#10B981] bg-emerald-50 text-[#10B981]' : 'border-slate-100 focus:border-[#10B981]'}`}
                                            autoFocus={i === 0}
                                        />
                                    ))}
                                </div>

                                <button type="submit" disabled={loading || otp.join('').length < 6} className="auth-main-btn">
                                    {loading ? <span className="btn-spinner"></span> : "Confirm Identity"}
                                </button>

                                <button type="button" onClick={handleResendOtp} disabled={countdown > 0} className="w-full text-center text-[10px] font-black text-[#10B981] uppercase tracking-widest hover:underline">
                                    {countdown > 0 ? `Retry in ${countdown}s` : 'Resend Handshake'}
                                </button>
                            </form>
                        )}

                        {step === STEPS.DONE && (
                            <div className="text-center py-10">
                                <div className="w-20 h-20 bg-emerald-50 text-[#10B981] rounded-3xl flex items-center justify-center mx-auto mb-8 animate-bounce">
                                    <ShieldCheck size={44} />
                                </div>
                                <h2 className="text-3xl font-black text-[#064E3B] mb-4">Node Active</h2>
                                <p className="text-sm font-bold text-[#64748B] mb-10">Workstation provisioned successfully.</p>
                                <button className="auth-main-btn" onClick={() => navigate('/login')}>
                                    Go to Login
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Hero Side */}
                <div className="auth-hero-side hidden lg:flex">
                    <img 
                        src="/scooty.png" 
                        alt="E-Vehicle Asset" 
                        className="scooty-static"
                    />
                </div>
            </div>
        </div>
    );
};

export default Register;
