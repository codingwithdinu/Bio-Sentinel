import React from 'react';
import '../css/dashboard.css';
import Nav from '../components/Nav';
import LogoutButton from '../components/LogoutButton';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const StudentDashboard = () => {
    const { user, getRoleEmoji } = useAuth();
    const navigate = useNavigate();
    
    // Updated to check for Firebase's native displayName property first
    const userName = user?.displayName || user?.name || 'Guest';
    const userEmail = user?.email || ''; // Firebase standard property
    
    // Custom properties fetched from your database (Firestore)
    const userRole = user?.role || 'student';
    const college = user?.college || user?.prefs?.college || '';
    const course = user?.course || user?.prefs?.course || '';
    const interests = user?.interests || user?.prefs?.interests || [];

    // Learning resources data
    const learningModules = [
        { id: 1, title: 'Marine Biodiversity Basics', progress: 75, icon: '🌊' },
        { id: 2, title: 'Species Identification 101', progress: 30, icon: '🔍' },
        { id: 3, title: 'Conservation Strategies', progress: 0, icon: '🛡️' },
    ];

    // Upcoming events
    const upcomingEvents = [
        { id: 1, title: 'Beach Cleanup Drive', date: 'Feb 15', type: 'Event' },
        { id: 2, title: 'Species ID Workshop', date: 'Feb 20', type: 'Workshop' },
    ];

    return (
        <div className="min-h-screen pb-28 font-sans selection:bg-primary/30">
            {/* Header */}
            <div className="max-w-screen-xl mx-auto px-4 md:px-8 flex items-center pt-6 justify-between">
                <div className="flex-1 flex flex-col items-center">
                    <h2 className="frosted-text text-lg font-bold tracking-tight">Student Dashboard</h2>
                    <span className="text-[9px] uppercase tracking-[0.2em] text-neon-green font-bold">Bio Sentinel</span>
                </div>
                <div className="text-2xl">
                    {getRoleEmoji(userRole)}
                </div>
            </div>
            
            <main className="max-w-screen-xl mx-auto px-4 md:px-8 py-6">
                <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[360px_1fr] lg:gap-8 lg:items-start">
                {/* Left col — Profile Card */}
                <section className="glass-panel rounded-3xl p-6 relative overflow-hidden lg:sticky lg:top-4">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -mr-16 -mt-16"></div>
                    <div className="flex items-center gap-5 mb-8">
                        <div className="relative">
                            {/* Updated to show Firebase photoURL if available, otherwise fallback to icon */}
                            {user?.photoURL ? (
                                <img 
                                    src={user.photoURL} 
                                    alt="Profile" 
                                    className="w-20 h-20 rounded-2xl object-cover neon-outline border-primary"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center neon-outline border-primary">
                                    <span className="material-symbols-outlined text-white text-4xl">school</span>
                                </div>
                            )}
                            <div className="absolute -bottom-2 -right-2 bg-primary text-black w-6 h-6 flex items-center justify-center rounded-lg shadow-[0_0_10px_rgba(57,255,20,0.5)]">
                                <span className="material-symbols-outlined text-[14px] font-bold">{getRoleEmoji(userRole)}</span>
                            </div>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-white">{userName}</h2>
                            {userEmail && <p className="text-white/40 text-[10px] mb-1 truncate">{userEmail}</p>}
                            <p className="text-white/50 text-xs font-medium tracking-wide capitalize">{userRole}</p>
                            {college && (
                                <p className="text-white/40 text-xs mt-1">{college}</p>
                            )}
                            {course && (
                                <p className="text-white/40 text-xs">{course}</p>
                            )}
                        </div>
                    </div>
                    
                    {/* Interests */}
                    {interests.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6">
                            {interests.slice(0, 4).map(interest => (
                                <span key={interest} className="bg-primary/10 text-primary text-[10px] px-2 py-1 rounded-full border border-primary/20">
                                    {interest}
                                </span>
                            ))}
                        </div>
                    )}
                    
                    <div className="grid grid-cols-3 gap-3">
                        <div className="glass-pill flex flex-col items-center justify-center py-3">
                            <p className="text-lg font-bold text-white leading-none">0</p>
                            <p className="text-[9px] text-white/40 font-bold uppercase mt-1.5 tracking-tighter">Reports</p>
                        </div>
                        <div className="glass-pill flex flex-col items-center justify-center py-3 border-primary/30">
                            <p className="text-lg font-bold text-primary glow-text-primary leading-none">0</p>
                            <p className="text-[9px] text-primary/60 font-bold uppercase mt-1.5 tracking-tighter">Modules</p>
                        </div>
                        <div className="glass-pill flex flex-col items-center justify-center py-3">
                            <p className="text-lg font-bold text-white leading-none">0</p>
                            <p className="text-[9px] text-white/40 font-bold uppercase mt-1.5 tracking-tighter">Points</p>
                        </div>
                    </div>
                </section>

                {/* Right col — remaining content */}
                <div className="flex flex-col gap-8">

                {/* Learning Progress */}
                <section>
                    <div className="flex items-center justify-between mb-5 px-1">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Learning Progress</h3>
                        <button 
                            onClick={() => navigate('/map')}
                            className="text-primary text-[10px] uppercase tracking-wider hover:underline"
                        >
                            View All →
                        </button>
                    </div>
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-5 px-5">
                        {learningModules.map(module => (
                            <div key={module.id} className="glass-panel min-w-[140px] p-4 rounded-2xl flex flex-col gap-3">
                                <div className="text-2xl">{module.icon}</div>
                                <h4 className="text-white text-xs font-bold leading-tight">{module.title}</h4>
                                <div className="w-full bg-white/10 rounded-full h-2">
                                    <div 
                                        className="bg-primary h-2 rounded-full transition-all"
                                        style={{ width: `${module.progress}%` }}
                                    />
                                </div>
                                <p className="text-white/40 text-[10px]">{module.progress}% complete</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Quick Actions */}
                <section className="flex flex-col gap-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 px-1">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => navigate('/report')}
                            className="glass-panel p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-white/5 transition-colors"
                        >
                            <span className="text-2xl">📝</span>
                            <span className="text-white text-xs font-bold">Report Sighting</span>
                        </button>
                        <button 
                            onClick={() => navigate('/map')}
                            className="glass-panel p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-white/5 transition-colors"
                        >
                            <span className="text-2xl">🗺️</span>
                            <span className="text-white text-xs font-bold">Explore Map</span>
                        </button>
                        <button 
                            onClick={() => navigate('/alert')}
                            className="glass-panel p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-white/5 transition-colors"
                        >
                            <span className="text-2xl">🔔</span>
                            <span className="text-white text-xs font-bold">Alerts</span>
                        </button>
                        <button 
                            onClick={() => navigate('/team')}
                            className="glass-panel p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-white/5 transition-colors"
                        >
                            <span className="text-2xl">👥</span>
                            <span className="text-white text-xs font-bold">Community</span>
                        </button>
                    </div>
                </section>

                {/* Upcoming Events */}
                <section className="flex flex-col gap-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 px-1">Upcoming Events</h3>
                    <div className="glass-panel bg-white/[0.03] border-white/5 p-4 rounded-2xl flex flex-col gap-3">
                        {upcomingEvents.length > 0 ? (
                            upcomingEvents.map(event => (
                                <div key={event.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                                        <span className="text-primary text-sm">📅</span>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-white text-xs font-bold">{event.title}</h4>
                                        <p className="text-white/40 text-[10px]">{event.date} • {event.type}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-white/60 text-sm text-center py-4">
                                No upcoming events. Check back later!
                            </p>
                        )}
                    </div>
                </section>

                {/* Live Feed */}
                <section className="flex flex-col gap-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 px-1">Live Feed</h3>
                    <div className="glass-panel bg-white/[0.03] border-white/5 p-4 rounded-2xl">
                        <p className="text-white/60 text-sm text-center py-8">
                            Start exploring to see activity!
                        </p>
                    </div>
                </section>
                <LogoutButton />

                </div>{/* end right col */}
                </div>{/* end grid */}
            </main>

            <Nav />
        </div>
    );
};

export default StudentDashboard;