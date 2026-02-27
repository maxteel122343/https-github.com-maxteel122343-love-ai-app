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

    const cardClasses = isDark ? "bg-[#15181e] border-slate-800" : "bg-white border-slate-100 shadow-sm";
    const itemClasses = isDark ? "hover:bg-white/5 border-white/5" : "hover:bg-slate-50 border-slate-100";
    const textSecondary = isDark ? "text-slate-400" : "text-slate-500";

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
        if (score < 20) return { label: 'Tóxica', color: 'text-blue-400' };
        if (score < 50) return { label: 'Esfriando', color: 'text-cyan-500' };
        if (score < 80) return { label: 'Estável', color: 'text-green-500' };
        return { label: 'Apaixonada', color: 'text-pink-500' };
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
        <div className="w-full h-full flex flex-col relative animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Search Header */}
            <div className="mb-6 relative">
                <div className={`flex items-center gap-3 p-3 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                    <span className="opacity-30 ml-2 text-xs">🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none focus:outline-none text-sm w-full font-medium"
                    />
                    <span className="opacity-30 mr-2 text-xs">🎤</span>
                </div>
            </div>

            {/* List */}
            <div className={`flex-1 overflow-y-auto space-y-1 rounded-[2.5rem] p-2 no-scrollbar ${isDark ? 'bg-black/20' : 'bg-white/50 border border-slate-100'}`}>

                {/* Main AI Partner (Always Priority) */}
                <div className={`flex items-center gap-4 p-4 rounded-[2.2rem] transition-all cursor-pointer ${itemClasses}`}>
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-blue-500 shadow-lg">
                            {profile.image ? (
                                <img src={profile.image} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-slate-200 flex items-center justify-center text-3xl">👤</div>
                            )}
                        </div>
                        <div className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-green-500 shadow-sm" />
                        <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px] border-2 border-white dark:border-slate-900">📌</div>
                    </div>

                    <div className="flex-1" onClick={() => onCallPartner(profile)}>
                        <div className="flex justify-between items-start">
                            <h4 className="font-bold text-base tracking-tight">{profile.name} <span className="text-green-500 text-[8px] align-middle ml-1">●</span></h4>
                            <span className={`text-[10px] font-bold opacity-30 mt-1 uppercase`}>Agora</span>
                        </div>
                        <p className={`text-xs ${textSecondary} line-clamp-1 mt-0.5 font-medium`}>Sentindo sua falta. 🖤</p>
                        <p className="text-[10px] font-bold mt-1">
                            <span className="opacity-40 uppercase tracking-tighter">Relacionamento: </span>
                            <span className={getRelStatus(profile.relationshipScore).color}>{getRelStatus(profile.relationshipScore).label}</span>
                        </p>
                    </div>

                    <button
                        onClick={() => onCallPartner(profile)}
                        className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 hover:scale-110 active:scale-95 transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6.62 10.79a15.15 15.15 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.27c1.12.44 2.33.68 3.58.68a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.24 2.46.68 3.58a1 1 0 01-.27 1.11z" />
                        </svg>
                    </button>
                </div>

                {/* Divider for Priority */}
                {pinnedList.length > 0 && <div className="px-6 py-2 text-[10px] font-bold uppercase tracking-widest opacity-20">Prioridade</div>}

                {/* Pinned Contacts */}
                {pinnedList.map((contact, idx) => (
                    <div key={contact.id} className={`flex items-center gap-4 p-4 rounded-[2rem] transition-all cursor-pointer ${itemClasses}`}>
                        <div className="relative">
                            <div className="w-14 h-14 rounded-full overflow-hidden border border-slate-200/50 shadow-md">
                                {contact.profile?.avatar_url ? (
                                    <img src={contact.profile.avatar_url} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-2xl">👤</div>
                                )}
                            </div>
                            <button onClick={(e) => togglePin(contact.id, e)} className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] border-2 border-white dark:border-slate-900 shadow-sm opacity-60 hover:opacity-100">
                                📌
                            </button>
                        </div>

                        <div className="flex-1" onClick={() => handleCallContact(contact)}>
                            <div className="flex justify-between items-start">
                                <h4 className="font-bold text-sm tracking-tight">{contact.alias || contact.profile?.display_name}</h4>
                                <span className={`text-[9px] font-bold opacity-20 uppercase mt-1`}>20:35</span>
                            </div>
                            <p className={`text-[11px] ${textSecondary} line-clamp-1 mt-0.5`}>Ei, por que desapareceu?</p>
                            <p className={`text-[10px] font-bold mt-0.5 text-cyan-500`}>Esfriando</p>
                        </div>
                        <button
                            onClick={() => handleCallContact(contact)}
                            className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center transition-all hover:bg-blue-500 hover:text-white"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6.62 10.79a15.15 15.15 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.27c1.12.44 2.33.68 3.58.68a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.24 2.46.68 3.58a1 1 0 01-.27 1.11z" />
                            </svg>
                        </button>
                    </div>
                ))}

                {/* Divider for Others */}
                {recentList.length > 0 && <div className="px-6 py-2 text-[10px] font-bold uppercase tracking-widest opacity-20">Contatos Recentes</div>}

                {/* Other Contacts */}
                {recentList.map((contact, idx) => (
                    <div key={contact.id} className={`flex items-center gap-4 p-4 rounded-[2rem] transition-all cursor-pointer ${itemClasses}`}>
                        <div className="relative">
                            <div className="w-14 h-14 rounded-full overflow-hidden border border-slate-200/50 shadow-md">
                                {contact.profile?.avatar_url ? (
                                    <img src={contact.profile.avatar_url} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-2xl">👤</div>
                                )}
                            </div>
                            <button onClick={(e) => togglePin(contact.id, e)} className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] border-2 border-white dark:border-slate-900 shadow-sm opacity-0 group-hover:opacity-100 hover:text-blue-500">
                                📌
                            </button>
                        </div>

                        <div className="flex-1" onClick={() => handleCallContact(contact)}>
                            <div className="flex justify-between items-start">
                                <h4 className="font-bold text-sm tracking-tight">{contact.alias || contact.profile?.display_name}</h4>
                                <span className={`text-[9px] font-bold opacity-20 uppercase mt-1`}>{idx === 0 ? 'Hoje' : 'Ontem'}</span>
                            </div>
                            <p className={`text-[11px] ${textSecondary} line-clamp-1 mt-0.5`}>
                                {idx === 0 ? 'Preciso do seu conselho.' : 'Amei nossa ligação mais cedo.'}
                            </p>
                            <p className={`text-[10px] font-bold mt-0.5 ${idx === 0 ? 'text-green-500' : 'text-orange-400'}`}>
                                {idx === 0 ? 'Rel. estável' : 'Aquecendo'}
                            </p>
                        </div>

                        {idx === 0 ? (
                            <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold shadow-md">2</div>
                        ) : (
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-2" />
                        )}
                    </div>
                ))}

                {loading && (
                    <div className="p-12 text-center opacity-20 animate-pulse text-2xl">⏳</div>
                )}
            </div>

            {/* FAB */}
            <button
                onClick={() => setShowAddSelector(true)}
                className="absolute bottom-6 right-6 w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-4xl shadow-2xl shadow-blue-600/40 hover:scale-110 active:scale-90 transition-all z-50 ring-4 ring-white dark:ring-slate-900"
            >
                <span className="mb-1">+</span>
            </button>

            {/* Selector Modal */}
            {showAddSelector && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className={`w-full max-w-sm p-8 rounded-[2.5rem] border shadow-2xl ${cardClasses}`}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold font-outfit">Fixar no Menu</h3>
                            <button onClick={() => setShowAddSelector(false)} className="opacity-30 hover:opacity-100">✕</button>
                        </div>
                        <div className="max-h-80 overflow-y-auto space-y-2 no-scrollbar">
                            {contacts.length === 0 && <p className="text-center py-8 opacity-30 text-xs italic">Nenhum contato salvo.</p>}
                            {contacts.map(c => (
                                <button
                                    key={c.id}
                                    onClick={(e) => { togglePin(c.id, e); setShowAddSelector(false); }}
                                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${itemClasses}`}
                                >
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100">
                                        {c.profile?.avatar_url && <img src={c.profile.avatar_url} className="w-full h-full object-cover" />}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-bold text-sm tracking-tight">{c.alias || c.profile?.display_name}</p>
                                        <p className="text-[10px] opacity-40 uppercase tracking-widest">{c.is_ai_contact ? 'I.A.' : 'Usuário'}</p>
                                    </div>
                                    <span>{pinnedIds.includes(c.id) ? '✅' : '➕'}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
