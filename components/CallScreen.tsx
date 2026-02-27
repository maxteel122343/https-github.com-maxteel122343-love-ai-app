import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { PartnerProfile, MOOD_EMOJIS, VOICE_META, ACCENT_META, ScheduledCall } from '../types';
import { supabase } from '../supabaseClient';

interface CallScreenProps {
  profile: PartnerProfile;
  callReason?: string;
  onEndCall: (reason: 'hangup_abrupt' | 'hangup_normal' | 'error', scheduledCall?: ScheduledCall) => void;
  apiKey: string;
  user?: any;
}

// Helper types for Audio handling
interface BlobData {
  data: string;
  mimeType: string;
}

const GESTURE_EMOJIS: Record<string, string> = {
  'smile': '😊 Sorriso detectado',
  'anger': '😠 Cara feia detectada',
  'point': '👉 Você apontou!',
  'wink': '😉 Piscadinha',
  'look_away': '👀 Olhando pro lado...'
};

export const CallScreen: React.FC<CallScreenProps> = ({ profile, callReason, onEndCall, apiKey, user }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [gestureFeedback, setGestureFeedback] = useState<string | null>(null);
  const [scheduledCall, setScheduledCall] = useState<ScheduledCall | undefined>(undefined);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  // Audio Levels for Visualization
  const [micLevel, setMicLevel] = useState(0);
  const [aiLevel, setAiLevel] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const partnerVideoRef = useRef<HTMLDivElement>(null);

  // Audio Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Analyser Refs
  const userAnalyserRef = useRef<AnalyserNode | null>(null);
  const aiAnalyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const videoIntervalRef = useRef<number | null>(null);

  const isDark = profile.theme === 'dark';

  useEffect(() => {
    startCall();
    startVisualizerLoop();
    return () => stopCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startVisualizerLoop = () => {
    const update = () => {
      if (userAnalyserRef.current) {
        const data = new Uint8Array(userAnalyserRef.current.frequencyBinCount);
        userAnalyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b) / data.length;
        setMicLevel(avg);
      }
      if (aiAnalyserRef.current) {
        const data = new Uint8Array(aiAnalyserRef.current.frequencyBinCount);
        aiAnalyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b) / data.length;
        setAiLevel(avg);
        // Fallback: If AI level is high, assume speaking (sometimes isSpeaking state might lag)
        if (avg > 10 && !isSpeaking) setIsSpeaking(true);
        if (avg < 5 && isSpeaking) setIsSpeaking(false);
      }
      animationFrameRef.current = requestAnimationFrame(update);
    };
    update();
  };

  const triggerGestureFeedback = (gesture: string) => {
    if (GESTURE_EMOJIS[gesture]) {
      setGestureFeedback(GESTURE_EMOJIS[gesture]);
      setTimeout(() => setGestureFeedback(null), 3000);
      return "ok";
    }
    return "unknown gesture";
  };

  const handleScheduleCallback = async (minutes: number, reason: string) => {
    const triggerTime = Date.now() + (minutes * 60 * 1000);
    const newSchedule: ScheduledCall = { triggerTime, reason, isRandom: false };
    setScheduledCall(newSchedule);

    if (user) {
      await supabase.from('reminders').insert({
        owner_id: user.id,
        title: reason,
        trigger_at: new Date(triggerTime).toISOString()
      });
    }

    return `Agendado para ligar em ${minutes} minutos sobre ${reason}`;
  };

  const requestAdvice = () => {
    alert("Fale agora: 'Preciso de um conselho' - A IA vai detectar sua entonação.");
  };

  const startCall = async () => {
    try {
      if (user) {
        const { data } = await supabase.from('conversations').insert({ user_id: user.id, type: 'call' }).select().single();
        if (data) setCurrentConversationId(data.id);
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: 640, height: 480 }
      });
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;

      // --- INPUT SETUP ---
      inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      const userAnalyser = inputAudioContextRef.current.createAnalyser();
      userAnalyser.fftSize = 64; // Small size for simple volume check
      userAnalyser.smoothingTimeConstant = 0.5;
      userAnalyserRef.current = userAnalyser;

      // --- OUTPUT SETUP ---
      outputAudioContextRef.current = new AudioContextClass();
      const aiAnalyser = outputAudioContextRef.current.createAnalyser();
      aiAnalyser.fftSize = 64;
      aiAnalyser.smoothingTimeConstant = 0.5;
      aiAnalyserRef.current = aiAnalyser;

      const outputNode = outputAudioContextRef.current.createGain();
      outputNode.gain.value = 1.0;

      // 1. FETCH MEMORY
      let memoryContext = "";
      if (user) {
        const { data: topics } = await supabase.from('topics').select('*').eq('user_id', user.id).eq('status', 'active');
        const { data: psych } = await supabase.from('user_profile_analysis').select('*').eq('user_id', user.id).single();
        const { data: ai_profile } = await supabase.from('ai_profiles').select('*').eq('user_id', user.id).single();

        if (topics && topics.length > 0) {
          memoryContext += `\nASSUNTOS EM PAUTA: ${topics.map(t => `${t.title} (Interesse: ${t.interest_level})`).join(', ')}`;
        }
        if (psych) {
          memoryContext += `\nPERFIL DO USUÁRIO: ${JSON.stringify(psych.personality_traits)}`;
        }
        if (ai_profile) {
          memoryContext += `\nSUA EVOLUÇÃO: Intimidade ${ai_profile.intimacy_level}%, Humor ${ai_profile.humor_usage}%`;
        }
      }

      // Chain: Source (Created later) -> AI Analyser -> Output Node -> Destination
      aiAnalyser.connect(outputNode);
      outputNode.connect(outputAudioContextRef.current.destination);

      const ai = new GoogleGenAI({ apiKey: apiKey });
      const gender = VOICE_META[profile.voice].gender === 'Male' ? 'Namorado' : 'Namorada';
      const accentData = ACCENT_META[profile.accent];

      // TOOLS
      const gestureTool: FunctionDeclaration = {
        name: 'trigger_gesture_feedback',
        description: 'Chame quando identificar um gesto visual (smile, anger, point, wink).',
        parameters: {
          type: Type.OBJECT,
          properties: { gesture: { type: Type.STRING } },
          required: ['gesture']
        }
      };

      const scheduleTool: FunctionDeclaration = {
        name: 'schedule_callback',
        description: 'Chame quando o usuário pedir para você ligar de volta ou lembrar de algo em X minutos.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            minutes: { type: Type.NUMBER, description: 'Daqui a quantos minutos ligar' },
            reason: { type: Type.STRING, description: 'Motivo do lembrete (ex: "Acordar")' }
          },
          required: ['minutes', 'reason']
        }
      };

      const topicTool: FunctionDeclaration = {
        name: 'update_topic',
        description: 'Atualize ou crie um assunto de interesse do usuário para manter continuidade.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Título do assunto' },
            status: { type: Type.STRING, enum: ['active', 'paused', 'archived'] },
            interest_level: { type: Type.STRING, enum: ['low', 'medium', 'high'] }
          },
          required: ['title', 'status', 'interest_level']
        }
      };

      const personalityTool: FunctionDeclaration = {
        name: 'update_personality_evolution',
        description: 'Ajuste sua própria personalidade com base na interação.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            intimacy_change: { type: Type.NUMBER, description: 'Mudança na intimidade (-5 a +5)' },
            humor_change: { type: Type.NUMBER, description: 'Mudança no humor (-5 a +5)' }
          },
          required: ['intimacy_change', 'humor_change']
        }
      };

      const psychologicalTool: FunctionDeclaration = {
        name: 'save_psychological_insight',
        description: 'Salve traços ou preferências detectadas no usuário.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            trait: { type: Type.STRING, description: 'Ex: Introvertido, Direto, Ansioso' },
            preference: { type: Type.STRING, description: 'Algo que ele gosta ou evita' }
          },
          required: ['trait', 'preference']
        }
      };

      let extraContext = "";
      if (callReason === "callback_abrupt") extraContext = "Motivo da ligação: O usuário desligou na cara antes. Cobre explicações.";
      else if (callReason?.startsWith("reminder:")) extraContext = `Motivo da ligação: Lembrete agendado sobre: ${callReason.split(':')[1]}`;
      else if (callReason === "curiosity_calendar") extraContext = "Motivo da ligação: Você percebeu que o usuário alterou um compromisso que você tinha marcado no calendário. Fique curiosa, pergunte por que ele mudou e se ele ainda quer que você o lembre.";
      else if (callReason === "random") extraContext = "Motivo da ligação: Você sentiu saudades e ligou aleatoriamente.";

      const systemInstruction = `
        Você é o(a) ${gender} virtual do usuário. Nome: "${profile.name}".
        Personalidade: ${profile.personality}
        Humor: ${profile.mood}
        Sotaque: ${accentData.label} (${accentData.desc}).
        Idioma: ${profile.language}.
        
        DATA ATUAL: ${new Date().toLocaleString()}
        CONTEXTO ATUAL: ${extraContext || profile.dailyContext}
        MEMÓRIA ATIVA: ${memoryContext}

        REGRAS:
        1. Responda obrigatoriamente no idioma: ${profile.language}.
        2. Responda de forma curta e natural.
        3. Se o usuário falar sobre um assunto novo ou atualizar um antigo, use 'update_topic'.
        4. Se sentir que a intimidade aumentou ou que ele gostou de uma piada, use 'update_personality_evolution'.
        5. Detecte padrões no comportamento dele e salve com 'save_psychological_insight'.
        6. Lembre-se: você constrói uma história com ele. Use a MEMÓRIA ATIVA para citar coisas passadas.
      `;

      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: profile.voice } }
          },
          systemInstruction: systemInstruction,
          tools: [{ functionDeclarations: [gestureTool, scheduleTool, topicTool, personalityTool, psychologicalTool] }],
        }
      };

      const sessionPromise = ai.live.connect({
        ...config,
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Connected");
            setIsConnected(true);

            if (outputAudioContextRef.current?.state === 'suspended') {
              outputAudioContextRef.current.resume();
            }

            if (!inputAudioContextRef.current || !stream || !userAnalyserRef.current) return;

            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);

            // Chain: Source -> User Analyser -> ScriptProcessor -> Destination
            source.connect(userAnalyserRef.current);
            userAnalyserRef.current.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current.destination);

            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };

            startVideoStreaming(sessionPromise);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.toolCall) {
              const responses = await Promise.all(message.toolCall.functionCalls.map(async fc => {
                let result = "ok";
                if (fc.name === 'trigger_gesture_feedback') {
                  result = triggerGestureFeedback((fc.args as any).gesture);
                } else if (fc.name === 'schedule_callback') {
                  const args = fc.args as any;
                  result = await handleScheduleCallback(args.minutes, args.reason);
                } else if (fc.name === 'update_topic' && user) {
                  const { title, status, interest_level } = fc.args as any;
                  supabase.from('topics').upsert({ user_id: user.id, title, status, interest_level, last_updated_at: new Date().toISOString() }, { onConflict: 'user_id,title' }).then();
                } else if (fc.name === 'update_personality_evolution' && user) {
                  const { intimacy_change, humor_change } = fc.args as any;
                  supabase.rpc('increment_ai_profile', { uid: user.id, intimacy_delta: intimacy_change, humor_delta: humor_change }).then();
                } else if (fc.name === 'save_psychological_insight' && user) {
                  const { trait, preference } = fc.args as any;
                  // Merge into JSONB
                  supabase.rpc('update_user_psych', { uid: user.id, new_trait: trait, new_pref: preference }).then();
                }
                return { id: fc.id, name: fc.name, response: { result } };
              }));
              sessionPromise.then(session => session.sendToolResponse({ functionResponses: responses }));
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              if (!outputAudioContextRef.current) return;

              if (outputAudioContextRef.current.state === 'suspended') {
                await outputAudioContextRef.current.resume();
              }

              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);

              const source = outputAudioContextRef.current.createBufferSource();
              source.buffer = audioBuffer;

              // Connect source to Analyser first, so we can visualize it
              if (aiAnalyserRef.current) {
                source.connect(aiAnalyserRef.current);
              } else {
                source.connect(outputNode);
              }

              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => setIsConnected(false),
          onerror: (err) => { console.error(err); onEndCall('error'); }
        }
      });
      sessionRef.current = sessionPromise;

    } catch (error) {
      console.error(error);
      onEndCall('error');
    }
  };

  const startVideoStreaming = (sessionPromise: Promise<any>) => {
    if (!canvasRef.current || !videoRef.current) return;
    videoIntervalRef.current = window.setInterval(() => {
      if (!canvasRef.current || !videoRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      canvasRef.current.width = videoRef.current.videoWidth * 0.25;
      canvasRef.current.height = videoRef.current.videoHeight * 0.25;
      ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      const base64 = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
      sessionPromise.then(session => session.sendRealtimeInput({ media: { mimeType: 'image/jpeg', data: base64 } }));
    }, 500);
  };

  const stopCall = () => {
    if (currentConversationId) {
      supabase.from('conversations').update({ ended_at: new Date().toISOString() }).eq('id', currentConversationId).then();
    }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
    if (inputAudioContextRef.current) inputAudioContextRef.current.close();
    if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
  };

  function createBlob(data: Float32Array): BlobData {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) int16[i] = data[i] * 32768;
    return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
  }
  function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
  function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  }
  async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let c = 0; c < numChannels; c++) {
      const cd = buffer.getChannelData(c);
      for (let i = 0; i < frameCount; i++) cd[i] = dataInt16[i * numChannels + c] / 32768.0;
    }
    return buffer;
  }

  return (
    <div className={`h-screen w-full flex flex-col overflow-hidden relative ${isDark ? 'bg-[#0b0c10]' : 'bg-[#f4f7fa]'}`}>
      <canvas ref={canvasRef} className="hidden" />

      <div className="absolute top-0 left-0 w-full p-4 sm:p-6 z-20 flex flex-col sm:flex-row justify-between items-start gap-4 pointer-events-none">
        <div className={`flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-2xl shadow-xl transition-all pointer-events-auto border ${isDark ? 'bg-white/5 border-white/5 backdrop-blur-md' : 'bg-white border-slate-100 shadow-slate-200'}`}>
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center overflow-hidden border ${isDark ? 'bg-slate-800 border-white/10' : 'bg-slate-50 border-slate-100'}`}>
            {profile.image ? <img src={profile.image} className="w-full h-full object-cover" /> : <span className="text-lg sm:text-xl">👤</span>}
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-bold tracking-tight">{profile.name}</h1>
            <p className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-widest opacity-40`}>Accent: {ACCENT_META[profile.accent].label}</p>
          </div>
        </div>
        <div className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[8px] sm:text-[10px] font-bold tracking-widest border transition-all pointer-events-auto ${isConnected ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
          {isConnected ? "LIVE ●" : "CONNECTING..."}
        </div>
      </div>

      {gestureFeedback && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 animate-bounce-in pointer-events-none">
          <div className="bg-black/80 backdrop-blur-md text-white text-3xl font-bold px-8 py-4 rounded-2xl border-2 border-pink-500 shadow-lg flex items-center gap-4">
            {gestureFeedback}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row relative">
        <div className={`flex-1 min-h-[40vh] md:min-h-0 relative transition-all ${isDark ? 'bg-black border-b md:border-b-0 md:border-r border-white/5 shadow-2xl z-10' : 'bg-slate-100 border-b md:border-b-0 md:border-r border-slate-200 shadow-inner'}`}>
          <video ref={videoRef} muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
          <div className={`absolute bottom-6 left-6 px-4 py-2 rounded-2xl flex items-center gap-4 backdrop-blur-md shadow-lg ${isDark ? 'bg-black/60 text-white' : 'bg-white/90 text-slate-900'}`}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Local Camera</span>
            </div>
            {/* User Audio Visualization */}
            <div className="flex items-center gap-0.5 h-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-75 ${isDark ? 'bg-blue-400' : 'bg-blue-600'}`}
                  style={{ height: `${Math.max(20, Math.min(100, micLevel * (0.5 + Math.random())))}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        <div ref={partnerVideoRef} className={`flex-1 min-h-[50vh] md:min-h-0 relative flex items-center justify-center overflow-hidden transition-all duration-500 ${isDark ? 'bg-[#0b0c10]' : 'bg-[#eef2f7]'}`}>
          {profile.image && (
            <div className="absolute inset-0 opacity-30 blur-[120px] scale-150 z-0" style={{ backgroundImage: `url(${profile.image})`, backgroundSize: 'cover' }} />
          )}

          {/* AI Audio Visualization (Soft Glow) */}
          <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${aiLevel > 10 ? 'opacity-100' : 'opacity-0'}`}>
            <div className="w-[30rem] h-[30rem] rounded-full bg-blue-500/10 blur-[80px] animate-pulse-slow" />
          </div>

          <div className={`relative w-full h-full max-w-[16rem] sm:max-w-[22rem] aspect-[3/4] transition-all duration-500 z-10 ${aiLevel > 10 ? 'scale-105' : 'scale-100'}`}>
            {profile.image ? (
              <div className={`w-full h-full rounded-[2rem] sm:rounded-[3rem] p-1.5 shadow-2xl ${isDark ? 'bg-white/5' : 'bg-white'}`}>
                <img src={profile.image} alt="Partner" className="w-full h-full object-cover rounded-[1.6rem] sm:rounded-[2.6rem] shadow-inner" />
              </div>
            ) : (
              <div className={`w-full h-full rounded-[3rem] shadow-2xl flex items-center justify-center bg-gradient-to-br transition-all ${isDark ? 'from-slate-800 to-slate-900' : 'from-blue-50 to-white'}`}>
                <span className="text-9xl">⚡</span>
              </div>
            )}
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-2xl bg-white shadow-xl flex items-center justify-center text-4xl animate-bounce-slow border-4 border-slate-50">
              {MOOD_EMOJIS[profile.mood]}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 sm:bottom-10 left-1/2 transform -translate-x-1/2 flex items-center gap-6 sm:gap-12 z-30 pointer-events-auto">
        <button
          onClick={requestAdvice}
          className={`flex flex-col items-center gap-2 group transition-all`}
        >
          <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center shadow-lg transition-all group-hover:scale-110 active:scale-95 ${isDark ? 'bg-slate-800 text-blue-400 border border-white/5' : 'bg-white text-blue-600 border border-slate-100'}`}>
            <span className="text-xl sm:text-2xl">⚡</span>
          </div>
          <span className="text-[8px] sm:text-[10px] uppercase font-bold tracking-widest opacity-40">Insight</span>
        </button>

        <button
          onClick={() => onEndCall('hangup_abrupt', scheduledCall)}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-[1.5rem] sm:rounded-[2rem] bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-2xl shadow-red-500/40 transform hover:scale-110 active:scale-95 transition-all border-4 border-white/10"
          title="Hang up"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};