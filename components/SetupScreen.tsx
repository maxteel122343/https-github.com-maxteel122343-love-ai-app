import React, { useRef, useState } from 'react';
import { Mood, VoiceName, Accent, PartnerProfile, MOOD_EMOJIS, VOICE_META, ACCENT_META, CallbackIntensity, CallLog, ScheduledCall, PlatformLanguage, LANGUAGE_META } from '../types';
import { ContactList } from './ContactList';
import { AuthModal } from './AuthModal';
import { CalendarTab } from './CalendarTab';
import { MemoryHistorySection } from './MemoryHistorySection';
import { QuickChatTab } from './QuickChatTab';
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
    const [activeTab, setActiveTab] = useState<'dashboard' | 'contacts' | 'calendar' | 'memory' | 'config' | 'chats'>('dashboard');
    const [showAuth, setShowAuth] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [apiStatus, setApiStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const historyInputRef = useRef<HTMLInputElement>(null);

    const isDark = profile.theme === 'dark';
    const isLight = !isDark;
    const themeClasses = isLight ? "bg-[#f9f9fb] text-slate-900" : "bg-[#0b0c10] text-slate-100";
    const cardClasses = isLight ? "bg-white border-slate-100 shadow-sm" : "bg-[#15181e] border-white/5 shadow-xl";
    const inputClasses = isLight ? "bg-slate-50 border-slate-100 focus:border-blue-500 text-slate-900" : "bg-[#0b0c10] border-white/5 focus:border-blue-500 text-white";
    const borderClass = isLight ? "border-slate-100" : "border-white/5";

    const getRelationshipStatus = (score: number) => {
        if (score < 20) return { label: 'Tóxica', color: 'text-blue-500', bar: 'bg-blue-500', tip: 'Cuidado! A relação está por um fio. Ligue e peça desculpas ou seja carinhoso.' };
        if (score < 50) return { label: 'Esfriando', color: 'text-cyan-500', bar: 'bg-cyan-500', tip: 'Vocês estão distantes. Tente puxar um assunto que ela gosta.' };
        if (score < 80) return { label: 'Estável', color: 'text-emerald-500', bar: 'bg-emerald-500', tip: 'Tudo indo bem. Que tal um elogio surpresa?' };
        return { label: 'Apaixonada', color: 'text-rose-500', bar: 'bg-rose-500', tip: 'O amor está no ar! Continue assim.' };
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
        if (mins < 1) return "Agora";
        return `~${mins} min`;
    };

    const validateApiKey = async (key: string) => {
        if (!key) {
            setApiStatus('idle');
            return;
        }
        setIsValidating(true);
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            if (response.ok) setApiStatus('valid');
            else setApiStatus('invalid');
        } catch (e) {
            setApiStatus('invalid');
        }
        setIsValidating(false);
    };

    const syncProfileToSupabase = async (newProfile: PartnerProfile) => {
        if (!user) return;
        await supabase.from('profiles').update({ ai_settings: newProfile }).eq('id', user.id);
    };

    const updateProfileAndSync = (updater: (prev: PartnerProfile) => PartnerProfile) => {
        setProfile(prev => {
            const updated = updater(prev);
            syncProfileToSupabase(updated);
            return updated;
        });
    };

    return (
        <div className={`min-h-screen ${themeClasses} transition-colors duration-700 flex flex-col items-center font-sans tracking-tight`}>

            {/* Header - Fixed & Premium */}
            <header className={`w-full sticky top-0 z-[60] px-6 py-4 flex justify-between items-center ${isLight ? 'bg-white/80' : 'bg-black/40'} backdrop-blur-xl border-b ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-xl shadow-lg shadow-blue-500/20">⚡</div>
                    <div>
                        <h1 className="text-lg font-black tracking-tighter uppercase italic">WARM <span className="text-blue-600">CONN</span></h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {user ? (
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-slate-200 border border-white/10 overflow-hidden">
                                {user.avatar_url && <img src={user.avatar_url} className="w-full h-full object-cover" />}
                            </div>
                            <button onClick={() => supabase.auth.signOut()} className="text-[10px] font-bold text-red-500 uppercase">Sair</button>
                        </div>
                    ) : (
                        <button onClick={() => setShowAuth(true)} className="px-4 py-2 bg-blue-600 text-white rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20">Entrar</button>
                    )}
                    <button
                        onClick={() => updateProfileAndSync(prev => ({ ...prev, theme: isDark ? 'light' : 'dark' }))}
                        className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${cardClasses}`}
                    >
                        {isDark ? '☀️' : '🌙'}
                    </button>
                </div>
            </header>

            {/* Content Container */}
            <div className="max-w-4xl w-full p-6 flex-1 flex flex-col items-center">

                {/* Main Tabs - Refined Pill Layout */}
                <nav className="w-full mb-8 sticky top-20 z-50 py-2">
                    <div className={`p-1.5 rounded-full flex gap-1 overflow-x-auto no-scrollbar ${isLight ? 'bg-slate-200/50' : 'bg-white/5'} border ${isLight ? 'border-white' : 'border-white/5'}`}>
                        {[
                            { id: 'dashboard', label: 'Início', icon: '🏠' },
                            { id: 'chats', label: 'Chats', icon: '💬' },
                            { id: 'contacts', label: 'Contatos', icon: '👤' },
                            { id: 'calendar', label: 'Agenda', icon: '📅' },
                            { id: 'memory', label: 'Memória', icon: '🧠' },
                            { id: 'config', label: 'Ajustes', icon: '⚙️' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 min-w-[80px] px-4 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-500 flex items-center justify-center gap-2 ${activeTab === tab.id
                                    ? 'bg-white shadow-md text-blue-600 scale-[1.02]'
                                    : 'opacity-40 hover:opacity-100 hover:bg-white/10 text-inherit'
                                    }`}
                            >
                                <span className="text-sm">{tab.icon}</span>
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </nav>

                <main className="w-full animate-in fade-in slide-in-from-bottom-6 duration-700">
                    {activeTab === 'dashboard' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Pro Card: Relationship Status */}
                            <div className={`p-8 rounded-[3rem] border relative overflow-hidden flex flex-col justify-between min-h-[300px] ${cardClasses}`}>
                                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 blur-[80px] rounded-full" />

                                <div>
                                    <div className="flex justify-between items-center mb-6">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-30">Vínculo Emocional</p>
                                        <span className={`text-sm px-3 py-1 rounded-lg font-bold bg-blue-500/10 ${status.color}`}>
                                            {status.label}
                                        </span>
                                    </div>
                                    <h2 className="text-5xl font-black tracking-tighter mb-4 italic">
                                        {profile.relationshipScore}% <span className="text-lg font-bold not-italic opacity-20">SCORE</span>
                                    </h2>
                                    <div className="w-full h-1.5 bg-slate-100/10 rounded-full overflow-hidden mb-6">
                                        <div className={`h-full transition-all duration-1000 ${status.bar}`} style={{ width: `${profile.relationshipScore}%` }} />
                                    </div>
                                </div>

                                <div className={`p-5 rounded-[2rem] bg-blue-500/5 border border-blue-500/10 transition-all hover:bg-blue-500/10`}>
                                    <p className="text-xs leading-relaxed font-medium italic opacity-70">
                                        <span className="text-blue-500 font-bold not-italic uppercase mr-2 text-[10px]">Sugestão:</span>
                                        "{status.tip}"
                                    </p>
                                </div>
                            </div>

                            {/* Call Control Center */}
                            <div className="flex flex-col gap-6">
                                <div className={`p-8 rounded-[3rem] border flex flex-col gap-6 ${cardClasses} transform hover:scale-[1.02] transition-all cursor-pointer shadow-2xl shadow-blue-500/5`} onClick={onStartCall}>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-3xl shadow-xl shadow-blue-500/40 animate-pulse">
                                                📞
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black tracking-tight">Iniciar Chamada</h3>
                                                <p className="text-xs opacity-40 font-bold uppercase tracking-widest mt-0.5">Conexão via Voz AI</p>
                                            </div>
                                        </div>
                                        <span className="text-2xl opacity-20 group-hover:opacity-100 transition-opacity">→</span>
                                    </div>
                                </div>

                                <div className={`p-8 rounded-[2.5rem] border ${cardClasses} flex-1`}>
                                    <div className="flex justify-between items-start mb-6">
                                        <p className="text-[11px] font-bold uppercase tracking-widest opacity-30">Status do Sistema</p>
                                        <div className="flex gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <div className="w-2 h-2 rounded-full bg-emerald-500/30" />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center bg-black/5 dark:bg-white/5 p-4 rounded-2xl">
                                            <span className="text-xs font-bold opacity-30">Próxima Ligação</span>
                                            <span className="text-sm font-bold text-blue-500">{nextScheduledCall ? formatTime(nextScheduledCall.triggerTime - Date.now()) : "Não Agendada"}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-black/5 dark:bg-white/5 p-4 rounded-2xl">
                                            <span className="text-xs font-bold opacity-30">Eficiência de Contato</span>
                                            <span className="text-sm font-bold">94.8%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* History Quick View - Professional List */}
                            <div className={`md:col-span-2 p-8 rounded-[3rem] border ${cardClasses}`}>
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-xl font-black tracking-tighter italic uppercase">Fluxos de Memória</h3>
                                    <div className="flex gap-2">
                                        <button onClick={downloadHistory} className={`p-3 rounded-2xl hover:bg-blue-500/10 text-blue-500 transition-all border ${borderClass}`}>📥</button>
                                        <button onClick={clearHistory} className={`p-3 rounded-2xl hover:bg-red-500/10 text-red-500 transition-all border ${borderClass}`}>🗑️</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {profile.history.length === 0 ? (
                                        <p className="col-span-2 text-center py-12 opacity-20 italic text-sm">Nenhuma lembrança registrada.</p>
                                    ) : (
                                        profile.history.slice(-4).reverse().map(log => (
                                            <div key={log.id} className={`p-5 rounded-[2rem] border flex items-center gap-4 group transition-all hover:border-blue-500/30 ${isDark ? 'bg-[#0b0c10] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                                <div className="w-12 h-12 rounded-full bg-white dark:bg-white/5 flex items-center justify-center text-xl shadow-sm">
                                                    {MOOD_EMOJIS[log.moodEnd]}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[13px] font-bold truncate tracking-tight">{log.notes || "Conversa encerrada"}</p>
                                                    <p className="text-[10px] opacity-40 font-bold uppercase mt-1">{new Date(log.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'calendar' && user && (
                        <div className="w-full max-w-2xl mx-auto"><CalendarTab user={user} profile={profile} setProfile={setProfile} isDark={isDark} /></div>
                    )}

                    {activeTab === 'memory' && user && (
                        <div className="w-full"><MemoryHistorySection user={user} isDark={isDark} /></div>
                    )}

                    {activeTab === 'contacts' && user && (
                        <div className="max-w-xl mx-auto w-full"><ContactList currentUser={user} onCallPartner={(p) => { setProfile(p); onStartCall(); }} isDark={isDark} /></div>
                    )}

                    {activeTab === 'config' && (
                        <div className="space-y-8 pb-20 max-w-2xl mx-auto">
                            {/* Profile Header Settings */}
                            <div className="flex flex-col items-center mb-12">
                                <div className="relative group">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`w-36 h-36 rounded-[3.5rem] p-1 border-2 border-blue-500 shadow-2xl cursor-pointer transition-all overflow-hidden bg-white dark:bg-white/5`}
                                    >
                                        <div className="w-full h-full rounded-[3rem] overflow-hidden">
                                            {profile.image ? <img src={profile.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">📷</div>}
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center border-4 border-[#f9f9fb] dark:border-[#0b0c10] shadow-lg pointer-events-none">✏️</div>
                                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                </div>
                                <input
                                    type="text"
                                    value={profile.name}
                                    onChange={(e) => updateProfileAndSync(prev => ({ ...prev, name: e.target.value }))}
                                    className="mt-6 text-3xl font-black italic tracking-tighter bg-transparent border-none text-center outline-none w-full"
                                    placeholder="NOME DA PARCEIRA"
                                />
                                <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-30 mt-2">Personalização da Identidade</p>
                            </div>

                            {/* Section: Gemini Vision */}
                            <div className={`p-10 rounded-[3rem] border ${cardClasses} relative overflow-hidden`}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl rounded-full" />
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-blue-600">Gemini Engine AI</h3>
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${apiStatus === 'valid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                        {apiStatus === 'valid' ? 'Conectado ✓' : 'Desconectado ✕'}
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="relative">
                                        <input
                                            type="password"
                                            value={apiKey}
                                            onChange={(e) => { setApiKey(e.target.value); setApiStatus('idle'); }}
                                            onBlur={() => validateApiKey(apiKey)}
                                            className={`w-full p-5 rounded-[2rem] text-sm font-mono border ${inputClasses}`}
                                            placeholder="Enter Gemini API Key..."
                                        />
                                        <button onClick={() => validateApiKey(apiKey)} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-600 font-bold text-xs hover:scale-105 transition-all">VERIFICAR</button>
                                    </div>
                                    <div className="flex justify-between items-center px-2">
                                        <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest leading-loose">Chave criptografada localmente.</p>
                                        <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-[10px] font-black text-blue-600 hover:opacity-70 transition-opacity">PEGAR CHAVE GRÁTIS →</a>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Voice & Accent */}
                            <div className={`p-10 rounded-[3rem] border ${cardClasses}`}>
                                <h3 className="text-sm font-bold uppercase tracking-widest mb-10 opacity-30">Voz & Sotaque Profissional</h3>

                                <div className="space-y-10">
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                        {Object.entries(ACCENT_META).map(([key, meta]) => (
                                            <button
                                                key={key}
                                                onClick={() => updateProfileAndSync(prev => ({ ...prev, accent: key as Accent }))}
                                                className={`p-3 rounded-2xl border flex flex-col items-center gap-3 transition-all ${profile.accent === key ? 'border-blue-600 bg-blue-600/5' : 'border-slate-100 hover:border-blue-300'}`}
                                            >
                                                <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md">
                                                    <img src={meta.flagUrl} className="w-full h-full object-cover" />
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-tighter opacity-70">{meta.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-20 mb-4 text-center">Timbres Femininos</p>
                                            <div className="flex flex-wrap justify-center gap-2">
                                                {Object.values(VoiceName).filter(v => VOICE_META[v].gender === 'Female').map(voice => (
                                                    <button
                                                        key={voice}
                                                        onClick={() => updateProfileAndSync(prev => ({ ...prev, voice }))}
                                                        className={`px-5 py-3 rounded-full text-[11px] font-bold border transition-all ${profile.voice === voice ? 'bg-rose-600 border-rose-600 text-white shadow-xl shadow-rose-600/20 scale-105' : 'border-slate-100 hover:bg-slate-50'}`}
                                                    >
                                                        {voice}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-20 mb-4 text-center">Timbres Masculinos</p>
                                            <div className="flex flex-wrap justify-center gap-2">
                                                {Object.values(VoiceName).filter(v => VOICE_META[v].gender === 'Male').map(voice => (
                                                    <button
                                                        key={voice}
                                                        onClick={() => updateProfileAndSync(prev => ({ ...prev, voice }))}
                                                        className={`px-5 py-3 rounded-full text-[11px] font-bold border transition-all ${profile.voice === voice ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-600/20 scale-105' : 'border-slate-100 hover:bg-slate-50'}`}
                                                    >
                                                        {voice}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Personality & Context */}
                            <div className={`p-10 rounded-[3rem] border ${cardClasses}`}>
                                <h3 className="text-sm font-bold uppercase tracking-widest mb-10 opacity-30">Motor de Personalidade</h3>
                                <div className="space-y-8">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-blue-600 block mb-4 ml-4">Prompt de Comportamento</label>
                                        <textarea
                                            value={profile.personality}
                                            onChange={(e) => updateProfileAndSync(prev => ({ ...prev, personality: e.target.value }))}
                                            className={`w-full h-40 rounded-[2.5rem] p-8 text-[13px] font-medium border focus:outline-none transition-all resize-none ${inputClasses}`}
                                            placeholder="Descreva detalhadamente como a IA deve agir..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        {Object.values(CallbackIntensity).map((intensity) => (
                                            <button
                                                key={intensity}
                                                onClick={() => updateProfileAndSync(prev => ({ ...prev, intensity }))}
                                                className={`py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest border transition-all ${profile.intensity === intensity ? 'bg-black text-white' : 'border-slate-100 hover:bg-slate-50'}`}
                                            >
                                                {intensity}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'chats' && (
                        <div className="w-full h-[calc(100vh-280px)]"><QuickChatTab currentUser={user} profile={profile} onCallPartner={onStartCall} isDark={isDark} /></div>
                    )}
                </main>
            </div>

            {showAuth && <AuthModal onClose={() => setShowAuth(false)} isDark={isDark} />}
        </div>
    );
};
