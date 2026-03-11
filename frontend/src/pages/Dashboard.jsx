import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/dashboard.css';
import Nav from '../components/Nav';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
    const { user, logOut } = useAuth();
    const navigate = useNavigate();
    
    // Get user info from local auth object
    const userName = user?.name || 'Guest';
    const userEmail = user?.email || '';
    const userId = user?.id || '000000';

    const handleLogin = () => {
        navigate('/login');
    };

    const handleLogout = () => {
        logOut();
        navigate('/');
    };

    return (
        <div className="min-h-screen pb-28 font-sans selection:bg-primary/30">
            {/* Header */}
            <div className="flex items-center pt-6 justify-between">
                <div className="flex-1 flex flex-col items-center">
                    <h2 className="frosted-text text-lg font-bold tracking-tight">Bio Sentinal</h2>
                    <span className="text-[9px] uppercase tracking-[0.2em] text-neon-green font-bold">Dashboard</span>
                </div>
            </div>
            
            <main className="max-w-md mx-auto px-5 py-6 flex flex-col gap-8">    
                {/* Profile Card */}
                <section className="glass-panel rounded-3xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -mr-16 -mt-16"></div>
                    <div className="flex items-center gap-5 mb-8">
                        <div className="relative">
                            <div 
                                className="w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center neon-outline border-primary"
                            >
                                <span className="material-symbols-outlined text-white text-4xl">person</span>
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-primary text-black w-6 h-6 flex items-center justify-center rounded-lg shadow-[0_0_10px_rgba(57,255,20,0.5)]">
                                <span className="material-symbols-outlined text-[14px] font-bold">verified</span>
                            </div>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-white">{userName}</h2>
                            <p className="text-white/50 text-xs font-medium tracking-wide">{userEmail}</p>
                            <div className="mt-3 flex items-center gap-2">
                                <span className="bg-primary/20 text-primary text-[9px] font-black px-2 py-0.5 rounded border border-primary/30 uppercase tracking-widest">Lvl 1</span>
                                <p className="text-[9px] text-white/30 uppercase tracking-[0.1em]">BS-{userId.slice(-6)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="glass-pill flex flex-col items-center justify-center py-3">
                            <p className="text-lg font-bold text-white leading-none">0</p>
                            <p className="text-[9px] text-white/40 font-bold uppercase mt-1.5 tracking-tighter">Reports</p>
                        </div>
                        <div className="glass-pill flex flex-col items-center justify-center py-3 border-primary/30">
                            <p className="text-lg font-bold text-primary glow-text-primary leading-none">0</p>
                            <p className="text-[9px] text-primary/60 font-bold uppercase mt-1.5 tracking-tighter">Verified</p>
                        </div>
                        <div className="glass-pill flex flex-col items-center justify-center py-3">
                            <p className="text-lg font-bold text-white leading-none">0</p>
                            <p className="text-[9px] text-white/40 font-bold uppercase mt-1.5 tracking-tighter">Points</p>
                        </div>
                    </div>
                </section>

                {/* Badges Scroll */}
                <section>
                    <div className="flex items-center justify-between mb-5 px-1">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Mastery Badges</h3>
                    </div>
                    <div className="flex gap-5 overflow-x-auto no-scrollbar pb-4 -mx-5 px-5">
                        <div className="flex flex-col items-center min-w-[72px] gap-3 opacity-40 grayscale">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center border-2 border-white/10">
                                <span className="material-symbols-outlined text-white/40 text-3xl">eco</span>
                            </div>
                            <p className="text-[10px] font-medium text-white/30 tracking-tight">Start</p>
                        </div>
                    </div>
                </section>

                {/* Live Feed */}
                <section className="flex flex-col gap-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 px-1">Live Feed</h3>
                    
                    <div className="glass-panel bg-white/[0.03] border-white/5 p-4 rounded-2xl">
                        <p className="text-white/60 text-sm text-center py-8">
                            No activity yet. Start exploring!
                        </p>
                    </div>
                </section>
            </main>

            <div className="max-w-md mx-auto px-5 pb-6">
                {user ? (
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full glass-panel rounded-2xl py-3 text-sm font-bold uppercase tracking-[0.2em] text-white/80 transition-all duration-300 hover:text-accent-pink"
                    >
                        Logout
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleLogin}
                        className="w-full glass-panel rounded-2xl py-3 text-sm font-bold uppercase tracking-[0.2em] text-white/80 transition-all duration-300 hover:text-primary"
                    >
                        Login
                    </button>
                )}
            </div>

            <Nav />
        </div>
    );
}

export default Dashboard;
