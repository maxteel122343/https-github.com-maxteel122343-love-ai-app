import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Contact, PartnerProfile, Mood, VoiceName, Accent, CallbackIntensity, PlatformLanguage } from '../types';

interface ContactListProps {
    currentUser: any;
    onCallPartner: (profile: PartnerProfile) => void;
    isDark: boolean;
}

export const ContactList: React.FC<ContactListProps> = ({ currentUser, onCallPartner, isDark }) => {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newContact, setNewContact] = useState({ name: '', number: '', image: '', type: 'user' as 'user' | 'ai' });

    const cardClasses = isDark ? "bg-[#15181e] border-white/5" : "bg-white border-slate-100 shadow-sm";
    const itemClasses = isDark ? "hover:bg-white/5 border-white/5 bg-[#0b0c10]" : "hover:bg-slate-50 border-slate-100 bg-white";
    const inputClasses = isDark ? "bg-white/5 border-white/10 text-white focus:border-blue-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500";

    useEffect(() => {
        if (currentUser) {
            fetchMyProfile();
            fetchContacts();
        }
    }, [currentUser]);

    const fetchMyProfile = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        if (data) setMyProfile(data);
    };

    const fetchContacts = async () => {
        const { data, error } = await supabase
            .from('contacts')
            .select(`
                *,
                profile:target_id (*)
            `)
            .eq('owner_id', currentUser.id);

        if (data) setContacts(data);
    };

    const searchContact = async () => {
        if (!searchQuery.trim()) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .or(`personal_number.eq.${searchQuery},ai_number.eq.${searchQuery},nickname.ilike.%${searchQuery}%`)
            .single();

        setSearchResult(data || null);
        if (!data) alert("Nenhum usuário ou IA encontrado com esse número ou apelido.");
        setLoading(false);
    };

    const addContact = async (profile: UserProfile, isAi: boolean) => {
        const { error } = await supabase
            .from('contacts')
            .insert({
                owner_id: currentUser.id,
                target_id: profile.id,
                is_ai_contact: isAi,
                alias: profile.display_name
            });

        if (error) {
            alert("Erro ao adicionar contato ou contato já existe.");
        } else {
            // Send notification to the target user
            await supabase.from('notifications').insert({
                user_id: profile.id,
                type: 'contact_added',
                content: `${myProfile?.display_name || 'Alguém'} adicionou você aos contatos!`
            });

            setSearchResult(null);
            setSearchQuery('');
            fetchContacts();
        }
    };

    const handleManualCreate = async () => {
        if (!newContact.name || newContact.number.length !== 8) {
            alert("Preencha o nome e um número de exatamente 8 dígitos.");
            return;
        }

        setLoading(true);
        const { error } = await supabase
            .from('contacts')
            .insert({
                owner_id: currentUser.id,
                contact_name: newContact.name,
                is_ai_contact: newContact.type === 'ai',
                status: 'offline',
                alias: newContact.name,
            });

        if (error) {
            console.error(error);
            alert("Erro ao salvar contato.");
        } else {
            setShowAddModal(false);
            setNewContact({ name: '', number: '', image: '', type: 'user' });
            fetchContacts();
        }
        setLoading(false);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setNewContact(prev => ({ ...prev, image: reader.result as string }));
            reader.readAsDataURL(file);
        }
    };

    const filteredContacts = contacts.filter(contact => {
        const query = searchQuery.toLowerCase();
        return (
            contact.alias?.toLowerCase().includes(query) ||
            contact.contact_name?.toLowerCase().includes(query) ||
            contact.profile?.display_name?.toLowerCase().includes(query) ||
            contact.profile?.personal_number?.includes(query) ||
            contact.profile?.ai_number?.includes(query)
        );
    });

    const handleCallContact = (contact: Contact) => {
        if (!contact.profile) return;
        const partnerProfile: PartnerProfile = {
            name: contact.is_ai_contact ? `AI ${contact.profile.display_name}` : contact.profile.display_name,
            image: contact.profile.avatar_url || contact.profile.ai_settings?.image || null,
            personality: contact.profile.ai_settings?.personality || "Personalidade misteriosa...",
            dailyContext: "",
            mood: contact.profile.ai_settings?.mood || Mood.LOVE,
            voice: contact.profile.ai_settings?.voice || VoiceName.Kore,
            accent: contact.profile.ai_settings?.accent || Accent.PAULISTA,
            intensity: contact.profile.ai_settings?.intensity || CallbackIntensity.MEDIUM,
            theme: isDark ? 'dark' : 'light',
            relationshipScore: 100,
            history: [],
            language: contact.profile.ai_settings?.language || PlatformLanguage.PT,
            gemini_api_key: contact.profile.ai_settings?.gemini_api_key
        };
        onCallPartner(partnerProfile);
    };

    return (
        <div className="w-full flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-black tracking-tighter italic uppercase">Contatos</h2>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30">Diretório de Conexões</p>
            </div>

            {/* My ID Card */}
            {myProfile && (
                <div className={`p-8 rounded-[3rem] border relative overflow-hidden ${cardClasses}`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full" />
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-6 italic">Minha Identidade Digital</h3>
                        <div className="flex flex-col sm:flex-row gap-8">
                            <div className="flex-1">
                                <p className="text-[9px] font-black opacity-20 uppercase tracking-widest mb-1">Linha Pessoal</p>
                                <p className="text-2xl font-black italic tracking-tighter text-blue-600">{myProfile.personal_number}</p>
                            </div>
                            <div className="hidden sm:block w-[1px] bg-inherit opacity-20" />
                            <div className="flex-1">
                                <p className="text-[9px] font-black opacity-20 uppercase tracking-widest mb-1">Cortex AI (Público)</p>
                                <p className="text-2xl font-black italic tracking-tighter text-pink-600">{myProfile.ai_number}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Search Bar */}
            <div className="flex gap-4">
                <div className="relative flex-1 group">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchContact()}
                        placeholder="BUSCAR POR NOME OU NÚMERO..."
                        className={`w-full p-6 pr-14 rounded-[2rem] border text-xs font-black tracking-[0.2em] transition-all duration-300 shadow-sm outline-none ${inputClasses}`}
                    />
                    <button
                        onClick={searchContact}
                        className="absolute right-5 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all"
                    >
                        {loading ? <div className="w-4 h-4 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" /> : <span className="text-lg">🔍</span>}
                    </button>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="w-16 h-16 bg-blue-600 text-white rounded-[1.8rem] shadow-xl shadow-blue-600/30 hover:scale-110 active:scale-95 transition-all text-2xl flex items-center justify-center font-black"
                >
                    +
                </button>
            </div>

            {/* Search Result */}
            {searchResult && (
                <div className={`p-8 rounded-[3rem] border-2 border-blue-600/30 animate-in fade-in slide-in-from-top-6 ${cardClasses} shadow-2xl`}>
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl text-white shadow-xl">
                            {searchResult.avatar_url ? <img src={searchResult.avatar_url} className="w-full h-full object-cover rounded-[2rem]" /> : '👤'}
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                            <h4 className="text-xl font-black italic tracking-tighter uppercase">{searchResult.display_name}</h4>
                            <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] mt-1">{searchResult.personal_number}</p>
                        </div>
                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                            <button
                                onClick={() => addContact(searchResult, false)}
                                className="px-6 py-3 bg-white dark:bg-white/5 text-blue-600 border border-blue-600/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
                            >
                                Perfil Humano
                            </button>
                            <button
                                onClick={() => addContact(searchResult, true)}
                                className="px-6 py-3 bg-pink-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-pink-700 shadow-lg shadow-pink-600/20 transition-all"
                            >
                                Perfil AI
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Contacts List */}
            <div className={`rounded-[3rem] border overflow-hidden ${cardClasses}`}>
                <div className="p-8 border-b border-inherit bg-black/5 dark:bg-white/5">
                    <h3 className="text-xs font-black uppercase tracking-widest opacity-30 italic">Agenda de Conexões</h3>
                </div>
                <div className="max-h-[500px] overflow-y-auto no-scrollbar">
                    {filteredContacts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 opacity-20 italic">
                            <span className="text-4xl mb-4">🌑</span>
                            <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma conexão encontrada</p>
                        </div>
                    ) : (
                        filteredContacts.map((contact) => (
                            <div
                                key={contact.id}
                                className={`flex items-center gap-5 p-6 border-b transition-all duration-300 ${itemClasses} last:border-0 hover:bg-blue-600/5 group`}
                            >
                                <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center text-2xl shadow-sm transition-transform group-hover:scale-110 ${contact.is_ai_contact ? 'bg-pink-600/10 text-pink-600' : 'bg-blue-600/10 text-blue-600'}`}>
                                    {contact.is_ai_contact ? '⚡' : '👤'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-black text-base tracking-tight truncate italic">{contact.alias}</h4>
                                    <p className="text-[9px] font-black opacity-30 uppercase tracking-widest mt-1">
                                        {contact.is_ai_contact ? `INTELECTO ARTIFICIAL • ${contact.profile?.ai_number || 'OFFLINE'}` : `CONTATO HUMANO • ${contact.profile?.personal_number || 'LATENTE'}`}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleCallContact(contact)}
                                    className="w-12 h-12 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-600/20 hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                    </svg>
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Manual Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/70 backdrop-blur-xl animate-in fade-in duration-500">
                    <div className={`w-full max-w-md p-10 rounded-[4rem] border shadow-[0_48px_80px_-20px_rgba(0,0,0,0.6)] transform animate-in slide-in-from-bottom-12 duration-700 ${cardClasses}`}>
                        <div className="flex justify-between items-start mb-10">
                            <div>
                                <h3 className="text-2xl font-black italic tracking-tighter uppercase">Novo Contato</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-20">Expanda sua rede</p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="w-10 h-10 flex items-center justify-center opacity-30 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all text-xl">✕</button>
                        </div>

                        <div className="space-y-10">
                            {/* Photo Upload */}
                            <div className="flex flex-col items-center gap-6">
                                <div className={`w-32 h-32 rounded-[2.5rem] overflow-hidden border-4 shadow-2xl transition-all hover:scale-105 cursor-pointer ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-white'}`}>
                                    {newContact.image ? (
                                        <img src={newContact.image} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-4xl opacity-10">📸</div>
                                    )}
                                </div>
                                <input id="contact-photo" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                <label htmlFor="contact-photo" className="px-6 py-2 bg-blue-600/10 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-blue-600 hover:text-white transition-all">
                                    Upload Avatar
                                </label>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-blue-600 block mb-3 ml-4">Identificação</label>
                                    <input
                                        type="text"
                                        placeholder="Nome ou Alias"
                                        value={newContact.name}
                                        onChange={e => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                                        className={`w-full p-6 rounded-[2rem] border text-sm font-bold outline-none transition-all ${inputClasses}`}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-blue-600 block mb-3 ml-4">Frequência Digital (8 Dígitos)</label>
                                    <input
                                        type="text"
                                        maxLength={8}
                                        placeholder="00000000"
                                        value={newContact.number}
                                        onChange={e => setNewContact(prev => ({ ...prev, number: e.target.value.replace(/\D/g, '') }))}
                                        className={`w-full p-6 rounded-[2rem] border text-sm font-black tracking-[0.5em] outline-none text-center transition-all ${inputClasses}`}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setNewContact(prev => ({ ...prev, type: 'user' }))}
                                        className={`py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest border transition-all ${newContact.type === 'user' ? 'bg-black dark:bg-white text-white dark:text-black shadow-2xl' : 'border-inherit opacity-40 hover:opacity-100'}`}
                                    >
                                        Humano
                                    </button>
                                    <button
                                        onClick={() => setNewContact(prev => ({ ...prev, type: 'ai' }))}
                                        className={`py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest border transition-all ${newContact.type === 'ai' ? 'bg-pink-600 border-pink-600 text-white shadow-2xl shadow-pink-600/30' : 'border-inherit opacity-40 hover:opacity-100'}`}
                                    >
                                        Artificial
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleManualCreate}
                                disabled={loading}
                                className="w-full py-6 bg-blue-600 text-white rounded-[2.5rem] font-black uppercase tracking-[0.3em] shadow-2xl shadow-blue-500/40 hover:scale-[1.02] active:scale-95 transition-all text-[11px] disabled:opacity-50"
                            >
                                {loading ? "Sincronizando..." : "Estabelecer Conexão"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
