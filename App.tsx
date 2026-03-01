import React, { useState, useEffect } from 'react';
import { SetupScreen } from './components/SetupScreen';
import { CallScreen } from './components/CallScreen';
import { IncomingCallScreen } from './components/IncomingCallScreen';
import { OutboundCallingScreen } from './components/OutboundCallingScreen';
import { PartnerProfile, Mood, VoiceName, Accent, CallbackIntensity, ScheduledCall, CallLog, PlatformLanguage, UserProfile } from './types';
import { supabase } from './supabaseClient';

const DEFAULT_PROFILE: PartnerProfile = {
  name: "Amor",
  image: null,
  personality: "Divertida, irônica, faz piadas absurdas e ama fofoca.",
  dailyContext: "",
  mood: Mood.LOVE,
  voice: VoiceName.Kore,
  accent: Accent.PAULISTA,
  intensity: CallbackIntensity.MEDIUM,
  theme: 'light',
  relationshipScore: 70, // Starts at 70%
  history: [],
  language: PlatformLanguage.PT
};

const DEFAULT_GEMINI_API_KEY = "AIzaSyDNwhe9s8gdC2SnU2g2bOyBSgRmoE1ER3s";

type AppState = 'SETUP' | 'CALLING' | 'WAITING' | 'INCOMING' | 'OUTBOUND_CALLING';

