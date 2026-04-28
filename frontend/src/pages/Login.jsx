import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, AlertCircle, Bike } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const apiUrl = import.meta.env.VITE_API_URL ;
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
                                    <a href="#" className="text-[11px] font-bold text-[#10B981] hover:underline">Reset Access?</a>
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className="auth-main-btn mt-6">
                                {loading ? <span className="btn-spinner"></span> : "Establish Link"}
                            </button>
                        </form>

                        <p className="mt-12 text-center text-xs font-bold text-[#64748B]">
                            New Operator?{' '}
                            <Link to="/register" className="text-[#10B981] hover:underline font-black">Register Node</Link>
                        </p>
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
    );
};

export default Login;
