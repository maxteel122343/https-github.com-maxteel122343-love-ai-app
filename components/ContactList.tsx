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

    const cardClasses = isDark ? "bg-[#15181e] border-slate-800" : "bg-white border-slate-100 shadow-sm";
    const itemClasses = isDark ? "hover:bg-white/5 border-white/5" : "hover:bg-slate-50 border-slate-100";

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
            .or(`personal_number.eq.${searchQuery},ai_number.eq.${searchQuery}`)
            .single();

        setSearchResult(data || null);
        if (!data) alert("Nenhum usuário ou IA encontrado com esse número.");
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

        // First, check if a profile with this number exists. If not, we might need a placeholder or logic to handle "external" contacts.
        // For now, let's create a "virtual" contact for the user. 
        // In a real app, you'd likely hit an RPC to create this contact specifically.

        const { error } = await supabase
            .from('contacts')
            .insert({
                owner_id: currentUser.id,
                contact_name: newContact.name,
                is_ai_contact: newContact.type === 'ai',
                status: 'offline', // Placeholder
                alias: newContact.name,
                // Using a JSON metadata field for the manual data if possible, or just standard fields
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

    const handleCallContact = (contact: Contact) => {
        if (!contact.profile) return;

        // Map the stored AI settings back to a PartnerProfile
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
            language: contact.profile.ai_settings?.language || PlatformLanguage.PT
        };

        onCallPartner(partnerProfile);
    };

    return (
        <div className="w-full flex flex-col gap-6">
            {/* My ID Card */}
            {myProfile && (
                <div className={`p-6 rounded-[2rem] border ${cardClasses} flex justify-between items-center bg-gradient-to-r from-blue-500/5 to-transparent`}>
                    <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">Meus Números</h3>
                        <div className="flex gap-4">
                            <div>
                                <p className="text-xs opacity-60">Pessoal</p>
                                <p className="text-lg font-bold font-mono text-blue-500">{myProfile.personal_number}</p>
                            </div>
                            <div className="w-[1px] h-10 bg-slate-500/10" />
                            <div>
                                <p className="text-xs opacity-60">Minha IA</p>
                                <p className="text-lg font-bold font-mono text-pink-500">{myProfile.ai_number}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Search Bar */}
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && searchContact()}
                        placeholder="BUSCAR POR NÚMERO (EX: AI-1234)..."
                        className={`w-full p-5 pr-12 rounded-[1.5rem] border text-sm font-mono tracking-wider transition-all shadow-sm ${isDark ? 'bg-white/5 border-white/5 focus:bg-white/10' : 'bg-white border-slate-100 focus:border-blue-500'
                            }`}
                    />
                    <button
                        onClick={searchContact}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-black/5 rounded-full transition-all"
                    >
                        {loading ? "..." : "🔍"}
                    </button>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="aspect-square p-5 bg-blue-600 text-white rounded-[1.5rem] shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all text-xl"
                    title="Novo Contato"
                >
                    +
                </button>
            </div>

            {/* Search Result */}
            {searchResult && (
                <div className={`p-6 rounded-[2rem] border-2 border-blue-500/30 animate-in fade-in slide-in-from-top-4 ${cardClasses}`}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-2xl">
                            👤
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold">{searchResult.display_name}</h4>
                            <p className="text-[10px] opacity-50 uppercase tracking-widest">{searchResult.personal_number}</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => addContact(searchResult, false)}
                                className="px-3 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700"
                            >
                                Adicionar Usuário
                            </button>
                            <button
                                onClick={() => addContact(searchResult, true)}
                                className="px-3 py-2 bg-pink-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-pink-700"
                            >
                                Adicionar IA
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Contacts List */}
            <div className={`rounded-[2rem] border overflow-hidden ${cardClasses}`}>
                <div className="p-6 border-b border-inherit">
                    <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">Meus Contatos</h3>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                    {contacts.length === 0 ? (
                        <div className="p-12 text-center opacity-30 italic">
                            Sua lista de contatos está vazia.
                        </div>
                    ) : (
                        contacts.map((contact) => (
                            <div
                                key={contact.id}
                                className={`flex items-center gap-4 p-4 border-b transition-all ${itemClasses} last:border-0`}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${contact.is_ai_contact ? 'bg-pink-500/10 text-pink-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                    {contact.is_ai_contact ? '⚡' : '👤'}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm tracking-tight">{contact.alias}</h4>
                                    <p className="text-[10px] opacity-40 uppercase tracking-widest">
                                        {contact.is_ai_contact ? `Inteligência Artificial (ID: ${contact.profile?.ai_number})` : `Usuário (ID: ${contact.profile?.personal_number})`}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleCallContact(contact)}
                                    className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 hover:scale-110 active:scale-95 transition-all"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
            {/* Manual Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className={`w-full max-w-md p-8 rounded-[2.5rem] border shadow-2xl scale-in-95 animate-in ${cardClasses}`}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold">Novo Contato</h3>
                            <button onClick={() => setShowAddModal(false)} className="opacity-30 hover:opacity-100">✕</button>
                        </div>

                        <div className="space-y-6">
                            {/* Photo Upload */}
                            <div className="flex flex-col items-center gap-4">
                                <div className={`w-24 h-24 rounded-3xl overflow-hidden border-2 ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-100'}`}>
                                    {newContact.image ? (
                                        <img src={newContact.image} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-3xl opacity-20">📸</div>
                                    )}
                                </div>
                                <input id="contact-photo" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                <label htmlFor="contact-photo" className="text-[10px] font-bold uppercase tracking-widest text-blue-500 cursor-pointer hover:underline">
                                    Enviar Foto
                                </label>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2 block">Nome</label>
                                    <input
                                        type="text"
                                        value={newContact.name}
                                        onChange={e => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                                        className={`w-full p-4 rounded-2xl border text-sm ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}
                                        placeholder="Ex: João Silva"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2 block">Número (8 dígitos)</label>
                                    <input
                                        type="text"
                                        maxLength={8}
                                        value={newContact.number}
                                        onChange={e => setNewContact(prev => ({ ...prev, number: e.target.value.replace(/\D/g, '') }))}
                                        className={`w-full p-4 rounded-2xl border text-sm font-mono tracking-widest ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}
                                        placeholder="00000000"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setNewContact(prev => ({ ...prev, type: 'user' }))}
                                        className={`p-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest border transition-all ${newContact.type === 'user' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100'}`}
                                    >
                                        Usuário
                                    </button>
                                    <button
                                        onClick={() => setNewContact(prev => ({ ...prev, type: 'ai' }))}
                                        className={`p-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest border transition-all ${newContact.type === 'ai' ? 'bg-pink-600 border-pink-600 text-white shadow-lg' : isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100'}`}
                                    >
                                        I.A.
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleManualCreate}
                                disabled={loading}
                                className="w-full py-4 bg-blue-600 text-white rounded-[1.5rem] font-bold uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all text-xs"
                            >
                                {loading ? "Salvando..." : "Criar Contato"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
