import React, { useRef, useState } from 'react';
import { Mood, VoiceName, Accent, PartnerProfile, MOOD_EMOJIS, VOICE_META, ACCENT_META, CallbackIntensity, CallLog, ScheduledCall } from '../types';

interface SetupScreenProps {
    profile: PartnerProfile;
    setProfile: React.Dispatch<React.SetStateAction<PartnerProfile>>;
    onStartCall: () => void;
    nextScheduledCall: ScheduledCall | null;
    apiKey: string;
    setApiKey: (key: string) => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ profile, setProfile, onStartCall, nextScheduledCall, apiKey, setApiKey }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'config'>('dashboard');
    const [isValidating, setIsValidating] = useState(false);
    const [apiStatus, setApiStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const historyInputRef = useRef<HTMLInputElement>(null);

    const isDark = profile.theme === 'dark';
    const themeClasses = isDark ? "bg-[#0b0c10] text-slate-100" : "bg-[#f4f7fa] text-slate-900";
    const cardClasses = isDark ? "bg-[#15181e] border-slate-800 shadow-xl" : "bg-white border-slate-200 shadow-sm";
    const inputClasses = isDark ? "bg-[#0b0c10] border-slate-700 focus:border-blue-500 text-white" : "bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900";

    // Relationship Status Logic
    const getRelationshipStatus = (score: number) => {
        if (score < 20) return { label: 'TÓXICA / FRIA ❄️', color: 'text-blue-400', bar: 'bg-blue-500', tip: 'Cuidado! A relação está por um fio. Ligue e peça desculpas ou seja carinhoso.' };
        if (score < 50) return { label: 'ESFRIANDO 🧊', color: 'text-cyan-400', bar: 'bg-cyan-400', tip: 'Vocês estão distantes. Tente puxar um assunto que ela gosta.' };
        if (score < 80) return { label: 'ESTÁVEL 😊', color: 'text-green-400', bar: 'bg-green-500', tip: 'Tudo indo bem. Que tal um elogio surpresa?' };
        return { label: 'APAIXONADA 🔥', color: 'text-pink-500', bar: 'bg-gradient-to-r from-pink-500 to-purple-600', tip: 'O amor está no ar! Continue assim.' };
    };

    const status = getRelationshipStatus(profile.relationshipScore);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setProfile(prev => ({ ...prev, image: reader.result as string }));
            reader.readAsDataURL(file);
        }
    };

    const downloadHistory = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profile.history));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `history_${profile.name}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const uploadHistory = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const logs = JSON.parse(event.target?.result as string);
                if (Array.isArray(logs)) {
                    setProfile(prev => ({ ...prev, history: logs }));
                    alert("Histórico importado com sucesso!");
                }
            } catch (err) {
                alert("Erro ao ler arquivo.");
            }
        };
        reader.readAsText(file);
    };

    const clearHistory = () => {
        if (confirm("Tem certeza? Isso vai apagar a memória da relação.")) {
            setProfile(prev => ({ ...prev, history: [] }));
        }
    };

    const formatTime = (ms: number) => {
        const mins = Math.floor(ms / 60000);
        if (mins < 1) return "Menos de 1 min";
        return `~${mins} min`;
    };

    const validateApiKey = async (key: string) => {
        if (!key) {
            setApiStatus('idle');
            return;
        }
        setIsValidating(true);
        try {
            // Simple test call to verify key
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            if (response.ok) {
                setApiStatus('valid');
            } else {
                setApiStatus('invalid');
            }
        } catch (e) {
            setApiStatus('invalid');
        }
        setIsValidating(false);
    };

    return (
        <div className={`min-h-screen ${themeClasses} transition-colors duration-500 flex flex-col items-center`}>
            <div className="max-w-4xl w-full p-4">

                {/* Header */}
                <header className={`w-full flex justify-between items-center mb-8 pt-4`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${isDark ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border border-slate-100'}`}>
                            <span className="text-2xl">⚡</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">Warm Connections</h1>
                            <span className={`text-[10px] font-semibold uppercase tracking-widest opacity-50`}>Emotional Intelligence System</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setProfile(prev => ({ ...prev, theme: isDark ? 'light' : 'dark' }))}
                            className={`p-2 rounded-xl transition-all ${isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-white text-slate-500 hover:bg-slate-100 shadow-sm'}`}
                        >
                            {isDark ? '☀️' : '🌙'}
                        </button>
                    </div>
                </header>

                {/* Tabs Navigation */}
                <div className={`flex w-full mb-8 p-1 rounded-2xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-200/50'}`}>
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${activeTab === 'dashboard' ? (isDark ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-blue-600 shadow-sm') : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab('config')}
                        className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${activeTab === 'config' ? (isDark ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-blue-600 shadow-sm') : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Settings
                    </button>
                </div>

                {/* DASHBOARD TAB */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-6 animate-fade-in">

                        {/* Relationship Meter */}
                        <div className={`p-8 rounded-[2rem] border ${cardClasses} transition-all hover:shadow-lg`}>
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold">Relationship Status</h3>
                                    <p className="text-xs opacity-50 font-medium uppercase tracking-wider">Real-time emotional sync</p>
                                </div>
                                <div className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${isDark ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'} ${status.color}`}>
                                    {status.label} {Math.round(profile.relationshipScore)}%
                                </div>
                            </div>
                            <div className={`w-full h-3 ${isDark ? 'bg-slate-800' : 'bg-slate-100'} rounded-full overflow-hidden mb-6`}>
                                <div
                                    className={`h-full ${status.bar} transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(59,130,246,0.3)]`}
                                    style={{ width: `${profile.relationshipScore}%` }}
                                />
                            </div>
                            <div className={`flex items-start gap-4 p-4 rounded-2xl ${isDark ? 'bg-white/5 border border-white/5' : 'bg-blue-50/50 border border-blue-100'}`}>
                                <span className="text-xl">ℹ️</span>
                                <div>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>AI Advisor</span>
                                    <p className="text-sm font-medium leading-relaxed opacity-80">{status.tip}</p>
                                </div>
                            </div>
                        </div>

                        {/* Next Call Indicator */}
                        <div className={`p-8 rounded-[2rem] border flex items-center justify-between transition-all ${nextScheduledCall ? 'border-blue-500 bg-blue-500/5 shadow-blue-500/10' : cardClasses}`}>
                            <div className="flex gap-4 items-center">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${nextScheduledCall ? 'bg-blue-500 text-white' : (isDark ? 'bg-slate-800' : 'bg-slate-100')}`}>
                                    {nextScheduledCall ? '⏰' : '📞'}
                                </div>
                                <div>
                                    <h3 className="font-bold text-base mb-0.5">Next Connection</h3>
                                    {nextScheduledCall ? (
                                        <p className="text-sm font-semibold text-blue-500">
                                            {nextScheduledCall.isRandom ? "Random surprise inbound..." : `${nextScheduledCall.reason}`}
                                            <span className="block text-[10px] opacity-60 font-medium">Estimated: {formatTime(nextScheduledCall.triggerTime - Date.now())}</span>
                                        </p>
                                    ) : (
                                        <p className="opacity-40 text-xs font-medium italic">System idling...</p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={onStartCall}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-blue-600/20 transform active:scale-95 transition-all text-sm uppercase tracking-wide"
                            >
                                Call Now
                            </button>
                        </div>

                        {/* History Management */}
                        <div className={`p-8 rounded-[2rem] border ${cardClasses}`}>
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold">Memory & History</h3>
                                    <p className="text-xs opacity-50 font-medium uppercase tracking-wider">Previous interactions</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={downloadHistory} className={`p-2 rounded-xl transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-blue-400' : 'bg-slate-100 hover:bg-slate-200 text-blue-600'}`} title="Download">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                    </button>
                                    <button onClick={() => historyInputRef.current?.click()} className={`p-2 rounded-xl transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-green-400' : 'bg-slate-100 hover:bg-slate-200 text-green-600'}`} title="Import">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                    </button>
                                    <input ref={historyInputRef} type="file" className="hidden" accept=".json" onChange={uploadHistory} />
                                    <button onClick={clearHistory} className={`p-2 rounded-xl transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-red-400' : 'bg-slate-100 hover:bg-slate-200 text-red-600'}`} title="Clear">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                                {profile.history.length === 0 ? (
                                    <div className={`p-10 text-center rounded-2xl border-2 border-dashed ${isDark ? 'border-slate-800 opacity-30' : 'border-slate-100 opacity-60'}`}>
                                        <p className="text-sm font-medium italic">No conversation logs found.</p>
                                    </div>
                                ) : (
                                    profile.history.slice().reverse().map((log) => (
                                        <div key={log.id} className={`p-4 rounded-2xl border transition-all ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-sm'}`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-tight opacity-40 mb-1">{new Date(log.timestamp).toLocaleString()}</p>
                                                    <p className="text-sm font-medium leading-snug">{log.notes}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-slate-100'}`} title={`Mood: ${log.moodEnd}`}>
                                                        {MOOD_EMOJIS[log.moodEnd]}
                                                    </div>
                                                    <p className="text-[10px] font-bold opacity-30 mt-1 uppercase">{log.durationSec}s</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* CONFIG TAB */}
                {activeTab === 'config' && (
                    <div className="space-y-6 animate-fade-in pb-12">
                        <div className="flex flex-col items-center">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`w-32 h-32 rounded-full border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative group ${isDark ? 'bg-slate-800 border-slate-600 hover:border-pink-500' : 'bg-white border-rose-300 hover:border-pink-500'
                                    }`}
                            >
                                {profile.image ? (
                                    <img src={profile.image} alt="Partner" className="w-full h-full object-cover" />
                                ) : (
                                    <>
                                        <span className="text-2xl group-hover:scale-110 transition-transform">📷</span>
                                        <span className={`text-xs mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>FOTO</span>
                                    </>
                                )}
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </div>
                            <input
                                type="text"
                                value={profile.name}
                                onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                                className={`mt-4 text-2xl font-bold italic bg-transparent border-b text-center outline-none w-64 ${isDark ? 'border-slate-700 focus:border-pink-500 text-white' : 'border-rose-300 focus:border-pink-500 text-slate-800'
                                    }`}
                                placeholder="Nome do Amor"
                            />
                        </div>

                        {/* API Key Section */}
                        <div className={`p-8 rounded-[2rem] border ${cardClasses}`}>
                            <div className="flex justify-between items-center mb-6">
                                <label className="text-xs font-bold uppercase tracking-widest block opacity-50">Gemini API Configuration</label>
                                <div className="flex items-center gap-2">
                                    {isValidating ? (
                                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                                    ) : (
                                        <div className={`w-2.5 h-2.5 rounded-full ${apiStatus === 'valid' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : apiStatus === 'invalid' ? 'bg-red-500' : 'bg-slate-500'}`} />
                                    )}
                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                                        {apiStatus === 'valid' ? 'Connected' : apiStatus === 'invalid' ? 'Invalid Key' : 'Not Verified'}
                                    </span>
                                </div>
                            </div>
                            <div className="relative group">
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => {
                                        setApiKey(e.target.value);
                                        setApiStatus('idle');
                                    }}
                                    onBlur={() => validateApiKey(apiKey)}
                                    className={`w-full p-4 pr-12 rounded-2xl text-sm font-mono border transition-all ${inputClasses}`}
                                    placeholder="Enter your AIzaSy... key"
                                />
                                <button
                                    onClick={() => validateApiKey(apiKey)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-400 font-bold text-xs"
                                >
                                    VERIFY
                                </button>
                            </div>
                            <div className="mt-4 flex justify-between items-center">
                                <p className="text-[10px] font-medium opacity-40">Your key is stored locally on this device.</p>
                                <a
                                    href="https://aistudio.google.com/app/apikey"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] font-bold text-blue-500 hover:underline uppercase tracking-tighter"
                                >
                                    Get Free Key →
                                </a>
                            </div>
                        </div>

                        <div className={`p-8 rounded-[2rem] border ${cardClasses}`}>
                            <label className="text-xs font-bold uppercase tracking-widest mb-6 block opacity-50">Attachment Level</label>
                            <div className="grid grid-cols-3 gap-3">
                                {Object.values(CallbackIntensity).map((intensity) => (
                                    <button
                                        key={intensity}
                                        onClick={() => setProfile(prev => ({ ...prev, intensity }))}
                                        className={`py-3 px-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all border shadow-sm ${profile.intensity === intensity
                                            ? 'bg-blue-600 border-blue-600 text-white shadow-blue-600/20'
                                            : `${isDark ? 'bg-[#0b0c10] border-slate-800 text-slate-500 hover:border-slate-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hove:shadow-sm'}`
                                            }`}
                                    >
                                        {intensity}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="w-full">
                            <label className="text-xs font-bold uppercase tracking-widest mb-4 block opacity-50">Accent Profile</label>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                {Object.entries(ACCENT_META).map(([key, meta]) => (
                                    <button
                                        key={key}
                                        onClick={() => setProfile(prev => ({ ...prev, accent: key as Accent }))}
                                        className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${profile.accent === key ? (isDark ? 'border-blue-500 bg-blue-500/10' : 'border-blue-500 bg-blue-50 shadow-sm') : cardClasses}`}
                                    >
                                        <div className="w-8 h-8 rounded-full shadow-sm overflow-hidden border border-white/10">
                                            <img src={meta.flagUrl} className="w-full h-full object-cover" />
                                        </div>
                                        <span className="text-xs font-bold tracking-tight">{meta.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="w-full">
                            <label className="text-xs font-bold uppercase tracking-widest mb-4 block opacity-50">Voice Synthesis</label>
                            <div className="flex flex-wrap gap-3">
                                {Object.values(VoiceName).map(voice => (
                                    <button
                                        key={voice}
                                        onClick={() => setProfile(prev => ({ ...prev, voice }))}
                                        className={`px-5 py-2.5 rounded-2xl text-xs font-bold border transition-all ${profile.voice === voice ? (isDark ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-blue-600 border-blue-600 text-white shadow-sm') : cardClasses}`}
                                    >
                                        {VOICE_META[voice].gender === 'Male' ? '♂' : '♀'} {voice}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="w-full">
                            <label className="text-xs font-bold uppercase tracking-widest mb-4 block opacity-50">Personality Engine</label>
                            <textarea
                                value={profile.personality}
                                onChange={(e) => setProfile(prev => ({ ...prev, personality: e.target.value }))}
                                className={`w-full h-32 rounded-[1.5rem] p-5 text-sm font-medium focus:outline-none border shadow-inner transition-all ${inputClasses}`}
                            />
                        </div>

                        <div className="w-full">
                            <label className="text-xs font-bold uppercase tracking-widest mb-4 block opacity-50">Live Context</label>
                            <textarea
                                value={profile.dailyContext}
                                onChange={(e) => setProfile(prev => ({ ...prev, dailyContext: e.target.value }))}
                                className={`w-full h-32 rounded-[1.5rem] p-5 text-sm font-medium focus:outline-none border shadow-inner transition-all ${inputClasses}`}
                                placeholder="Ex: I'm currently studying for my final exams..."
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
