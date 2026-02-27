import React, { useState, useEffect } from 'react';
import { SetupScreen } from './components/SetupScreen';
import { CallScreen } from './components/CallScreen';
import { IncomingCallScreen } from './components/IncomingCallScreen';
import { PartnerProfile, Mood, VoiceName, Accent, CallbackIntensity, ScheduledCall, CallLog } from './types';
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
  history: []
};

type AppState = 'SETUP' | 'CALLING' | 'WAITING' | 'INCOMING';

function App() {
  const [appState, setAppState] = useState<AppState>('SETUP');
  const [profile, setProfile] = useState<PartnerProfile>(DEFAULT_PROFILE);
  const [callReason, setCallReason] = useState<string>('initial');
  const [nextScheduledCall, setNextScheduledCall] = useState<ScheduledCall | null>(null);
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('GEMINI_API_KEY') || "");
  const [user, setUser] = useState<any>(null);

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

  const startCall = () => {
    if (!profile.personality.trim()) {
      alert("Por favor, descreva a personalidade!");
      return;
    }
    setCallReason('initial');
    setAppState('CALLING');
  };

  const handleEndCall = (reason: 'hangup_abrupt' | 'hangup_normal' | 'error', scheduled?: ScheduledCall) => {
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

  const handleAcceptCallback = () => {
    setAppState('CALLING');
  };

  const handleDeclineCallback = () => {
    setProfile(prev => ({ ...prev, relationshipScore: Math.max(0, prev.relationshipScore - 10) })); // Declining hurts score
    setAppState('SETUP');
  };

  return (
    <div className="font-outfit antialiased selection:bg-blue-100 selection:text-blue-900">
      {appState === 'SETUP' && (
        <SetupScreen
          profile={profile}
          setProfile={setProfile}
          onStartCall={startCall}
          nextScheduledCall={nextScheduledCall}
          apiKey={apiKey}
          setApiKey={setApiKey}
          user={user}
        />
      )}

      {appState === 'CALLING' && (
        <CallScreen
          profile={profile}
          callReason={callReason}
          onEndCall={handleEndCall}
          apiKey={apiKey}
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
