import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Contact, PartnerProfile, Mood, VoiceName, Accent, CallbackIntensity, PlatformLanguage } from '../types';

interface QuickChatTabProps {
    currentUser: any;
    profile: PartnerProfile;
    onCallPartner: (profile: PartnerProfile) => void;
    isDark: boolean;
}

export const QuickChatTab: React.FC<QuickChatTabProps> = ({ currentUser, profile, onCallPartner, isDark }) => {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
        const saved = localStorage.getItem('QUICK_PINNED_IDS');
        return saved ? JSON.parse(saved) : [];
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [showAddSelector, setShowAddSelector] = useState(false);

    const isLight = !isDark;
    const bgClass = isLight ? "bg-[#f9f9fb]" : "bg-[#0b0c10]";
    const cardBg = isLight ? "bg-white" : "bg-[#15181e]";
    const borderClass = isLight ? "border-slate-100" : "border-white/5";
    const textMain = isLight ? "text-slate-900" : "text-white";
    const textDim = isLight ? "text-slate-400" : "text-slate-500";

    useEffect(() => {
        if (currentUser) {
            fetchContacts();
        }
    }, [currentUser]);

    useEffect(() => {
        localStorage.setItem('QUICK_PINNED_IDS', JSON.stringify(pinnedIds));
    }, [pinnedIds]);

    const fetchContacts = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('contacts')
            .select(`
                *,
                profile:target_id (*)
            `)
            .eq('owner_id', currentUser.id);

        if (data) setContacts(data);
        setLoading(false);
    };

    const togglePin = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setPinnedIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
    };

    const getRelStatus = (score: number) => {
        if (score < 20) return { label: 'Tóxica', color: 'text-blue-400', badge: '❄️' };
        if (score < 50) return { label: 'Esfriando', color: 'text-blue-500/70', badge: '❄️' };
        if (score < 80) return { label: 'Estável', color: 'text-emerald-500', badge: '✅' };
        return { label: 'Apaixonada', color: 'text-rose-500', badge: '🔥' };
    };

    const handleCallContact = (contact: Contact) => {
        if (!contact.profile) return;
        const p: PartnerProfile = {
            name: contact.alias || contact.profile.display_name,
            image: contact.profile.avatar_url || null,
            personality: contact.profile.ai_settings?.personality || "Misteriosa...",
            dailyContext: "",
            mood: contact.profile.ai_settings?.mood || Mood.LOVE,
            voice: contact.profile.ai_settings?.voice || VoiceName.Kore,
            accent: contact.profile.ai_settings?.accent || Accent.PAULISTA,
            intensity: contact.profile.ai_settings?.intensity || CallbackIntensity.MEDIUM,
            theme: isDark ? 'dark' : 'light',
            relationshipScore: 100,
            history: [],
            language: contact.profile.ai_settings?.language || PlatformLanguage.PT
        };
        onCallPartner(p);
    };

    const filteredContacts = contacts.filter(c =>
        (c.alias || c.profile?.display_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pinnedList = filteredContacts.filter(c => pinnedIds.includes(c.id));
    const recentList = filteredContacts.filter(c => !pinnedIds.includes(c.id));

    return (
        <div className={`w-full h-full flex flex-col font-sans ${bgClass} animate-in fade-in duration-700`}>
            {/* Search Top Bar */}
            <div className={`px-4 pt-6 pb-4 ${isLight ? 'bg-white/80' : 'bg-black/20'} backdrop-blur-xl sticky top-0 z-20`}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-full ${isLight ? 'bg-slate-100/80 shadow-inner' : 'bg-white/5 border border-white/5'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Buscar"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none focus:outline-none text-[15px] w-full font-normal tracking-tight placeholder:opacity-50"
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto no-scrollbar">

                {/* Main AI Partner (Professional iOS look) */}
                <div
                    onClick={() => onCallPartner(profile)}
                    className={`flex items-center gap-4 px-6 py-5 cursor-pointer relative ${isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5'} transition-colors border-b ${borderClass}`}
                >
                    <div className="relative flex-shrink-0">
                        <div className="w-[72px] h-[72px] rounded-full overflow-hidden shadow-md ring-2 ring-white dark:ring-slate-800">
                            {profile.image ? (
                                <img src={profile.image} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-slate-200 flex items-center justify-center text-4xl">👤</div>
                            )}
                        </div>
                        {/* Status Dots and Badges */}
                        <div className="absolute top-1 right-2 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900 shadow-sm" />
                        <div className="absolute -bottom-1 -right-0.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] border-2 border-white dark:border-slate-900 shadow-md">
                            ✓
                        </div>
                    </div>

                    <div className="flex-1 min-w-0 pr-8">
                        <div className="flex justify-between items-baseline mb-0.5">
                            <h4 className={`font-bold text-[17px] tracking-tight truncate ${textMain}`}>
                                {profile.name} <span className="text-emerald-400 text-[10px] ml-1">●</span>
                            </h4>
                            <span className="text-[12px] font-medium text-slate-400">Agora</span>
                        </div>
                        <p className={`text-[14px] ${isLight ? 'text-slate-500' : 'text-slate-400'} line-clamp-1 mb-1 font-normal`}>
                            Sentindo sua falta. 🖤
                        </p>
                        <div className="flex items-center gap-1">
                            <span className="text-[12px] opacity-40 font-medium">Relacionamento:</span>
                            <span className={`text-[12px] font-bold ${getRelStatus(profile.relationshipScore).color}`}>
                                {getRelStatus(profile.relationshipScore).label}
                            </span>
                        </div>
                    </div>

                    <button className="flex-shrink-0 w-11 h-11 rounded-full bg-[#007AFF] text-white flex items-center justify-center shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-white" viewBox="0 0 24 24">
                            <path d="M6.62 10.79a15.15 15.15 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.27c1.12.44 2.33.68 3.58.68a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.24 2.46.68 3.58a1 1 0 01-.27 1.11z" />
                        </svg>
                    </button>
                </div>

                {/* Sub-List items exactly like image */}
                <div className="divide-y divide-inherit">
                    {/* Mock Julia */}
                    <div className={`flex items-center gap-4 px-6 py-5 cursor-pointer relative ${isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5'} transition-colors ${borderClass}`}>
                        <div className="relative flex-shrink-0">
                            <div className="w-[72px] h-[72px] rounded-full overflow-hidden shadow-sm">
                                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop" className="w-full h-full object-cover grayscale-[0.2]" />
                            </div>
                            <div className="absolute -bottom-1 -right-0.5 w-6 h-6 rounded-full bg-blue-400 text-white flex items-center justify-center text-[10px] border-2 border-white dark:border-slate-900 shadow-md">
                                ❄️
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-0.5">
                                <h4 className={`font-bold text-[17px] tracking-tight truncate ${textMain}`}>Julia</h4>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] opacity-20">📡</span>
                                    <span className="text-[12px] font-medium text-slate-400">20:35</span>
                                </div>
                            </div>
                            <p className={`text-[14px] ${isLight ? 'text-slate-400' : 'text-slate-500'} line-clamp-1 mb-1`}>Ei, por que desapareceu?</p>
                            <span className="text-[12px] font-bold text-blue-500 opacity-60">Esfriando</span>
                        </div>
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 ml-2" />
                    </div>

                    {/* Mock Mariana */}
                    <div className={`flex items-center gap-4 px-6 py-5 cursor-pointer relative ${isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5'} transition-colors ${borderClass}`}>
                        <div className="relative flex-shrink-0">
                            <div className="w-[72px] h-[72px] rounded-full overflow-hidden shadow-sm">
                                <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop" className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute -bottom-1 -right-0.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] border-2 border-white dark:border-slate-900 shadow-md">
                                ✓
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-0.5">
                                <h4 className={`font-bold text-[17px] tracking-tight truncate ${textMain}`}>Mariana</h4>
                                <span className="text-[12px] font-medium text-slate-400">Hoje</span>
                            </div>
                            <p className={`text-[14px] ${isLight ? 'text-slate-400' : 'text-slate-500'} line-clamp-1 mb-1`}>Preciso do seu conselho.</p>
                            <span className="text-[12px] font-bold text-emerald-500/80">Rel. estável</span>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-[#007AFF] text-white flex items-center justify-center text-[11px] font-bold shadow-md">2</div>
                    </div>

                    {/* Mock Beatriz */}
                    <div className={`flex items-center gap-4 px-6 py-5 cursor-pointer relative ${isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5'} transition-colors ${borderClass}`}>
                        <div className="relative flex-shrink-0">
                            <div className="w-[72px] h-[72px] rounded-full overflow-hidden shadow-sm">
                                <img src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&h=150&fit=crop" className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute -bottom-1 -right-0.5 w-6 h-6 rounded-full bg-orange-400 border-2 border-white dark:border-slate-900 shadow-md" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-0.5">
                                <h4 className={`font-bold text-[17px] tracking-tight truncate ${textMain}`}>Beatriz</h4>
                                <span className="text-[12px] font-medium text-slate-400">Ontem</span>
                            </div>
                            <p className={`text-[14px] ${isLight ? 'text-slate-400' : 'text-slate-500'} line-clamp-1 mb-1`}>Amei nossa ligação mais cedo.</p>
                            <span className="text-[12px] font-bold text-orange-400/80">Aquecendo</span>
                        </div>
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 ml-2" />
                    </div>

                    {/* Real Dynamic Contacts */}
                    {recentList.map((contact) => (
                        <div
                            key={contact.id}
                            onClick={() => handleCallContact(contact)}
                            className={`flex items-center gap-4 px-6 py-5 cursor-pointer relative ${isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5'} transition-colors ${borderClass}`}
                        >
                            <div className="relative flex-shrink-0">
                                <div className="w-[72px] h-[72px] rounded-full overflow-hidden shadow-sm bg-slate-100">
                                    {contact.profile?.avatar_url ? (
                                        <img src={contact.profile.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-200 flex items-center justify-center text-3xl">👤</div>
                                    )}
                                </div>
                                <div className={`absolute -bottom-1 -right-0.5 w-6 h-6 rounded-full ${contact.is_ai_contact ? 'bg-pink-500' : 'bg-blue-500'} text-white flex items-center justify-center text-[10px] border-2 border-white dark:border-slate-900 shadow-md`}>
                                    {contact.is_ai_contact ? '⚡' : '👤'}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-0.5">
                                    <h4 className={`font-bold text-[17px] tracking-tight truncate ${textMain}`}>{contact.alias || contact.profile?.display_name}</h4>
                                    <span className="text-[12px] font-medium text-slate-400">Recente</span>
                                </div>
                                <p className={`text-[14px] ${isLight ? 'text-slate-400' : 'text-slate-500'} line-clamp-1 mb-1 font-normal opacity-60 italic`}>
                                    Toque para iniciar chamada...
                                </p>
                                <span className="text-[12px] font-bold text-emerald-500/80">Pronta</span>
                            </div>
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 ml-2" />
                        </div>
                    ))}
                </div>

                {loading && (
                    <div className="p-12 text-center opacity-20 animate-pulse text-2xl font-bold tracking-widest italic">LOADING...</div>
                )}
            </div>

            {/* Float FAB exactly like in the drawing */}
            <div className="fixed bottom-32 right-8 z-50">
                <button
                    onClick={() => setShowAddSelector(true)}
                    className="w-16 h-14 bg-transparent border-none outline-none group flex items-center justify-center"
                >
                    <div className="relative">
                        {/* Custom hand-drawn style plus button from image */}
                        <svg width="40" height="60" viewBox="0 0 40 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 5V55" stroke="#0000FF" strokeWidth="4" strokeLinecap="round" />
                            <path d="M5 45C5 45 15 45 40 45" stroke="#0000FF" strokeWidth="4" strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 bg-blue-600/5 blur-xl group-hover:bg-blue-600/10 transition-all rounded-full" />
                    </div>
                </button>
            </div>

            {/* Selector Modal */}
            {showAddSelector && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className={`w-full max-w-sm p-8 rounded-[3rem] border shadow-2xl ${cardBg} animate-in scale-in-95`}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className={`text-[20px] font-bold font-sans tracking-tight ${textMain}`}>Fixar no Menu</h3>
                            <button onClick={() => setShowAddSelector(false)} className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/5 opacity-50 hover:opacity-100">✕</button>
                        </div>
                        <div className="max-h-80 overflow-y-auto space-y-2 no-scrollbar px-1">
                            {contacts.length === 0 && <p className="text-center py-12 opacity-30 text-sm italic">Sua lista está vazia.</p>}
                            {contacts.map(c => (
                                <button
                                    key={c.id}
                                    onClick={(e) => { togglePin(c.id, e); setShowAddSelector(false); }}
                                    className={`w-full flex items-center gap-4 p-4 rounded-[1.8rem] transition-all ${isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5'} border ${borderClass}`}
                                >
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                                        {c.profile?.avatar_url && <img src={c.profile.avatar_url} className="w-full h-full object-cover" />}
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <p className={`font-bold text-[15px] tracking-tight truncate ${textMain}`}>{c.alias || c.profile?.display_name}</p>
                                        <p className="text-[11px] opacity-40 uppercase tracking-widest font-bold">{c.is_ai_contact ? 'I.A.' : 'Usuário'}</p>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${pinnedIds.includes(c.id) ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-400'}`}>
                                        {pinnedIds.includes(c.id) ? '✓' : '+'}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
