import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { MOOD_EMOJIS } from '../types';

interface MemoryHistorySectionProps {
    user: any;
    isDark: boolean;
}

type SubTab = 'memory' | 'history' | 'personality' | 'user_profile' | 'strategy' | 'external';

export const MemoryHistorySection: React.FC<MemoryHistorySectionProps> = ({ user, isDark }) => {
    const [subTab, setSubTab] = useState<SubTab>('memory');
    const [loading, setLoading] = useState(false);

    // Data states
    const [stats, setStats] = useState<any>(null);
    const [conversations, setConversations] = useState<any[]>([]);
    const [topics, setTopics] = useState<any[]>([]);
    const [psychProfile, setPsychProfile] = useState<any>(null);
    const [strategyLogs, setStrategyLogs] = useState<any[]>([]);
    const [externalInteractions, setExternalInteractions] = useState<any[]>([]);

    const cardClasses = isDark ? "bg-[#15181e] border-white/5" : "bg-white border-slate-100 shadow-sm";
    const itemClasses = isDark ? "bg-[#0b0c10] border-white/5" : "bg-slate-50 border-slate-200/50 shadow-sm";
    const borderClass = isDark ? "border-white/5" : "border-slate-100";

    useEffect(() => {
        if (user) {
            fetchAllData();
        }
    }, [user, subTab]);

    const fetchAllData = async () => {
        setLoading(true);
        if (subTab === 'memory') {
            const { data: convs } = await supabase.from('conversations').select('*, conversation_insights(*)').order('started_at', { ascending: false }).limit(10);
            const { data: top } = await supabase.from('topics').select('*').order('last_updated_at', { ascending: false });
            if (convs) setConversations(convs);
            if (top) setTopics(top);
        } else if (subTab === 'personality') {
            const { data } = await supabase.from('ai_profiles').select('*').eq('user_id', user.id).single();
            setStats(data);
        } else if (subTab === 'user_profile') {
            const { data } = await supabase.from('user_profile_analysis').select('*').eq('user_id', user.id).single();
            setPsychProfile(data);
        } else if (subTab === 'strategy') {
            const { data } = await supabase.from('call_strategy_logs').select('*').order('created_at', { ascending: false });
            setStrategyLogs(data || []);
        } else if (subTab === 'external') {
            const { data } = await supabase.from('interaction_sessions').select('*, interaction_insights(*)').order('started_at', { ascending: false });
            setExternalInteractions(data || []);
        }
        setLoading(false);
    };

    const StatusBadge = ({ label, color }: { label: string, color: string }) => (
        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${color} bg-current/10 border border-current/20`}>
            {label}
        </span>
    );

    return (
        <div className="w-full flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-black tracking-tighter italic uppercase">Memória Central</h2>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30">Processamento de Insights & Evolução</p>
            </div>

            {/* Sub-Tabs - Modern Pill Layout */}
            <div className="w-full overflow-x-auto no-scrollbar py-2">
                <div className={`inline-flex gap-2 p-1.5 rounded-[2rem] ${isDark ? 'bg-white/5' : 'bg-slate-200/50'} border ${borderClass}`}>
                    {[
                        { id: 'memory', label: 'Cérebro', icon: '🧠', desc: 'Assuntos' },
                        { id: 'history', label: 'Voz', icon: '📞', desc: 'Chamadas' },
                        { id: 'personality', label: 'Ego', icon: '🎭', desc: 'Humor' },
                        { id: 'user_profile', label: 'Id', icon: '👤', desc: 'Análise' },
                        { id: 'strategy', label: 'Plano', icon: '⏰', desc: 'Rotina' },
                        { id: 'external', label: 'Global', icon: '🌐', desc: 'Rede' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setSubTab(tab.id as SubTab)}
                            className={`flex flex-col items-center gap-1 min-w-[90px] px-4 py-3 rounded-[1.5rem] transition-all duration-300 ${subTab === tab.id
                                ? 'bg-white shadow-xl text-blue-600 scale-[1.05]'
                                : 'opacity-40 hover:opacity-100 hover:bg-white/10'
                                }`}
                        >
                            <span className="text-base">{tab.icon}</span>
                            <span className="text-[11px] font-black uppercase tracking-widest leading-none">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <main className="min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-24 gap-4">
                        <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-20">Sincronizando Database...</p>
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-700">
                        {subTab === 'memory' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Topics Section */}
                                <section className={`p-8 rounded-[3rem] border relative overflow-hidden ${cardClasses}`}>
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full" />
                                    <div className="flex justify-between items-center mb-8">
                                        <h3 className="text-xs font-black uppercase tracking-widest opacity-30 italic">Núcleo de Assuntos</h3>
                                        <button className="px-4 py-2 bg-blue-500/10 text-blue-600 rounded-xl text-[10px] font-black uppercase hover:bg-blue-500/20 transition-all tracking-widest">Sincronizar</button>
                                    </div>
                                    <div className="space-y-4">
                                        {topics.length === 0 ? <p className="text-center py-12 opacity-20 italic text-sm">Nenhum assunto indexado.</p> : topics.map(topic => (
                                            <div key={topic.id} className={`p-5 rounded-[2rem] border ${itemClasses} flex justify-between items-center group transition-all hover:border-blue-500/30`}>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-[13px] tracking-tight truncate">{topic.title}</h4>
                                                    <div className="flex gap-2 mt-2">
                                                        <StatusBadge label={topic.status} color={topic.status === 'active' ? 'text-emerald-500' : 'text-slate-400'} />
                                                        <StatusBadge label={`Nível ${topic.interest_level}`} color="text-blue-500" />
                                                    </div>
                                                </div>
                                                <span className="text-[9px] opacity-30 font-black uppercase ml-4">{new Date(topic.last_updated_at).toLocaleDateString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* Insights Section */}
                                <section className={`p-8 rounded-[3rem] border relative overflow-hidden ${cardClasses}`}>
                                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/5 blur-3xl rounded-full" />
                                    <h3 className="text-xs font-black uppercase tracking-widest opacity-30 italic mb-8">Fluxo de Insights</h3>
                                    <div className="space-y-8">
                                        {conversations.length === 0 ? <p className="text-center py-12 opacity-20 italic text-sm">Aguardando dados de sessões.</p> : conversations.map(conv => (
                                            <div key={conv.id} className="relative pl-8 border-l-2 border-blue-500/10">
                                                <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                                <p className="text-[9px] font-black opacity-20 uppercase tracking-[0.2em] mb-3">{new Date(conv.started_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                                {conv.conversation_insights && conv.conversation_insights.length > 0 ? conv.conversation_insights.map((insight: any) => (
                                                    <div key={insight.id} className={`p-6 rounded-[2.5rem] border ${itemClasses} hover:scale-[1.02] transition-transform`}>
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="flex flex-wrap gap-2">
                                                                <StatusBadge label={insight.detected_emotion || 'Neutra'} color="text-pink-500" />
                                                                <StatusBadge label={`Foco: ${insight.engagement_score}%`} color="text-blue-500" />
                                                            </div>
                                                        </div>
                                                        <p className="text-sm font-medium opacity-80 mb-4 leading-relaxed italic">"{insight.summary}"</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {insight.key_points?.map((point: string, i: number) => (
                                                                <span key={i} className="text-[10px] font-bold px-3 py-1.5 bg-white dark:bg-white/5 rounded-full border border-inherit">#{point.toLowerCase().replace(/\s+/g, '')}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )) : <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 opacity-40"><p className="text-[10px] italic">Insights em processamento...</p></div>}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        )}

                        {subTab === 'personality' && (
                            <div className="max-w-2xl mx-auto space-y-8">
                                <section className={`p-12 rounded-[4rem] border relative overflow-hidden text-center ${cardClasses}`}>
                                    <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
                                    <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-5xl text-white mx-auto shadow-2xl mb-10 transform -rotate-3 hover:rotate-0 transition-transform cursor-pointer">🎭</div>
                                    <h3 className="text-3xl font-black italic tracking-tighter uppercase mb-4">Personalidade Evolutiva</h3>
                                    <p className="text-sm font-medium opacity-40 px-12 mb-12 uppercase tracking-widest leading-loose">O núcleo algorítmico se adapta às suas nuances tonais e frequência de interação.</p>

                                    <div className="space-y-12 text-left max-w-md mx-auto">
                                        {[
                                            { label: 'Intimidade Algorítmica', value: stats?.intimacy_level || 0, icon: '❤️', color: 'bg-rose-500' },
                                            { label: 'Frequência de Humor', value: stats?.humor_usage || 50, icon: '😂', color: 'bg-amber-500' },
                                            { label: 'Auto-Iniciativa', value: stats?.initiative_level || 50, icon: '⚡', color: 'bg-blue-500' }
                                        ].map(stat => (
                                            <div key={stat.label}>
                                                <div className="flex justify-between items-end mb-4">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{stat.icon} {stat.label}</span>
                                                    <span className="text-2xl font-black tracking-tighter italic">{stat.value}%</span>
                                                </div>
                                                <div className="w-full h-2.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                                    <div className={`h-full transition-all duration-[1.5s] ease-out ${stat.color} shadow-[0_0_15px_rgba(0,0,0,0.1)]`} style={{ width: `${stat.value}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        )}

                        {subTab === 'user_profile' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {[
                                    { title: 'Preferências', data: psychProfile?.preferences, icon: '🌟', color: 'text-amber-500' },
                                    { title: 'Traços de Id', data: psychProfile?.personality_traits, icon: '🧠', color: 'text-blue-500' },
                                    { title: 'Padrões de Ego', data: psychProfile?.behavior_patterns, icon: '📈', color: 'text-pink-500' }
                                ].map(card => (
                                    <div key={card.title} className={`p-10 rounded-[3rem] border flex flex-col ${cardClasses}`}>
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/5 flex items-center justify-center text-2xl shadow-sm">{card.icon}</div>
                                            <div>
                                                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-30">{card.title}</h4>
                                                <p className="text-[8px] font-bold text-blue-500 uppercase tracking-widest">Database Alpha</p>
                                            </div>
                                        </div>
                                        <div className="space-y-6 flex-1">
                                            {card.data ? Object.entries(card.data).map(([k, v]: any) => (
                                                <div key={k} className="group border-b border-inherit pb-3 transition-colors hover:border-blue-500/20">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-30 block mb-1">{k}</span>
                                                    <span className="text-[13px] font-black tracking-tight">{v}</span>
                                                </div>
                                            )) : (
                                                <div className="h-full flex flex-col items-center justify-center py-20 opacity-20">
                                                    <div className="text-3xl mb-4">📂</div>
                                                    <p className="text-[9px] font-bold uppercase tracking-widest">Coletando Dados...</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {subTab === 'strategy' && (
                            <div className={`p-10 rounded-[3rem] border relative overflow-hidden ${cardClasses}`}>
                                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 blur-[100px] rounded-full" />
                                <h3 className="text-xs font-black uppercase tracking-widest opacity-30 italic mb-10">Cronograma de Engajamento</h3>
                                <div className="overflow-x-auto no-scrollbar">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-[10px] font-black uppercase tracking-widest opacity-20">
                                                <th className="pb-6">Timestamp</th>
                                                <th className="pb-6 px-4">Contexto de Gatilho</th>
                                                <th className="pb-6 text-center">Status</th>
                                                <th className="pb-6 text-right">Eficiência</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-[13px] font-bold">
                                            {strategyLogs.length === 0 ? <tr><td colSpan={4} className="py-20 text-center opacity-20 italic">Aguardando telemetria de chamadas...</td></tr> : strategyLogs.map(log => (
                                                <tr key={log.id} className="border-t border-inherit group transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                                                    <td className="py-6 font-mono text-[11px] opacity-40">{new Date(log.created_at).toLocaleTimeString('pt-BR')}</td>
                                                    <td className="py-6 px-4 tracking-tight">{log.context}</td>
                                                    <td className="py-6 text-center">
                                                        {log.answered
                                                            ? <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase">Atendeu ✓</span>
                                                            : <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase">Perdida ✕</span>
                                                        }
                                                    </td>
                                                    <td className="py-6 text-right">
                                                        <div className="flex items-center justify-end gap-3">
                                                            <span className="text-[11px] font-black">{log.success_score}%</span>
                                                            <div className="w-16 h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                                                <div className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]" style={{ width: `${log.success_score}%` }} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {subTab === 'external' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className={`p-10 rounded-[3.5rem] border relative overflow-hidden ${cardClasses}`}>
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl rounded-full" />
                                    <h3 className="text-xs font-black uppercase tracking-widest opacity-30 italic mb-10">Malha de Conexões Externas</h3>
                                    <div className="space-y-6">
                                        {externalInteractions.length === 0 ? <p className="text-center py-20 opacity-20 italic">Rede local. Nenhuma conexão global detectada.</p> : externalInteractions.map(session => (
                                            <div key={session.id} className={`p-8 rounded-[2.5rem] border ${itemClasses} hover:border-blue-500/30 transition-all`}>
                                                <div className="flex justify-between items-center mb-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-14 h-14 rounded-2xl bg-white dark:bg-white/5 flex items-center justify-center text-3xl shadow-sm">
                                                            {session.target_type === 'ai' ? '🤖' : '👤'}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-[15px] tracking-tight">{session.target_type === 'ai' ? 'Protocolo AI-to-AI' : 'Interface de Usuário'}</h4>
                                                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-0.5">{session.interaction_type}</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-[11px] font-mono opacity-20 font-black">{new Date(session.started_at).toLocaleDateString('pt-BR')}</span>
                                                </div>
                                                {session.interaction_insights?.map((ii: any) => (
                                                    <div key={ii.id} className="pt-6 mt-6 border-t border-inherit grid grid-cols-3 gap-2">
                                                        <div className="text-center">
                                                            <p className="text-[9px] font-black opacity-20 uppercase mb-1">Impacto</p>
                                                            <p className="text-[12px] font-bold text-pink-500">{ii.emotion_detected}</p>
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-[9px] font-black opacity-20 uppercase mb-1">Sinapse</p>
                                                            <p className="text-[12px] font-bold text-blue-500">{ii.engagement_score}%</p>
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-[9px] font-black opacity-20 uppercase mb-1">Alpha</p>
                                                            <p className="text-[12px] font-bold text-emerald-500">{ii.social_dominance_level}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className={`p-12 rounded-[3.5rem] border ${cardClasses} flex flex-col items-center justify-center text-center relative overflow-hidden group`}>
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-pink-500/5 opacity-50" />
                                    <div className="w-24 h-24 rounded-full bg-white dark:bg-white/5 flex items-center justify-center text-5xl mb-8 shadow-2xl group-hover:scale-110 transition-transform">💎</div>
                                    <h4 className="text-2xl font-black italic tracking-tighter uppercase mb-4">Relatórios High-D</h4>
                                    <p className="text-sm font-medium opacity-40 px-8 uppercase tracking-[0.2em] leading-relaxed mb-8">Exportação completa de logs e telemetria comportamental em 4D.</p>
                                    <button className="px-10 py-4 bg-black dark:bg-white text-white dark:text-black rounded-full text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl hover:scale-105 active:scale-95 transition-all">Em Breve</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};
