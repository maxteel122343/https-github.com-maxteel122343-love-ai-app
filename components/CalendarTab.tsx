import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Reminder, PartnerProfile, CallLog, Mood } from '../types';

interface CalendarTabProps {
    user: any;
    profile: PartnerProfile;
    setProfile: React.Dispatch<React.SetStateAction<PartnerProfile>>;
    isDark: boolean;
}

export const CalendarTab: React.FC<CalendarTabProps> = ({ user, profile, setProfile, isDark }) => {
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [editReminder, setEditReminder] = useState<Partial<Reminder> | null>(null);

    const cardClasses = isDark ? "bg-[#15181e] border-slate-800" : "bg-white border-slate-100 shadow-sm";
    const itemClasses = isDark ? "hover:bg-white/5 border-white/5" : "hover:bg-slate-50 border-slate-100 shadow-sm";

    useEffect(() => {
        if (user) {
            fetchReminders();
        }
    }, [user]);

    const fetchReminders = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('reminders')
            .select('*')
            .eq('owner_id', user.id)
            .order('trigger_at', { ascending: true });
        if (data) setReminders(data);
        setLoading(false);
    };

    const addLogToHistory = (message: string) => {
        const newLog: CallLog = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            durationSec: 0,
            moodEnd: profile.mood,
            notes: message
        };
        setProfile(prev => {
            const updated = { ...prev, history: [...prev.history, newLog] };
            // Sync to supabase if user logged in
            if (user) {
                supabase.from('profiles').update({ ai_settings: updated }).eq('id', user.id).then();
            }
            return updated;
        });
    };

    const handleUpdateReminder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editReminder || !editReminder.title || !editReminder.trigger_at) return;

        const isNew = !editReminder.id;
        const msg = isNew ? `Adicionou lembrete: ${editReminder.title}` : `Alterou o lembrete "${editReminder.title}" no calendário.`;

        if (isNew) {
            await supabase.from('reminders').insert({
                owner_id: user.id,
                title: editReminder.title,
                trigger_at: editReminder.trigger_at
            });
        } else {
            await supabase.from('reminders').update({
                title: editReminder.title,
                trigger_at: editReminder.trigger_at
            }).eq('id', editReminder.id);
        }

        addLogToHistory(msg);
        setEditReminder(null);
        fetchReminders();

        // Curiosity logic: If user changes a reminder, there's a 30% chance the AI gets "curious"
        if (!isNew && Math.random() < 0.3) {
            // This would ideally trigger a call. 
            // Since this component is inside SetupScreen, we can only notify via history 
            // but the App.tsx logic will pick up random calls.
            // We could set a special flag in dailyContext or just let the random chance in App.tsx handle it with the updated history.
        }
    };

    const deleteReminder = async (id: string) => {
        if (!confirm("Excluir este compromisso?")) return;
        await supabase.from('reminders').delete().eq('id', id);
        addLogToHistory("Excluiu um compromisso do calendário.");
        fetchReminders();
    };

    // Calendar Helper functions
    const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const days = getDaysInMonth(selectedDate);
    const firstDay = getFirstDayOfMonth(selectedDate);
    const monthName = selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    const filteredReminders = reminders.filter(r => {
        const d = new Date(r.trigger_at);
        return d.getDate() === selectedDate.getDate() &&
            d.getMonth() === selectedDate.getMonth() &&
            d.getFullYear() === selectedDate.getFullYear();
    });

    return (
        <div className="w-full flex flex-col lg:flex-row gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Calendar View */}
            <div className={`flex-1 p-8 rounded-[2.5rem] border ${cardClasses}`}>
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-bold capitalize">{monthName}</h3>
                    <div className="flex gap-2">
                        <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))} className="p-2 rounded-xl hover:bg-black/5">‹</button>
                        <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))} className="p-2 rounded-xl hover:bg-black/5">›</button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-2 mb-4">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                        <div key={d} className="text-center text-[10px] font-bold opacity-30 py-2">{d}</div>
                    ))}
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                    {Array.from({ length: days }).map((_, i) => {
                        const day = i + 1;
                        const isToday = new Date().toDateString() === new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day).toDateString();
                        const isSelected = selectedDate.getDate() === day;
                        const hasReminder = reminders.some(r => {
                            const rd = new Date(r.trigger_at);
                            return rd.getDate() === day && rd.getMonth() === selectedDate.getMonth() && rd.getFullYear() === selectedDate.getFullYear();
                        });

                        return (
                            <button
                                key={day}
                                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day))}
                                className={`h-12 rounded-2xl flex flex-col items-center justify-center relative transition-all ${isSelected ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-blue-500/10'
                                    } ${isToday && !isSelected ? 'border-2 border-blue-500/30' : ''}`}
                            >
                                <span className="text-sm font-bold">{day}</span>
                                {hasReminder && <div className={`w-1 h-1 rounded-full absolute bottom-2 ${isSelected ? 'bg-white' : 'bg-blue-500'}`} />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Reminders List */}
            <div className="flex-1 flex flex-col gap-6">
                <div className={`p-8 rounded-[2.5rem] border ${cardClasses} flex-1`}>
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-40">Compromissos</h3>
                            <p className="text-lg font-bold">
                                {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                            </p>
                        </div>
                        <button
                            onClick={() => setEditReminder({ title: '', trigger_at: selectedDate.toISOString() })}
                            className="p-3 bg-blue-600 text-white rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>

                    <div className="space-y-3">
                        {filteredReminders.length === 0 ? (
                            <div className="py-12 text-center opacity-30 italic text-sm">
                                Nenhum compromisso para este dia.
                            </div>
                        ) : (
                            filteredReminders.map(r => (
                                <div key={r.id} className={`p-4 rounded-[1.5rem] border transition-all flex items-center gap-4 ${itemClasses}`}>
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-lg">📅</div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-sm truncate">{r.title}</h4>
                                        <p className="text-[10px] opacity-40 uppercase tracking-widest">
                                            {new Date(r.trigger_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => setEditReminder(r)} className="p-2 hover:bg-blue-500/10 rounded-lg text-blue-500">✏️</button>
                                        <button onClick={() => deleteReminder(r.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-red-500">🗑️</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {editReminder && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className={`w-full max-w-sm p-8 rounded-[2.5rem] border ${cardClasses} shadow-2xl`}>
                        <h3 className="text-xl font-bold mb-6">{editReminder.id ? 'Editar Lembrete' : 'Novo Lembrete'}</h3>
                        <form onSubmit={handleUpdateReminder} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-4 mb-2 block">Título</label>
                                <input
                                    type="text"
                                    autoFocus
                                    value={editReminder.title}
                                    onChange={e => setEditReminder({ ...editReminder, title: e.target.value })}
                                    className={`w-full p-4 rounded-2xl border outline-none focus:border-blue-500 transition-all ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-4 mb-2 block">Data e Hora</label>
                                <input
                                    type="datetime-local"
                                    value={editReminder.trigger_at?.slice(0, 16)}
                                    onChange={e => setEditReminder({ ...editReminder, trigger_at: new Date(e.target.value).toISOString() })}
                                    className={`w-full p-4 rounded-2xl border outline-none focus:border-blue-500 transition-all ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}
                                    required
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setEditReminder(null)} className="flex-1 py-4 font-bold opacity-40 hover:opacity-100 transition-all uppercase tracking-widest text-[10px]">Cancelar</button>
                                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
