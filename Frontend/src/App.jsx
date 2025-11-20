import React, { useState, useEffect, useCallback } from 'react'; 
import { 
  LayoutDashboard, MessageSquare, AlertTriangle, CheckCircle, 
  BarChart3, User, ShieldAlert, ArrowRight, Flag, RefreshCw, XCircle,
  LogOut, TrendingUp, Users, Clock, ChevronLeft
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';

// --- CONFIGURATION ---
const API_URL = "http://127.0.0.1:8000";

// --- MOCK ANALYTICS DATA (Unchanged) ---
const ACTIVITY_DATA = [
  { name: 'Mon', emails: 12 },
  { name: 'Tue', emails: 19 },
  { name: 'Wed', emails: 3 },
  { name: 'Thu', emails: 25 },
  { name: 'Fri', emails: 14 },
];
const SENTIMENT_DATA = [
  { name: 'Positive', value: 35, color: '#4ade80' }, 
  { name: 'Neutral', value: 25, color: '#94a3b8' },  
  { name: 'Negative', value: 40, color: '#f87171' },  
];
const INTENT_DATA_CHART = [ // Correct chart data variable
  { name: 'Refund Requests', value: 45, fill: '#8884d8' },
  { name: 'Login Issues', value: 25, fill: '#82ca9d' },
  { name: 'Shipping Delay', value: 20, fill: '#ffc658' },
  { name: 'Other', value: 10, fill: '#ff8042' },
];

// --- STATIC FILTER OPTIONS ---
const PRIORITY_FILTERS = [
    { value: 'high', label: 'High Priority', color: 'bg-red-600 text-white' },
    { value: 'medium', label: 'Medium Priority', color: 'bg-yellow-500 text-white' },
    { value: 'low', label: 'Low Priority', color: 'bg-green-500 text-white' },
];
const INTENT_FILTERS = [
    { value: 'refund', label: 'Refunds' },
    { value: 'tech', label: 'Login/Tech' }, // Changed value from 'login' to 'tech' for better filtering
    { value: 'billing', label: 'Billing' },
];


// --- SUB-COMPONENTS (Defined outside App to prevent focus/re-render bugs) ---

const LoginScreen = ({ 
    loginModalOpen, setLoginModalOpen, selectedRole, setSelectedRole, 
    performLogin, loginEmail, setLoginEmail, loginPass, setLoginPass 
}) => (
    <div className="h-screen w-full bg-slate-900 flex items-center justify-center relative overflow-hidden">
        {/* Abstract Background */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-600 rounded-full blur-3xl"></div>

        {/* MAIN CARDS */}
        {!loginModalOpen ? (
             <div className="z-10 text-center max-w-4xl w-full p-4">
                <div className="mb-12 flex flex-col items-center">
                    <div className="p-4 bg-slate-800 rounded-2xl mb-6 shadow-2xl border border-slate-700">
                        <ShieldAlert className="w-16 h-16 text-blue-500" />
                    </div>
                    <h1 className="text-6xl font-bold text-white mb-4 tracking-tight">CodeBharat</h1>
                    <p className="text-slate-400 text-xl">Next-Gen Intelligent Email Triage Platform</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <button onClick={() => {
                        setSelectedRole('agent');
                        setLoginModalOpen(true);
                        setLoginEmail('agent@codebharat.com'); // Auto-fill for demo
                        setLoginPass('');
                    }}
                        className="group relative bg-slate-800/50 backdrop-blur-sm border border-slate-700 hover:border-blue-500 p-10 rounded-3xl transition-all hover:shadow-blue-500/20 hover:shadow-2xl text-left overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <User className="text-blue-400" size={28} />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3">Agent Portal</h3>
                            <p className="text-slate-400">Triage incoming tickets, manage queues, and execute AI-driven resolutions.</p>
                        </div>
                    </button>

                    <button onClick={() => {
                        setSelectedRole('team_member');
                        setLoginModalOpen(true);
                        setLoginEmail('admin@codebharat.com'); // Auto-fill for demo
                        setLoginPass('');
                    }}
                        className="group relative bg-slate-800/50 backdrop-blur-sm border border-slate-700 hover:border-purple-500 p-10 rounded-3xl transition-all hover:shadow-purple-500/20 hover:shadow-2xl text-left overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Users className="text-purple-400" size={28} />
                            </div>
                            <h3 className="2xl font-bold text-white mb-3">Admin Console</h3>
                            <p className="text-slate-400">Monitor system health, review compliance escalations, and analytics.</p>
                        </div>
                    </button>
                </div>
            </div>
        ) : (
            // LOGIN FORM MODAL
            <div className="z-20 bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md animate-fade-in-up">
                <button onClick={() => setLoginModalOpen(false)} className="flex items-center text-slate-400 hover:text-white mb-6 text-sm font-medium">
                    <ChevronLeft size={16} className="mr-1"/> Back to Role Selection
                </button>
                
                <h2 className="text-2xl font-bold text-white mb-1">
                    {selectedRole === 'agent' ? 'Agent Login' : 'Admin Access'}
                </h2>
                <p className="text-slate-400 mb-6 text-sm">Enter your credentials to access the secure environment.</p>

                <form onSubmit={performLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                        <input 
                            type="email" 
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            placeholder="name@codebharat.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                        <input 
                            type="password" 
                            value={loginPass}
                            onChange={(e) => setLoginPass(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            placeholder="••••••••"
                        />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg mt-2">
                        Authenticate & Enter
                    </button>
                </form>
            </div>
        )}
    </div>
);

const Sidebar = ({ userRole, loginEmail, syncEmails, handleLogout, view, setView, loading }) => (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen fixed left-0 top-0 z-50 shadow-xl border-r border-slate-800">
      <div className="p-6 text-xl font-bold flex items-center gap-2 text-blue-400 border-b border-slate-800">
        <ShieldAlert className="w-6 h-6" /> CodeBharat
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        <button onClick={() => setView('dashboard')} 
          className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all ${view === 'dashboard' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}>
          <LayoutDashboard size={20} /> Dashboard
        </button>
        <button onClick={() => setView('analytics')} 
          className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all ${view === 'analytics' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}>
          <BarChart3 size={20} /> Analytics
        </button>
      </nav>

      <div className="p-4 bg-slate-950 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-4 p-2 bg-slate-900 rounded-lg border border-slate-800">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${userRole === 'agent' ? 'bg-blue-500' : 'bg-purple-500'}`}>
                {userRole === 'agent' ? 'A' : 'T'}
            </div>
            <div className="overflow-hidden">
                <p className="text-xs text-white font-bold truncate">{userRole === 'agent' ? 'Agent' : 'Admin'}</p>
                <p className="text-[10px] text-slate-500 truncate">Online • {loginEmail}</p>
            </div>
        </div>

        <button 
            onClick={syncEmails}
            className="w-full py-2.5 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md transition-all flex items-center justify-center gap-2 mb-3"
        >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Sync GMail Inbox
        </button>

        <button onClick={handleLogout} className="w-full py-2 text-xs text-slate-500 hover:text-red-400 flex items-center justify-center gap-2 transition-colors">
            <LogOut size={12} /> Sign Out
        </button>
      </div>
    </div>
);

const AnalyticsView = () => (
    <div className="flex-1 p-8 bg-slate-50 h-screen overflow-y-auto ml-64">
        <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <TrendingUp className="text-blue-600" /> Performance Analytics
        </h1>
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-slate-500 text-xs font-bold uppercase">Total Emails Processed</p>
                        <h3 className="text-3xl font-bold text-slate-900 mt-1">1,284</h3>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><MessageSquare size={20} /></div>
                </div>
                <span className="text-green-600 text-xs font-bold flex items-center">↑ 12% from last week</span>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <p className="text-slate-500 text-xs font-bold uppercase">Avg. Response Time</p>
                        <h3 className="text-3xl font-bold text-slate-900 mt-1">1h 42m</h3>
                    </div>
                    <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><Clock size={20} /></div>
                </div>
                <span className="text-green-600 text-xs font-bold flex items-center">↓ 8% improvement</span>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                 <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-slate-500 text-xs font-bold uppercase">Compliance Flags</p>
                        <h3 className="text-3xl font-bold text-red-600 mt-1">24</h3>
                    </div>
                    <div className="p-2 bg-red-50 rounded-lg text-red-600"><ShieldAlert size={20} /></div>
                </div>
                <span className="text-red-500 text-xs font-bold flex items-center">Requires Review</span>
            </div>
        </div>
        
        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-slate-700 font-bold mb-2">Top Customer Issues</h3>
                <p className="text-xs text-slate-400 mb-6">45% of all tickets are related to Refund Requests</p>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={INTENT_DATA_CHART} margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} />
                            <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px'}} />
                            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                                {INTENT_DATA_CHART.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-slate-700 font-bold mb-6">Sentiment Distribution</h3>
                <div className="h-64 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={SENTIMENT_DATA} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                {SENTIMENT_DATA.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* Charts Row 2 (Volume) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
            <h3 className="text-slate-700 font-bold mb-6">Incoming Email Volume (Last 5 Days)</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ACTIVITY_DATA}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis dataKey="name" type="category" hide/>
                        <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px'}} />
                        <Bar dataKey="emails" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>
);

const EmailList = ({ emails, loading, fetchEmails, filter, setFilter, selectedEmail, setSelectedEmail, getSentimentStyles, getPriorityColor }) => (
    <div className="w-4/12 bg-white border-r border-slate-200 h-screen flex flex-col fixed left-64 top-0 z-0">
        <div className="p-5 border-b border-slate-200 bg-white z-10">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-800">Inbox <span className="text-slate-400 text-sm font-normal">({emails.length})</span></h2>
                <button onClick={fetchEmails} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><RefreshCw size={16}/></button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {/* NEW FILTER: Intent */}
                <select 
                    onChange={(e) => setFilter(e.target.value)} 
                    value={INTENT_FILTERS.some(f => f.value === filter) ? filter : 'all'}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border appearance-none cursor-pointer ${['refund', 'tech', 'billing'].includes(filter) ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                    <option value="all">All Intents</option>
                    {INTENT_FILTERS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                </select>

                {/* NEW FILTER: Priority */}
                <select 
                    onChange={(e) => setFilter(e.target.value)} 
                    value={PRIORITY_FILTERS.some(f => f.value === filter) ? filter : 'all'}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border appearance-none cursor-pointer ${['high', 'medium', 'low'].includes(filter) ? 'bg-red-100 text-red-700 border-red-300' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                    <option value="all">All Priority</option>
                    {PRIORITY_FILTERS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                </select>

                {/* OLD/SENTIMENT FILTERS */}
                <button onClick={() => setFilter('negative')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${filter === 'negative' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-600 border-slate-200 hover:bg-orange-50'}`}>Negative Tone</button>
            </div>
        </div>
        <div className="flex-1 overflow-y-auto">
            {loading ? (
                <div className="divide-y divide-slate-100 p-4">
                    <div className="animate-pulse h-20 bg-slate-100 rounded mb-2"></div>
                    <div className="animate-pulse h-20 bg-slate-100 rounded mb-2"></div>
                    <div className="animate-pulse h-20 bg-slate-100 rounded"></div>
                </div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {emails.map(email => (
                        <div key={email.id} onClick={() => setSelectedEmail(email)}
                            className={`p-5 cursor-pointer hover:bg-blue-50 transition-all border-l-4 ${selectedEmail?.id === email.id ? 'bg-blue-50 border-blue-600 shadow-inner' : 'border-transparent'}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-slate-900 truncate w-3/4 text-sm">{email.sender_email}</span>
                                <span className="text-[10px] text-slate-400 font-mono">12:40 PM</span>
                            </div>
                            <h3 className="text-sm font-medium text-slate-700 mb-3 line-clamp-1">{email.subject_line}</h3>
                            <div className="flex gap-2 flex-wrap">
                                {/* PRIORITY TAG (NEWLY ADDED) */}
                                {email.analysis?.urgency_score && (
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded capitalize flex items-center gap-1 ${getPriorityColor(email.analysis.urgency_score)}`}>
                                        {email.analysis.urgency_score}
                                    </span>
                                )}
                                {/* SENTIMENT TAG */}
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded capitalize border ${getSentimentStyles(email.analysis?.sentiment)}`}>
                                    {email.analysis?.sentiment || 'neutral'}
                                </span>
                                {/* ESCALATION STATUS */}
                                {email.escalated_to && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 rounded flex items-center gap-1"><User size={10} /> Escalated</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
);

const EmailDetail = ({ selectedEmail, userRole, handleEscalate, getSentimentStyles }) => {
    if (!selectedEmail) return (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50 ml-64 h-screen border-l border-slate-200">
            <div className="bg-white p-8 rounded-full shadow-sm mb-6 animate-bounce-slow">
                <MessageSquare size={64} className="text-blue-100 fill-blue-50" />
            </div>
            <h2 className="text-xl font-bold text-slate-700 mb-2">No Conversation Selected</h2>
            <p className="text-sm text-slate-500 max-w-xs text-center leading-relaxed">Select an incoming email from the inbox to view AI analysis.</p>
        </div>
    );

    const analysis = selectedEmail.analysis || {};
    const entities = selectedEmail.analysis?.extracted_entities || {};
    const detectedIntent = entities.intent || 'N/A';

    return (
        <div className="flex-1 flex h-screen overflow-hidden bg-slate-50 ml-[calc(16rem+33.333333%)]"> 
            <div className="w-7/12 h-full flex flex-col bg-white shadow-xl z-10 border-r border-slate-200">
                <div className="p-8 overflow-y-auto flex-1">
                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                            {selectedEmail.sender_email[0].toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 leading-tight">{selectedEmail.subject_line}</h1>
                            <p className="text-sm text-slate-500 mt-1">From: <span className="font-medium text-slate-900">{selectedEmail.sender_email}</span></p>
                        </div>
                    </div>
                    <div className="text-slate-700 whitespace-pre-wrap leading-relaxed text-base font-light">
                        {selectedEmail.body_content}
                    </div>
                </div>
            </div>

            <div className="w-5/12 h-full flex flex-col bg-slate-50 border-l border-slate-200">
                <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider"><MessageSquare size={16} /> AI Intelligence</div>
                    <div className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">GPT-4o</div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {analysis.compliance_flag && (
                        <div className="bg-red-50 border border-red-200 p-4 rounded-xl shadow-sm flex gap-3">
                            <ShieldAlert className="text-red-600 w-6 h-6 flex-shrink-0 mt-1" />
                            <div><h4 className="font-bold text-red-800 text-sm">Policy Violation</h4><p className="text-xs text-red-700 mt-1">{analysis.compliance_reason}</p></div>
                        </div>
                    )}

                    {/* NEW: CACHE RETRIEVAL AUGMENTATION */}
                    {analysis.suggested_resolution && (
                         <div className="bg-yellow-50 border border-yellow-200 p-5 rounded-xl shadow-sm relative overflow-hidden group">
                            <h4 className="text-xs font-bold text-yellow-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Clock size={16} /> Prior Resolution Found
                            </h4>
                            <p className="text-sm text-slate-800 font-medium mb-2">
                                Intent Match: <span className="capitalize">{analysis.suggested_resolution.intent.replace(/_/g, ' ')}</span>
                            </p>
                            <p className="text-sm text-slate-600 leading-relaxed italic">
                                Solution: {analysis.suggested_resolution.resolution}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-2">
                                Resolved on: {new Date(analysis.suggested_resolution.resolved_at).toLocaleDateString()}
                            </p>
                        </div>
                    )}

                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Executive Summary</h4>
                        <p className="text-slate-800 text-sm leading-relaxed">{analysis.summary_text}</p>
                        <button className="mt-4 text-[10px] text-slate-400 hover:text-red-500 flex items-center gap-1"><Flag size={12} /> Report incorrect summary</button>
                    </div>
                    
                    {/* 5. AGENT ASSIST (CO-PILOT) - NEWLY ADDED */}
                    <div className="mt-auto pt-4 pb-8">
                        <div className={`p-5 rounded-xl border shadow-sm ${userRole === 'agent' ? 'bg-blue-50 border-blue-100' : 'bg-green-50 border-green-100'}`}>
                            <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex justify-between">
                                <span className={userRole === 'agent' ? 'text-blue-700' : 'text-green-700'}>
                                    AI Recommended Action
                                </span>
                            </h4>
                            
                            <div className="mb-3">
                                <p className="text-sm font-bold text-slate-800">
                                    {analysis.recommended_action || "Review content"}
                                </p>
                                <p className="text-xs text-slate-500 mt-1 italic">
                                    "{analysis.action_reason || "Standard operating procedure."}"
                                </p>
                            </div>

                            {userRole === 'agent' ? (
                                <button onClick={handleEscalate} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition shadow-md text-sm">
                                    Execute Action <ArrowRight size={16} />
                                </button>
                            ) : (
                                <button onClick={handleEscalate} className="w-full bg-white hover:bg-green-50 text-green-700 border border-green-200 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition shadow-sm text-sm">
                                    Approve & Resolve <CheckCircle size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pl-1">Smart Extraction</h4>
                        {/* Display Detected Intent Separately */}
                        <div className="grid grid-cols-1 gap-2">
                             <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Intent</span>
                                <span className="text-sm font-semibold text-slate-800 capitalize">{detectedIntent.replace(/_/g, ' ')}</span>
                            </div>
                        </div>

                        {/* Display Other Extracted Entities */}
                        {entities && Object.keys(entities).filter(k => k !== 'intent').length > 0 && (
                            <div className="grid grid-cols-1 gap-2 mt-2">
                                {Object.entries(entities).filter(([key]) => key !== 'intent').map(([key, val]) => (
                                    <div key={key} className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">{key.replace(/_/g, ' ')}</span>
                                        <span className="text-sm font-semibold text-slate-800">{val}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {entities && Object.keys(entities).length === 0 && detectedIntent === 'N/A' && (
                            <div className="p-4 bg-slate-100 rounded-lg text-center text-xs text-slate-400 italic border border-slate-200 border-dashed">No entities found.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- MAIN APP COMPONENT ---

const App = () => {
  // --- STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false); 
  const [selectedRole, setSelectedRole] = useState(null); 
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [view, setView] = useState('dashboard'); 
  const [userRole, setUserRole] = useState('agent'); 
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); 
  const [toast, setToast] = useState(null); 

  // --- BROWSER HISTORY HANDLING ---
  useEffect(() => {
    const handleBackButton = (event) => {
      if (isAuthenticated) {
        event.preventDefault();
        handleLogout();
      }
    };
    window.addEventListener('popstate', handleBackButton);
    return () => window.removeEventListener('popstate', handleBackButton);
  }, [isAuthenticated]);

  // --- DATA FETCHING ---
  useEffect(() => {
    // Initial check: Delay fetching until the user authenticates
    if (isAuthenticated) {
        // Delay fetch slightly to give the heavy backend time to initialize
        const timeoutId = setTimeout(fetchEmails, 1000);
        return () => clearTimeout(timeoutId);
    }
  }, [filter, isAuthenticated]); 

  const fetchEmails = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/emails`;
      // --- ADVANCED FILTERING LOGIC ---
      // The filter state can hold 'all', 'negative', or a specific priority/intent value
      if (filter === 'high' || filter === 'medium' || filter === 'low') {
         url += `?filter_priority=${filter}`;
      } else if (filter === 'negative') {
         url += `?filter_sentiment=negative`;
      }
      // Note: Intent filters are handled client-side below.

      const res = await fetch(url);
      if (res.status === 404) {
          throw new Error('Backend endpoints not yet available. Loading models...');
      }
      const rawData = await res.json();

      // --- CLIENT-SIDE FILTERING (For Intent & Sentiment) ---
      let filteredData = rawData;

      if (filter === 'refund' || filter === 'tech' || filter === 'billing') {
        filteredData = rawData.filter(email => {
            const intent = email.analysis?.extracted_entities?.intent?.toLowerCase() || '';
            
            if (filter === 'refund') {
                return intent.includes('refund');
            } else if (filter === 'billing') {
                return intent.includes('billing');
            } else if (filter === 'tech') {
                // FIX: Check for technical_support, login, or account_access
                return intent.includes('login') || intent.includes('tech') || intent.includes('account');
            }
            return true; 
        });
      }

      setEmails(filteredData);
      if (!selectedEmail && filteredData.length > 0) setSelectedEmail(filteredData[0]);

    } catch (error) {
      console.error(error);
      showToast("Backend not ready or offline. Please wait/restart Python server.", "error");
    } finally {
      setLoading(false);
    }
  };

  // --- ACTIONS ---
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000); 
  };

  const syncEmails = async () => {
    setLoading(true); 
    try {
      // ⚠️ CALLS THE NEW SYNC ENDPOINT
      const res = await fetch(`${API_URL}/sync-gmail`, { method: 'POST' }); 
      
      if (res.ok) {
        showToast("Starting GMail Sync. Refreshing...", "success");
        // We call fetchEmails immediately to show the loading bar, and again after a short delay 
        // to show the newly processed emails.
        setTimeout(fetchEmails, 5000); 
      } else {
        // Handle GMail Authentication Error from backend (often 500 or 503)
        const errorData = await res.json();
        showToast(`Sync Failed: ${errorData.detail || 'Check Python Terminal for GMail Auth Error'}`, "error");
      }
    } catch (err) {
      showToast("Connection Failed (Is the Backend Server running?)", "error");
      setLoading(false);
    }
  };

  const handleEscalate = async () => {
    if (!selectedEmail) return;
    try {
        const res = await fetch(`${API_URL}/escalate/${selectedEmail.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email_id: selectedEmail.id, user_role: userRole })
        });
        
        if (res.ok) {
            const backendResponse = await res.json();
            const actionMsg = backendResponse.msg;
            
            showToast(`Success: ${actionMsg}`, "success");
            fetchEmails(); // Refresh list to show updates
        } else {
             // Handle structured error from backend API
            const errorData = await res.json();
            showToast(`Action Failed: ${errorData.detail || 'Server error'}`, "error");
        }
    } catch (err) {
        showToast("Connection failed. Is the Python server running?", "error");
    }
  };

  const performLogin = (e) => {
    e.preventDefault();
    // Updated Validation Logic
    if (loginPass === '123' || loginPass === 'admin123' || loginPass === 'agent123') {
        setUserRole(selectedRole);
        setIsAuthenticated(true);
        setLoginModalOpen(false);
        window.history.pushState({ page: 'dashboard' }, 'Dashboard', '/dashboard');
    } else {
        showToast("Invalid email or password", "error");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setSelectedEmail(null);
    setView('dashboard');
    setLoginModalOpen(false);
    window.history.pushState({ page: 'login' }, 'Login', '/');
  };

  // --- HELPERS ---
  const getSentimentStyles = (sentiment) => {
    switch(sentiment) {
      case 'angry': return 'bg-red-100 text-red-800 border-red-200';
      case 'negative': 
      case 'sad': 
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'positive': 
      case 'grateful':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'urgent': return 'bg-red-600 text-white animate-pulse'; 
      case 'confused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };
  
  const getPriorityColor = (priority) => {
    switch(priority?.toLowerCase()) {
        case 'high': return 'bg-red-600 text-white';
        case 'medium': return 'bg-yellow-500 text-white';
        case 'low': return 'bg-green-500 text-white';
        default: return 'bg-slate-400 text-white';
    }
  };

  // --- RENDER ---
  if (!isAuthenticated) return (
    <div className="flex flex-col h-screen">
        <LoginScreen 
            loginModalOpen={loginModalOpen}
            setLoginModalOpen={setLoginModalOpen}
            selectedRole={selectedRole}
            setSelectedRole={setSelectedRole}
            performLogin={performLogin}
            loginEmail={loginEmail}
            setLoginEmail={setLoginEmail}
            loginPass={loginPass}
            setLoginPass={setLoginPass}
        />
        {toast && (
            <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-lg shadow-2xl text-white font-medium flex items-center gap-3 animate-bounce z-50 ${toast.type === 'success' ? 'bg-slate-900' : 'bg-red-600'}`}>
                {toast.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                {toast.msg}
            </div>
        )}
    </div>
  );

  return (
    <div className="flex font-sans bg-slate-100 text-slate-900 h-screen w-full overflow-hidden">
      <Sidebar 
        userRole={userRole}
        loginEmail={loginEmail}
        syncEmails={syncEmails} // Use syncEmails instead of simulateIncomingEmail
        handleLogout={handleLogout}
        view={view}
        setView={setView}
        loading={loading}
      />
      
      {view === 'dashboard' ? (
        <>
            {/* EMAIL LIST */}
            <EmailList 
                emails={emails}
                loading={loading}
                fetchEmails={fetchEmails}
                filter={filter}
                setFilter={setFilter}
                selectedEmail={selectedEmail}
                setSelectedEmail={setSelectedEmail}
                getSentimentStyles={getSentimentStyles}
                getPriorityColor={getPriorityColor} // Pass the new helper
            />

            {/* EMAIL DETAIL */}
            <EmailDetail 
                selectedEmail={selectedEmail}
                userRole={userRole}
                handleEscalate={handleEscalate}
                getSentimentStyles={getSentimentStyles}
            />
        </>
      ) : (
        <AnalyticsView />
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-lg shadow-2xl text-white font-medium flex items-center gap-3 animate-bounce z-50 ${toast.type === 'success' ? 'bg-slate-900' : 'bg-red-600'}`}>
            {toast.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
            {toast.msg}
        </div>
      )}
    </div>
  );
};

export default App;