import React, { useRef, useState } from 'react';
import { Mood, VoiceName, Accent, PartnerProfile, MOOD_EMOJIS, VOICE_META, ACCENT_META, CallbackIntensity, CallLog, ScheduledCall } from '../types';
import { ContactList } from './ContactList';
import { AuthModal } from './AuthModal';
import { CalendarTab } from './CalendarTab';
import { MemoryHistorySection } from './MemoryHistorySection';
import { supabase } from '../supabaseClient';

interface SetupScreenProps {
    profile: PartnerProfile;
    setProfile: React.Dispatch<React.SetStateAction<PartnerProfile>>;
    onStartCall: () => void;
    nextScheduledCall: ScheduledCall | null;
    apiKey: string;
    setApiKey: (key: string) => void;
    user: any;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ profile, setProfile, onStartCall, nextScheduledCall, apiKey, setApiKey, user }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'contacts' | 'calendar' | 'memory' | 'config'>('dashboard');
    const [showAuth, setShowAuth] = useState(false);
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

    const syncProfileToSupabase = async (newProfile: PartnerProfile) => {
        if (!user) return;
        await supabase
            .from('profiles')
            .update({ ai_settings: newProfile })
            .eq('id', user.id);
    };

    const updateProfileAndSync = (updater: (prev: PartnerProfile) => PartnerProfile) => {
        setProfile(prev => {
            const updated = updater(prev);
            syncProfileToSupabase(updated);
            return updated;
        });
    };

    return (
        <div className={`min-h-screen ${themeClasses} transition-colors duration-500 flex flex-col items-center`}>
            <div className="max-w-4xl w-full p-4">

                {/* Header */}
                <header className={`w-full flex justify-between items-center mb-8 pt-4`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-blue-500/10 border ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-white'}`}>⚡</div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">Warm Connections</h1>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Intelligent Partner v2.0</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {user ? (
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Usuário Online</span>
                                <button onClick={() => supabase.auth.signOut()} className="text-[9px] font-bold text-red-500 hover:underline uppercase">Sair</button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowAuth(true)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                            >
                                Entrar / Cadastrar
                            </button>
                        )}
                        <button
                            onClick={() => updateProfileAndSync(prev => ({ ...prev, theme: isDark ? 'light' : 'dark' }))}
                            className={`p-3 rounded-2xl border transition-all hover:scale-110 active:scale-90 ${cardClasses}`}
                        >
                            {isDark ? '☀️' : '🌙'}
                        </button>
                    </div>
                </header>

                {/* Tabs */}
                <nav className={`flex p-1.5 rounded-[1.5rem] border mb-8 max-w-sm mx-auto ${cardClasses}`}>
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex-1 py-3 px-6 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                    >
                        Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab('contacts')}
                        className={`flex-1 py-3 px-6 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'contacts' ? 'bg-blue-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                    >
                        Contatos
                    </button>
                    <button
                        onClick={() => setActiveTab('calendar')}
                        className={`flex-1 py-3 px-6 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'calendar' ? 'bg-blue-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                    >
                        Calendário
                    </button>
                    <button
                        onClick={() => setActiveTab('memory')}
                        className={`flex-1 py-3 px-6 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'memory' ? 'bg-blue-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                    >
                        Memória
                    </button>
                    <button
                        onClick={() => setActiveTab('config')}
                        className={`flex-1 py-3 px-6 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'config' ? 'bg-blue-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                    >
                        Config
                    </button>
                </nav>

                {/* Content */}
                <main className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'dashboard' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left Column: Relationship Status */}
                            <div className="flex flex-col gap-8">
                                <div className={`p-10 rounded-[2rem] border overflow-hidden relative ${cardClasses}`}>
                                    {/* Glass Glow */}
                                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/5 blur-[80px] rounded-full" />

                                    <div className="flex justify-between items-start mb-8 relative z-10">
                                        <div>
                                            <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">Status da Relação</h3>
                                            <p className={`text-2xl font-black italic tracking-tight ${status.color}`}>{status.label}</p>
                                        </div>
                                        <div className="w-16 h-16 rounded-full bg-slate-100/10 flex items-center justify-center text-3xl">💝</div>
                                    </div>

                                    <div className="w-full h-4 bg-slate-100/10 rounded-full overflow-hidden mb-8 shadow-inner">
                                        <div className={`h-full transition-all duration-1000 ${status.bar}`} style={{ width: `${profile.relationshipScore}%` }} />
                                    </div>

                                    <div className={`p-6 rounded-[1.5rem] bg-blue-500/5 border border-blue-500/10 relative z-10`}>
                                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-2">Dica do Advisor:</h4>
                                        <p className="text-sm leading-relaxed opacity-70 italic">"{status.tip}"</p>
                                    </div>
                                </div>

                                {/* Next Call Indicator */}
                                <div className={`p-10 rounded-[2rem] border flex flex-col gap-6 transition-all ${nextScheduledCall ? 'border-blue-500 bg-blue-500/5 shadow-blue-500/10' : cardClasses}`}>
                                    <div className="flex gap-4 items-center">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-inner ${nextScheduledCall ? 'bg-blue-500 text-white' : (isDark ? 'bg-slate-800' : 'bg-slate-100')}`}>
                                            {nextScheduledCall ? '⏰' : '📞'}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg mb-0.5">Próxima Conexão</h3>
                                            {nextScheduledCall ? (
                                                <p className="text-sm font-semibold text-blue-500">
                                                    {nextScheduledCall.isRandom ? "Surpresa aleatória chegando..." : `${nextScheduledCall.reason}`}
                                                    <span className="block text-[10px] opacity-60 font-medium">Estimado: {formatTime(nextScheduledCall.triggerTime - Date.now())}</span>
                                                </p>
                                            ) : (
                                                <p className="opacity-40 text-sm font-medium italic">Sistema ocioso...</p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={onStartCall}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-blue-600/20 transform active:scale-95 transition-all text-sm uppercase tracking-wide w-full"
                                    >
                                        Ligar Agora
                                    </button>
                                </div>
                            </div>

                            {/* Right Column: History Management */}
                            <div className="flex flex-col gap-8">
                                <div className={`p-10 rounded-[2rem] border ${cardClasses}`}>
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h3 className="text-lg font-bold">Memória & Histórico</h3>
                                            <p className="text-xs opacity-50 font-medium uppercase tracking-wider">Interações anteriores</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={downloadHistory} className={`p-2 rounded-xl transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-blue-400' : 'bg-slate-100 hover:bg-slate-200 text-blue-600'}`} title="Download">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                            </button>
                                            <button onClick={() => historyInputRef.current?.click()} className={`p-2 rounded-xl transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-green-400' : 'bg-slate-100 hover:bg-slate-200 text-green-600'}`} title="Importar">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                </svg>
                                            </button>
                                            <input ref={historyInputRef} type="file" className="hidden" accept=".json" onChange={uploadHistory} />
                                            <button onClick={clearHistory} className={`p-2 rounded-xl transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-red-400' : 'bg-slate-100 hover:bg-slate-200 text-red-600'}`} title="Limpar">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                        {profile.history.length === 0 ? (
                                            <p className="text-center py-8 opacity-40 text-xs italic">Nenhuma lembrança registrada ainda...</p>
                                        ) : (
                                            profile.history.slice().reverse().map(log => (
                                                <div key={log.id} className={`p-4 rounded-2xl border mb-3 flex justify-between items-center transition-all ${isDark ? 'bg-[#0b0c10] border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                                    <div>
                                                        <p className="font-bold text-xs">{new Date(log.timestamp).toLocaleDateString()}</p>
                                                        <p className="text-[10px] opacity-60 truncate max-w-[150px]">{log.notes}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[10px] font-bold block opacity-40">{formatTime(log.durationSec * 1000)}</span>
                                                        <span className="text-lg">{MOOD_EMOJIS[log.moodEnd]}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'calendar' && (
                        <div className="w-full">
                            {user ? (
                                <CalendarTab
                                    user={user}
                                    profile={profile}
                                    setProfile={setProfile}
                                    isDark={isDark}
                                />
                            ) : (
                                <div className={`p-12 text-center rounded-[3rem] border ${cardClasses}`}>
                                    <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">📅</div>
                                    <h2 className="text-2xl font-bold mb-4">Calendário Offline</h2>
                                    <p className="opacity-60 mb-8 px-12">Faça login para salvar seus compromissos na nuvem e permitir que a IA gerencie seu dia.</p>
                                    <button
                                        onClick={() => setShowAuth(true)}
                                        className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
                                    >
                                        Entrar Agora
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'memory' && (
                        <div className="w-full">
                            {user ? (
                                <MemoryHistorySection user={user} isDark={isDark} />
                            ) : (
                                <div className={`p-12 text-center rounded-[3rem] border ${cardClasses}`}>
                                    <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">🧠</div>
                                    <h2 className="text-2xl font-bold mb-4">Memória Bloqueada</h2>
                                    <p className="opacity-60 mb-8 px-12">Faça login para desbloquear a persistência emocional e cognitiva da sua IA.</p>
                                    <button
                                        onClick={() => setShowAuth(true)}
                                        className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
                                    >
                                        Entrar Agora
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'contacts' && (
                        <div className="max-w-2xl mx-auto w-full">
                            {user ? (
                                <ContactList
                                    currentUser={user}
                                    onCallPartner={(newProfile) => {
                                        setProfile(newProfile);
                                        onStartCall();
                                    }}
                                    isDark={isDark}
                                />
                            ) : (
                                <div className={`p-12 text-center rounded-[3rem] border ${cardClasses}`}>
                                    <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">🔒</div>
                                    <h2 className="text-2xl font-bold mb-4">Acesso Restrito</h2>
                                    <p className="opacity-60 mb-8 px-12">Você precisa estar logado para gerenciar contatos e visualizar seus números de identificação.</p>
                                    <button
                                        onClick={() => setShowAuth(true)}
                                        className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
                                    >
                                        Entrar Agora
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

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
                                    onChange={(e) => updateProfileAndSync(prev => ({ ...prev, name: e.target.value }))}
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
                                            onClick={() => updateProfileAndSync(prev => ({ ...prev, intensity }))}
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
                                            onClick={() => updateProfileAndSync(prev => ({ ...prev, accent: key as Accent }))}
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
                                            onClick={() => updateProfileAndSync(prev => ({ ...prev, voice }))}
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
                                    onChange={(e) => updateProfileAndSync(prev => ({ ...prev, personality: e.target.value }))}
                                    className={`w-full h-32 rounded-[1.5rem] p-5 text-sm font-medium focus:outline-none border shadow-inner transition-all ${inputClasses}`}
                                />
                            </div>

                            <div className="w-full">
                                <label className="text-xs font-bold uppercase tracking-widest mb-4 block opacity-50">Live Context</label>
                                <textarea
                                    value={profile.dailyContext}
                                    onChange={(e) => updateProfileAndSync(prev => ({ ...prev, dailyContext: e.target.value }))}
                                    className={`w-full h-32 rounded-[1.5rem] p-5 text-sm font-medium focus:outline-none border shadow-inner transition-all ${inputClasses}`}
                                    placeholder="Ex: I'm currently studying for my final exams..."
                                />
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {showAuth && <AuthModal onClose={() => setShowAuth(false)} isDark={isDark} />}
        </div>
    );
};
