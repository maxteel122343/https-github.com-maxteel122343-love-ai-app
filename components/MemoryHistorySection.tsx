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

    const cardClasses = isDark ? "bg-[#15181e] border-slate-800" : "bg-white border-slate-100 shadow-sm";
    const itemClasses = isDark ? "bg-[#0b0c10] border-white/5" : "bg-slate-50 border-slate-200/50 shadow-sm";

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
        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-tighter ${color} border border-current opacity-70`}>
            {label}
        </span>
    );

    return (
        <div className="w-full flex flex-col gap-6 animate-in fade-in duration-500">
            {/* Sub-Tabs */}
            <div className="flex flex-wrap gap-2 p-1 rounded-3xl bg-black/5 dark:bg-white/5 border border-inherit">
                {[
                    { id: 'memory', label: '🧠 Memória', desc: 'Assuntos e Observações' },
                    { id: 'history', label: '📊 Histórico', desc: 'Linha do Tempo' },
                    { id: 'personality', label: '🎭 Personalidade', desc: 'Evolução da IA' },
                    { id: 'user_profile', label: '👤 Perfil', desc: 'Análise Psicológica' },
                    { id: 'strategy', label: '⏰ Estratégia', desc: 'Planejamento' },
                    { id: 'external', label: '🌐 Global', desc: 'Interações Externas' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setSubTab(tab.id as SubTab)}
                        className={`flex-1 min-w-[120px] px-4 py-3 rounded-2xl transition-all flex flex-col items-center gap-1 ${subTab === tab.id
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-60'
                            }`}
                    >
                        <span className="text-xs font-bold uppercase tracking-widest">{tab.label}</span>
                        <span className="text-[8px] opacity-70 font-medium">{tab.desc}</span>
                    </button>
                ))}
            </div>

            <main className="min-h-[400px]">
                {loading ? (
                    <div className="flex items-center justify-center p-24 opacity-20 animate-pulse text-2xl">⏳</div>
                ) : (
                    <>
                        {subTab === 'memory' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Topics Section */}
                                <section className={`p-8 rounded-[2.5rem] border ${cardClasses}`}>
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">Banco de Assuntos (Continuity Engine)</h3>
                                        <button className="p-2 hover:bg-black/5 rounded-xl text-blue-500">✏️ EDIT</button>
                                    </div>
                                    <div className="space-y-4">
                                        {topics.length === 0 ? <p className="text-center py-12 opacity-30 italic text-sm">Nenhum assunto registrado.</p> : topics.map(topic => (
                                            <div key={topic.id} className={`p-4 rounded-2xl border ${itemClasses} flex justify-between items-center`}>
                                                <div>
                                                    <h4 className="font-bold text-sm tracking-tight">{topic.title}</h4>
                                                    <div className="flex gap-2 mt-2">
                                                        <StatusBadge label={topic.status} color={topic.status === 'active' ? 'text-green-500' : 'text-slate-400'} />
                                                        <StatusBadge label={`Interesse: ${topic.interest_level}`} color="text-blue-500" />
                                                    </div>
                                                </div>
                                                <span className="text-[10px] opacity-40 font-mono">{new Date(topic.last_updated_at).toLocaleDateString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* Insights Section */}
                                <section className={`p-8 rounded-[2.5rem] border ${cardClasses}`}>
                                    <h3 className="text-xs font-bold uppercase tracking-widest opacity-40 mb-6">Observações da IA (Insights)</h3>
                                    <div className="space-y-6">
                                        {conversations.map(conv => (
                                            <div key={conv.id} className="relative pl-6 border-l-2 border-blue-500/20">
                                                <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-blue-500" />
                                                <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest mb-1">{new Date(conv.started_at).toLocaleString()}</p>
                                                {conv.conversation_insights?.map((insight: any) => (
                                                    <div key={insight.id} className={`p-5 rounded-2xl border ${itemClasses}`}>
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div className="flex gap-2">
                                                                <StatusBadge label={insight.detected_emotion || 'Neutra'} color="text-pink-500" />
                                                                <StatusBadge label={`Engagement: ${insight.engagement_score}%`} color="text-blue-500" />
                                                            </div>
                                                        </div>
                                                        <p className="text-sm italic opacity-70 mb-3 leading-relaxed">"{insight.summary}"</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {insight.key_points?.map((point: string, i: number) => (
                                                                <span key={i} className="text-[9px] px-2 py-1 bg-blue-500/5 rounded-lg border border-blue-500/10"># {point}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </section> section
                            </div>
                        )}

                        {subTab === 'personality' && (
                            <div className="max-w-2xl mx-auto space-y-8">
                                <section className={`p-10 rounded-[3rem] border ${cardClasses} text-center`}>
                                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-4xl text-white mx-auto shadow-2xl mb-6">🎭</div>
                                    <h3 className="text-2xl font-bold mb-2">Personalidade Evolutiva</h3>
                                    <p className="text-sm opacity-50 px-12 mb-10">O tom e comportamento da sua IA mudam conforme vocês interagem.</p>

                                    <div className="space-y-8 text-left">
                                        {[
                                            { label: 'Nível de Intimidade', value: stats?.intimacy_level || 0, icon: '❤️' },
                                            { label: 'Uso de Humor', value: stats?.humor_usage || 50, icon: '😂' },
                                            { label: 'Iniciativa de Contato', value: stats?.initiative_level || 50, icon: '⚡' }
                                        ].map(stat => (
                                            <div key={stat.label}>
                                                <div className="flex justify-between items-end mb-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">{stat.icon} {stat.label}</span>
                                                    <span className="text-lg font-bold">{stat.value}%</span>
                                                </div>
                                                <div className="w-full h-2 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${stat.value}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        )}

                        {subTab === 'user_profile' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { title: 'Preferências', data: psychProfile?.preferences, icon: '🌟' },
                                    { title: 'Traços de Personalidade', data: psychProfile?.personality_traits, icon: '🧠' },
                                    { title: 'Padrões de Comportamento', data: psychProfile?.behavior_patterns, icon: '📈' }
                                ].map(card => (
                                    <div key={card.title} className={`p-8 rounded-[2.5rem] border ${cardClasses}`}>
                                        <div className="flex items-center gap-3 mb-6">
                                            <span className="text-2xl">{card.icon}</span>
                                            <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-40">{card.title}</h4>
                                        </div>
                                        <div className="space-y-4">
                                            {card.data ? Object.entries(card.data).map(([k, v]: any) => (
                                                <div key={k} className="flex justify-between items-center text-sm border-b border-inherit pb-2">
                                                    <span className="opacity-60">{k}</span>
                                                    <span className="font-bold">{v}</span>
                                                </div>
                                            )) : <p className="text-xs opacity-30 italic">Nenhum dado analítico ainda...</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {subTab === 'strategy' && (
                            <div className={`p-8 rounded-[2.5rem] border ${cardClasses}`}>
                                <h3 className="text-xs font-bold uppercase tracking-widest opacity-40 mb-8">Logs de Estratégia de Chamada</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-[10px] font-bold uppercase tracking-widest opacity-30">
                                                <th className="pb-4">Horário Testado</th>
                                                <th className="pb-4">Contexto</th>
                                                <th className="pb-4">Resultado</th>
                                                <th className="pb-4">Eficiência</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {strategyLogs.map(log => (
                                                <tr key={log.id} className="border-t border-inherit">
                                                    <td className="py-4 font-mono">{new Date(log.created_at).toLocaleTimeString()}</td>
                                                    <td className="py-4 opacity-60">{log.context}</td>
                                                    <td className="py-4">
                                                        {log.answered ? <span className="text-green-500 font-bold">Atendeu</span> : log.ignored ? <span className="text-red-500 font-bold">Ignorou</span> : <span className="opacity-30">Perdida</span>}
                                                    </td>
                                                    <td className="py-4">
                                                        <div className="w-24 h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                                            <div className="h-full bg-blue-500" style={{ width: `${log.success_score}%` }} />
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className={`p-10 rounded-[2.5rem] border ${cardClasses}`}>
                                    <h3 className="text-xs font-bold uppercase tracking-widest opacity-40 mb-6">Interações Globais (Plataforma)</h3>
                                    <div className="space-y-6">
                                        {externalInteractions.length === 0 ? <p className="text-center py-12 opacity-30 italic">Sem interações externas registradas.</p> : externalInteractions.map(session => (
                                            <div key={session.id} className={`p-6 rounded-3xl border ${itemClasses} flex flex-col gap-3`}>
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-blue-500/10`}>
                                                            {session.target_type === 'ai' ? '🤖' : '👤'}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-sm tracking-tight">{session.target_type === 'ai' ? 'Interação com outra IA' : 'Conversa com Usuário'}</h4>
                                                            <p className="text-[10px] opacity-40 uppercase tracking-widest">{session.interaction_type}</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] font-bold opacity-30 font-mono">{new Date(session.started_at).toLocaleDateString()}</span>
                                                </div>
                                                {session.interaction_insights?.map((ii: any) => (
                                                    <div key={ii.id} className="pt-3 mt-3 border-t border-inherit flex gap-4 text-[10px]">
                                                        <div><span className="opacity-40">Emoção:</span> <span className="font-bold">{ii.emotion_detected}</span></div>
                                                        <div><span className="opacity-40">Engajamento:</span> <span className="font-bold">{ii.engagement_score}%</span></div>
                                                        <div><span className="opacity-40">Dominância:</span> <span className="font-bold">{ii.social_dominance_level}</span></div>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className={`p-10 rounded-[2.5rem] border ${cardClasses} flex flex-col items-center justify-center text-center opacity-30`}>
                                    <div className="text-4xl mb-4">💎</div>
                                    <h4 className="font-bold">Em breve: Relatórios de Exportação</h4>
                                    <p className="text-xs">Baixe seu dossiê comportamental completo em PDF ou JSON.</p>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};
