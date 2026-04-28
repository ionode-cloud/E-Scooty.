import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, Server, PlusSquare, Settings, Database, 
    LogOut, Menu, X, Cpu, Bike, Home, PlusCircle, DownloadCloud, ClipboardList, UserCog
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
    const { logout, user } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [currentDate, setCurrentDate] = useState('');
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const updateDate = () => {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            setCurrentDate(new Date().toLocaleDateString('en-US', options));
        };
        updateDate();
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const userEmail = user?.email || 'User';
    const userRole = user?.role || 'Operator';
    const userInitial = userEmail.charAt(0).toUpperCase();

    const allNavLinks = [
        { path: '/', icon: <Bike size={18} />, label: 'Monitor' },
        { path: '/devices', icon: <Cpu size={18} />, label: 'Hardware' },
        { path: '/create-dashboard', icon: <PlusCircle size={18} />, label: 'Setup Node' },
        { path: '/infrastructure', icon: <DownloadCloud size={18} />, label: 'Updates' },
        { path: '/logs', icon: <ClipboardList size={18} />, label: 'Analytics' },
        { path: '/admin', icon: <UserCog size={18} />, label: 'Admin' },
    ];

    const isAdmin = user?.role === 'admin';
    const isOperator = user?.role === 'operator';

    const navLinks = allNavLinks.filter(link => {
        if (isAdmin) return true;
        if (isOperator) return ['/', '/devices', '/logs'].includes(link.path);
        return ['/', '/devices'].includes(link.path);
    });

    return (
        <div className="flex h-screen overflow-hidden bg-[#F5F7FA]">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:static top-0 left-0 z-50 h-full w-64 flex flex-col transform transition-transform duration-300 ease-in-out shadow-sidebar sidebar ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
            >
                {/* Logo Section */}
                <div className="h-20 flex items-center px-6 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#10B981]">
                            <Bike size={20} className="text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white font-bold text-lg leading-tight uppercase tracking-tight">E-Scooty</span>
                            <span className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">monitoring</span>
                        </div>
                    </div>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 py-6 overflow-y-auto">
                    <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.2em] px-8 mb-4">Main Menu</p>
                    <div className="space-y-1">
                        {navLinks.map((link) => {
                            const isActive = location.pathname === link.path;
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`sidebar-item ${isActive ? 'active' : ''}`}
                                >
                                    <span>{link.icon}</span>
                                    {link.label}
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                {/* Bottom Profile Section */}
                <div className="p-6 border-t border-white/5">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 mb-4">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white bg-[#10B981] shrink-0">
                            {userInitial}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-bold truncate">{userEmail}</p>
                            <p className="text-white/40 text-[10px] font-medium">Signed in</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2 text-white/40 hover:text-white transition-colors text-sm font-bold"
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Header */}
                <header className="h-20 bg-white shrink-0 flex items-center px-6 lg:px-10 border-bottom border-[#E5E7EB] z-30">
                    <button className="lg:hidden text-slate-500 mr-4" onClick={() => setSidebarOpen(true)}>
                        <Menu size={24} />
                    </button>

                    <div className="flex-1 flex justify-center lg:justify-start">
                        <p className="text-sm font-bold text-[#064E3B] tracking-tight">
                            {currentDate}
                        </p>
                    </div>
                </header>

                {/* Page Content Holder */}
                <main className="flex-1 overflow-auto p-6 lg:p-10">
                    <div className="w-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