function App() {
  const [appState, setAppState] = useState<AppState>('SETUP');
  const [profile, setProfile] = useState<PartnerProfile>(DEFAULT_PROFILE);
  const [callReason, setCallReason] = useState<string>('initial');
  const [nextScheduledCall, setNextScheduledCall] = useState<ScheduledCall | null>(null);
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('GEMINI_API_KEY') || DEFAULT_GEMINI_API_KEY);
  const [user, setUser] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<'pending' | 'accepted' | 'rejected' | 'no_answer'>('pending');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('*').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) {
            setCurrentUserProfile(data);
            if (data.ai_settings) {
              const settings = data.ai_settings as any;
              if (settings.gemini_api_key) {
                setApiKey(settings.gemini_api_key);
              } else {
                setApiKey(DEFAULT_GEMINI_API_KEY);
              }
              // Merge with default to ensure all fields exist
              setProfile(prev => ({ ...prev, ...settings }));
            }
          }
        });
    } else {
      setCurrentUserProfile(null);
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('GEMINI_API_KEY', apiKey);
  }, [apiKey]);

  // 1. Relationship Decay Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setProfile(prev => {
        // Decay 0.5% every 10 seconds to simulate "cooling off"
        const newScore = Math.max(0, prev.relationshipScore - 0.5);
        return { ...prev, relationshipScore: newScore };
      });
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // 2. Callback Scheduler Logic
  useEffect(() => {
    if (appState === 'WAITING' || appState === 'SETUP') {
      const timer = setInterval(() => {
        const now = Date.now();

        // Check specific scheduled call
        if (nextScheduledCall && now >= nextScheduledCall.triggerTime) {
          setCallReason(nextScheduledCall.reason === 'random' ? 'random' : `reminder:${nextScheduledCall.reason}`);
          setNextScheduledCall(null);
          setAppState('INCOMING');
          return;
        }

        // If no scheduled call, random chance based on intensity
        if (!nextScheduledCall) {
          const randomChance = Math.random();
          // Higher intensity = Higher chance per tick
          let threshold = 0;
          if (profile.intensity === CallbackIntensity.HIGH) threshold = 0.05; // 5% chance per second
          if (profile.intensity === CallbackIntensity.MEDIUM) threshold = 0.01;

          if (randomChance < threshold) {
            setCallReason('random');
            setAppState('INCOMING');
          }
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [appState, nextScheduledCall, profile.intensity]);

  // 3. AI Curiosity / Reactivity Logic
  useEffect(() => {
    if (appState === 'WAITING' || appState === 'SETUP') {
      const lastLog = profile.history[profile.history.length - 1];
      if (lastLog && lastLog.notes.includes("Alterou o lembrete") && Date.now() - lastLog.timestamp < 10000) {
        // Trigger a "curious" call after 5-10 seconds
        const timer = setTimeout(() => {
          setCallReason("curiosity_calendar");
          setAppState('INCOMING');
        }, 8000);
        return () => clearTimeout(timer);
      }
    }
  }, [profile.history, appState]);

  const handleApiKeyChange = async (newKey: string) => {
    setApiKey(newKey);
    localStorage.setItem('GEMINI_API_KEY', newKey);
    if (user) {
      await supabase.from('profiles').update({
        ai_settings: { ...profile, gemini_api_key: newKey }
      }).eq('id', user.id);
    }
  };

  const handleCallPartner = async (partnerProfile: PartnerProfile, isAi: boolean = true) => {
    if (!user) {
      alert("Faça login para ligar!");
      setShowAuth(true);
      return;
    }

    // Attempt to find the target user by number (stored in partnerProfile if coming from ContactList)
    setProfile(partnerProfile);
    setAppState('OUTBOUND_CALLING');
    setCallStatus('pending');
  };

  const startCall = async () => {
    if (!profile.personality.trim()) {
      alert("Por favor, descreva a personalidade!");
      return;
    }

    if (user) {
      // Create a "self-call" record for record keeping or just go to CALLING
      // For the AI button on the dashboard:
      const { data, error } = await supabase.from('calls').insert({
        caller_id: user.id,
        target_id: user.id, // Calling own AI
        is_ai_call: true,
        status: 'pending'
      }).select().single();

      if (data) {
        setActiveCallId(data.id);
        setAppState('OUTBOUND_CALLING');
        // The Realtime listener will handle the transition to CALLING if the AI "accepts"
      }
    } else {
      setCallReason('initial');
      setAppState('CALLING');
    }
  };

  const handleEndCall = async (reason: 'hangup_abrupt' | 'hangup_normal' | 'error', scheduled?: ScheduledCall) => {
    // 0. Update call status if active
    if (activeCallId) {
      await supabase.from('calls').update({ status: 'ended' }).eq('id', activeCallId);
    }

    // 1. Update History
    const newLog: CallLog = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      durationSec: 120, // Simplified duration
      moodEnd: profile.mood,
      notes: reason === 'hangup_abrupt' ? 'Desligou na cara' : 'Conversa normal'
    };

    // 2. Update Relationship Score
    let scoreChange = 10; // Normal call adds 10
    if (reason === 'hangup_abrupt') scoreChange = -15; // Hanging up hurts score

    // 3. Handle Scheduling
    if (scheduled) {
      setNextScheduledCall(scheduled);
      setAppState('SETUP'); // Go to dashboard to show pending call
    } else if (reason === 'hangup_abrupt' && profile.intensity !== CallbackIntensity.LOW) {
      // Immediate callback logic for abrupt hangup
      setNextScheduledCall({
        triggerTime: Date.now() + 5000,
        reason: 'callback_abrupt',
        isRandom: false
      });
      setAppState('WAITING');
    } else {
      setAppState('SETUP');
    }

    setProfile(prev => ({
      ...prev,
      history: [...prev.history, newLog],
      relationshipScore: Math.min(100, Math.max(0, prev.relationshipScore + scoreChange))
    }));
  };

  const handleAcceptCallback = async () => {
    if (activeCallId) {
      await supabase.from('calls').update({ status: 'accepted' }).eq('id', activeCallId);
    }
    setAppState('CALLING');
  };

  const handleDeclineCallback = async () => {
    if (activeCallId) {
      await supabase.from('calls').update({ status: 'rejected' }).eq('id', activeCallId);
    }
    setProfile(prev => ({ ...prev, relationshipScore: Math.max(0, prev.relationshipScore - 10) })); // Declining hurts score
    setAppState('SETUP');
  };

  // 4. Supabase Realtime Call Subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('calls_realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'calls',
        filter: `target_id=eq.${user.id}`
      }, async (payload) => {
        const newCall = payload.new as any;
        if (newCall.status === 'pending') {
          setActiveCallId(newCall.id);

          // AI Handling
          if (newCall.is_ai_call) {
            // Decision logic for AI
            const shouldPickUp = await evaluateAiDecision(newCall);
            if (shouldPickUp) {
              await supabase.from('calls').update({ status: 'accepted' }).eq('id', newCall.id);
            } else {
              await supabase.from('calls').update({ status: 'rejected' }).eq('id', newCall.id);
            }
          } else {
            // Human target
            setAppState('INCOMING');
          }
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'calls',
        filter: `caller_id=eq.${user.id}`
      }, (payload) => {
        const updatedCall = payload.new as any;
        if (updatedCall.id === activeCallId) {
          setCallStatus(updatedCall.status);
          if (updatedCall.status === 'accepted') {
            setAppState('CALLING');
          } else if (updatedCall.status === 'rejected' || updatedCall.status === 'no_answer') {
            setTimeout(() => {
              setAppState('SETUP');
              setActiveCallId(null);
            }, 3000);
          }
        }
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [user, activeCallId]);

  const evaluateAiDecision = async (call: any) => {
    const p = profile.personality.toLowerCase();

    // 1. Explicit User Instructions
    if (p.includes("sempre rejeitar") || p.includes("não atenda estranhos")) return false;
    if (p.includes("sempre atender") || p.includes("atenda tudo")) return true;

    // 2. Trait-based Decisions
    if (p.includes("fria") || p.includes("distante")) {
      return Math.random() > 0.6; // 40% chance
    }

    if (p.includes("ciumenta") || p.includes("possessiva")) {
      // Might only answer if it's the partner
      if (call.caller_id !== user.id) return Math.random() > 0.8; // Rarely answers strangers
    }

    // 3. Status/Relationship Score
    if (profile.relationshipScore < 20) return Math.random() > 0.5;

    return true; // Pick up by default
  };

  const handleCancelOutbound = async () => {
    if (activeCallId) {
      await supabase.from('calls').update({ status: 'ended' }).eq('id', activeCallId);
    }
    setAppState('SETUP');
    setActiveCallId(null);
  };

  return (
    <div className="font-outfit antialiased selection:bg-blue-100 selection:text-blue-900">
      {appState === 'SETUP' && (
        <SetupScreen
          profile={profile}
          setProfile={setProfile}
          onStartCall={startCall}
          onCallPartner={handleCallPartner}
          nextScheduledCall={nextScheduledCall}
          apiKey={apiKey}
          setApiKey={handleApiKeyChange}
          user={user}
          currentUserProfile={currentUserProfile}
          onUpdateUserProfile={setCurrentUserProfile}
          showAuth={showAuth}
          setShowAuth={setShowAuth}
        />
      )}

      {appState === 'CALLING' && (
        <CallScreen
          profile={profile}
          callReason={callReason}
          onEndCall={handleEndCall}
          apiKey={apiKey}
          user={user}
        />
      )}

      {appState === 'WAITING' && (
        <div className={`h-screen w-full flex flex-col items-center justify-center p-8 text-center ${profile.theme === 'dark' ? 'bg-slate-900 text-slate-500' : 'bg-rose-50 text-slate-400'}`}>
          <h2 className="text-2xl animate-pulse">Aguardando...</h2>
          <p className="mt-4">O tempo passa... (Score caindo lentamente)</p>
          {nextScheduledCall && (
            <p className="text-sm text-pink-500 mt-2">Chamada agendada em breve.</p>
          )}
          <button onClick={() => setAppState('SETUP')} className="mt-8 text-xs underline">Voltar ao Dashboard</button>
        </div>
      )}

      {appState === 'OUTBOUND_CALLING' && (
        <OutboundCallingScreen
          profile={profile}
          onCancel={handleCancelOutbound}
          status={callStatus}
        />
      )}

      {appState === 'INCOMING' && (
        <IncomingCallScreen
          profile={profile}
          callReason={callReason}
          onAccept={handleAcceptCallback}
          onDecline={handleDeclineCallback}
        />
      )}
    </div>
  );
}

export default App;
