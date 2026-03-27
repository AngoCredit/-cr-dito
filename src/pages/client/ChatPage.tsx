import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ClientLayout from '@/components/client/ClientLayout';
import { Send, Mic, Lock, ShieldCheck, Users, Info, MessageSquare, Crown, Star, Shield, Zap, Award, Search, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getUserLevel } from '@/lib/levels';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
    id: string;
    room_id: string;
    user_id: string;
    content: string;
    type: string;
    created_at: string;
    profile?: {
        nome: string;
        score: number;
        role: string;
    };
}

// Level badge colors for visual identity
const LEVEL_COLORS: Record<string, { bg: string; text: string; glow: string }> = {
    'Iniciante': { bg: 'bg-slate-500/20', text: 'text-slate-300', glow: '' },
    'Bronze': { bg: 'bg-amber-700/20', text: 'text-amber-400', glow: '' },
    'Prata': { bg: 'bg-slate-400/20', text: 'text-slate-300', glow: '' },
    'Ouro': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', glow: 'shadow-yellow-500/20' },
    'Platina': { bg: 'bg-cyan-500/20', text: 'text-cyan-300', glow: 'shadow-cyan-500/20' },
    'Presidente': { bg: 'bg-purple-500/20', text: 'text-purple-300', glow: 'shadow-purple-500/20' },
};

const LEVEL_ICONS: Record<string, any> = {
    'Iniciante': Shield,
    'Bronze': Star,
    'Prata': Zap,
    'Ouro': Crown,
    'Platina': Award,
    'Presidente': Crown,
};

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [publicRoomId, setPublicRoomId] = useState<string | null>(null);
    const [dailyMessageCount, setDailyMessageCount] = useState(0);
    const [onlineCount] = useState(Math.floor(Math.random() * 12) + 3);
    const [showEmojiHint, setShowEmojiHint] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { initializeChat(); }, []);
    useEffect(() => { scrollToBottom(); }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const getDailyLimit = (score: number) => {
        if (score >= 600) return Infinity;
        if (score >= 400) return 10;
        if (score >= 200) return 5;
        return 2;
    };

    const initializeChat = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUser(user);

            const { data: userProfile } = await (supabase as any)
                .from('profiles').select('*').eq('user_id', user.id).single();
            setProfile(userProfile);

            const { data: publicRoom } = await (supabase as any)
                .from('chat_rooms').select('id').eq('type', 'PUBLIC').limit(1).single();

            if (!publicRoom) { toast.error('Sala de chat não encontrada.'); setLoading(false); return; }
            setPublicRoomId(publicRoom.id);

            // Auto-join user to public room
            await (supabase as any).from('chat_participants').upsert({
                room_id: publicRoom.id,
                user_id: user.id,
                role: 'MEMBER'
            }, { onConflict: 'room_id,user_id' });

            const { data: history, error } = await (supabase as any)
                .from('chat_messages')
                .select('id, room_id, user_id, content, type, created_at, profile:profiles(nome, score, role)')
                .eq('room_id', publicRoom.id)
                .order('created_at', { ascending: true })
                .limit(100);

            if (error) throw error;
            setMessages(history || []);

            const today = new Date().toISOString().split('T')[0];
            setDailyMessageCount(
                (history || []).filter((m: any) => m.user_id === user.id && m.created_at.startsWith(today)).length
            );

            const channel = supabase
                .channel('public-chat')
                .on('postgres_changes', {
                    event: 'INSERT', schema: 'public', table: 'chat_messages',
                    filter: `room_id=eq.${publicRoom.id}`
                }, async (payload: any) => {
                    const { data: msgProfile } = await (supabase as any)
                        .from('profiles').select('nome, score, role').eq('user_id', payload.new.user_id).single();
                    const newMsg = { ...payload.new, profile: msgProfile };

                    setMessages(prev => {
                        // Avoid duplicates if the message was already added optimistically
                        const isDuplicate = prev.some(m => m.id === newMsg.id ||
                            (m.user_id === newMsg.user_id && m.content === newMsg.content && m.id.startsWith('optimistic-')));

                        if (isDuplicate) {
                            return prev.map(m => (m.user_id === newMsg.user_id && m.content === newMsg.content && m.id.startsWith('optimistic-')) ? newMsg as Message : m);
                        }
                        return [...prev, newMsg as Message];
                    });

                    if (payload.new.user_id === user.id) setDailyMessageCount(prev => prev + 1);
                })
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        } catch (error) {
            console.error('Erro ao iniciar chat:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !publicRoomId || !currentUser) return;

        const limit = getDailyLimit(profile?.score || 0);
        if (dailyMessageCount >= limit) {
            toast.error(`Limite de ${limit} mensagens/dia atingido. Suba de nível para enviar mais!`, { duration: 5000 });
            return;
        }

        const messageText = newMessage;
        setNewMessage('');

        // 1. Optimistic UI Update (Mostra a mensagem imediatamente)
        const optimisticId = `optimistic-${Date.now()}`;
        const optimisticMessage: Message = {
            id: optimisticId,
            room_id: publicRoomId,
            user_id: currentUser.id,
            content: messageText,
            type: 'TEXT',
            created_at: new Date().toISOString(),
            profile: {
                nome: profile?.nome || 'Utilizador',
                score: profile?.score || 0,
                role: profile?.role || 'user'
            }
        };

        setMessages(prev => [...prev, optimisticMessage]);

        try {
            // 2. Envia para a base de dados
            const { error } = await (supabase as any).from('chat_messages').insert({
                room_id: publicRoomId, user_id: currentUser.id, content: messageText, type: 'TEXT'
            });

            if (error) {
                // Reverte se falhou
                setMessages(prev => prev.filter(m => m.id !== optimisticId));
                setNewMessage(messageText);

                if (error.message?.includes('Limite diário')) {
                    toast.error(error.message);
                } else { throw error; }
            }
        } catch (error: any) {
            console.error('Erro ao enviar:', error);
            // Reverte se falhou
            setMessages(prev => prev.filter(m => m.id !== optimisticId));
            setNewMessage(messageText);
            toast.error(error.message || 'Erro ao enviar mensagem.');
        }
    };

    const addEmoji = (emoji: string) => {
        setNewMessage(prev => prev + emoji);
        setShowEmojiHint(false);
        inputRef.current?.focus();
    };

    if (loading) {
        return (
            <ClientLayout>
                <div className="flex h-[calc(100vh-140px)] items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(222, 47%, 11%), hsl(223, 47%, 15%))' }}>
                    <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-transparent border-t-primary border-r-primary"></div>
                        <span className="text-white/60 text-sm font-medium">A carregar chat...</span>
                    </div>
                </div>
            </ClientLayout>
        );
    }

    const userLevel = getUserLevel(profile?.score || 0);
    const limit = getDailyLimit(profile?.score || 0);
    const messagesLeft = limit === Infinity ? Infinity : Math.max(0, limit - dailyMessageCount);
    const canSendAudio = (profile?.score || 0) >= 1000;
    const levelColor = LEVEL_COLORS[userLevel.name] || LEVEL_COLORS['Iniciante'];
    const LevelIcon = LEVEL_ICONS[userLevel.name] || Shield;

    // Get unique senders for "members" sidebar
    const uniqueSenders = messages.reduce((acc: any[], msg) => {
        if (!acc.find(s => s.user_id === msg.user_id) && msg.profile) {
            acc.push({ user_id: msg.user_id, ...msg.profile });
        }
        return acc;
    }, []);

    const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '👏', '💪', '🎉', '😊'];

    return (
        <ClientLayout>
            <div className="flex h-[calc(100vh-140px)] overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(222, 47%, 11%), hsl(223, 47%, 15%))' }}>

                {/* ══════════════════════════════════════════════════════════ */}
                {/* LEFT SIDEBAR — Members / Contacts */}
                {/* ══════════════════════════════════════════════════════════ */}
                <div className="hidden md:flex md:w-[280px] lg:w-[320px] flex-col border-r border-white/5 shrink-0">
                    {/* Sidebar Header */}
                    <div className="px-4 py-4 border-b border-white/5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(210, 86%, 29%), hsl(210, 86%, 20%))' }}>
                                    <MessageSquare className="w-4 h-4 text-white" />
                                </div>
                                <h2 className="text-white font-bold text-sm">Chat</h2>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-green-400/70">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                                {onlineCount} online
                            </div>
                        </div>
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                            <input
                                type="text"
                                placeholder="Pesquisar membros..."
                                className="w-full bg-white/5 border border-white/5 rounded-lg pl-9 pr-3 py-2 text-xs text-white/80 placeholder:text-white/20 focus:outline-none focus:border-primary/40 focus:bg-white/[0.07] transition-all"
                            />
                        </div>
                    </div>

                    {/* Active Chat — Global Room (Highlighted) */}
                    <div className="px-2 py-2">
                        <div className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all" style={{ background: 'linear-gradient(135deg, hsl(210, 86%, 29%) / 0.25, hsl(210, 86%, 20%) / 0.15)', border: '1px solid hsl(210, 86%, 29%, 0.3)' }}>
                            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, hsl(210, 86%, 29%), hsl(210, 86%, 35%))' }}>
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-semibold text-sm truncate">Comunidade +Kwanzas</p>
                                <p className="text-white/40 text-[10px] truncate">{messages.length} mensagens · Chat Global</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <span className="text-[9px] text-white/30">Agora</span>
                                {messages.length > 0 && (
                                    <span className="w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center text-white" style={{ background: 'hsl(28, 91%, 54%)' }}>
                                        {Math.min(messages.length, 99)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Members List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2">
                        <p className="text-[9px] uppercase tracking-widest font-bold text-white/20 px-3 py-2">Membros Activos ({uniqueSenders.length})</p>
                        {uniqueSenders.map((sender: any) => {
                            const sLevel = getUserLevel(sender.score || 0);
                            const sColor = LEVEL_COLORS[sLevel.name] || LEVEL_COLORS['Iniciante'];
                            const SIcon = LEVEL_ICONS[sLevel.name] || Shield;
                            const isMe = sender.user_id === currentUser?.id;
                            return (
                                <div key={sender.user_id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-all cursor-default group">
                                    <div className="relative">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${sColor.bg} ${sColor.glow ? `shadow-lg ${sColor.glow}` : ''}`}>
                                            <span className={`text-sm font-bold ${sColor.text}`}>
                                                {(sender.nome || 'U')[0].toUpperCase()}
                                            </span>
                                        </div>
                                        {(sender.score || 0) >= 600 && (
                                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2" style={{ borderColor: 'hsl(222, 47%, 11%)' }}></span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white/80 text-xs font-medium truncate">
                                            {sender.nome?.split(' ')[0] || 'Usuário'}
                                            {isMe && <span className="text-white/30 ml-1">(você)</span>}
                                        </p>
                                        <div className="flex items-center gap-1">
                                            <SIcon className={`w-2.5 h-2.5 ${sColor.text}`} />
                                            <span className={`text-[9px] font-bold ${sColor.text} uppercase`}>{sLevel.name}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════ */}
                {/* MAIN CHAT AREA */}
                {/* ══════════════════════════════════════════════════════════ */}
                <div className="flex-1 flex flex-col min-w-0">

                    {/* Chat Header */}
                    <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between shrink-0" style={{ background: 'linear-gradient(135deg, hsl(222, 47%, 13%), hsl(223, 47%, 16%))' }}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center md:hidden" style={{ background: 'linear-gradient(135deg, hsl(210, 86%, 29%), hsl(210, 86%, 35%))' }}>
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-white font-bold text-[15px] flex items-center gap-2">
                                    Comunidade +Kwanzas
                                    <ShieldCheck className="w-4 h-4" style={{ color: 'hsl(142, 71%, 45%)' }} />
                                </h2>
                                <p className="text-white/30 text-[11px] flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                                    {onlineCount} membros online · Chat Público Oficial
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Level Badge */}
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${levelColor.bg} ${levelColor.glow ? `shadow-lg ${levelColor.glow}` : ''}`}>
                                <LevelIcon className={`w-3.5 h-3.5 ${levelColor.text}`} />
                                <span className={`text-[11px] font-bold uppercase tracking-wide ${levelColor.text}`}>{userLevel.name}</span>
                            </div>
                        </div>
                    </div>

                    {/* Messages Limit Bar */}
                    {limit !== Infinity && (
                        <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between" style={{ background: 'rgba(0,0,0,0.15)' }}>
                            <span className="text-[10px] uppercase tracking-wider font-bold text-white/30 flex items-center gap-2">
                                <Info className="w-3 h-3" />
                                Limite diário · Nível {userLevel.name}
                            </span>
                            <div className="flex items-center gap-2">
                                <div className="flex gap-0.5">
                                    {Array.from({ length: limit as number }).map((_, i) => (
                                        <div key={i} className={`w-2 h-2 rounded-full transition-all ${i < dailyMessageCount ? 'bg-primary' : 'bg-white/10'}`} />
                                    ))}
                                </div>
                                <span className={`text-[10px] font-bold ${messagesLeft === 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {messagesLeft}/{limit as number}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 custom-scrollbar">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, hsl(210, 86%, 29%) / 0.2, hsl(210, 86%, 20%) / 0.1)' }}>
                                    <MessageSquare className="w-8 h-8 text-primary/60" />
                                </div>
                                <p className="text-white/40 text-sm font-medium">Sem mensagens ainda</p>
                                <p className="text-white/20 text-xs mt-1">Seja o primeiro a dizer olá! 👋</p>
                            </div>
                        )}

                        {messages.map((msg, index) => {
                            const isMe = msg.user_id === currentUser?.id;
                            const msgLevel = getUserLevel(msg.profile?.score || 0);
                            const mColor = LEVEL_COLORS[msgLevel.name] || LEVEL_COLORS['Iniciante'];
                            const MIcon = LEVEL_ICONS[msgLevel.name] || Shield;
                            const showDate = index === 0 ||
                                new Date(messages[index - 1].created_at).toDateString() !== new Date(msg.created_at).toDateString();
                            const showAvatar = !isMe && (index === 0 || messages[index - 1].user_id !== msg.user_id);

                            return (
                                <div key={msg.id}>
                                    {showDate && (
                                        <div className="flex justify-center my-5">
                                            <span className="text-[9px] uppercase tracking-widest font-bold text-white/20 bg-white/[0.03] border border-white/5 px-4 py-1 rounded-full">
                                                {new Date(msg.created_at).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
                                            </span>
                                        </div>
                                    )}

                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className={`flex gap-2.5 mb-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                                    >
                                        {/* Avatar */}
                                        {!isMe ? (
                                            showAvatar ? (
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${mColor.bg} mt-5`}>
                                                    <span className={`text-xs font-bold ${mColor.text}`}>
                                                        {(msg.profile?.nome || 'U')[0].toUpperCase()}
                                                    </span>
                                                </div>
                                            ) : <div className="w-8 shrink-0" />
                                        ) : null}

                                        <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                            {/* Sender Name + Level */}
                                            {!isMe && showAvatar && (
                                                <div className="flex items-center gap-1.5 mb-1 ml-1">
                                                    <span className={`text-xs font-semibold ${mColor.text}`}>
                                                        {msg.profile?.nome?.split(' ')[0] || 'Usuário'}
                                                    </span>
                                                    <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${mColor.bg}`}>
                                                        <MIcon className={`w-2 h-2 ${mColor.text}`} />
                                                        <span className={`text-[8px] font-bold uppercase ${mColor.text}`}>{msgLevel.name}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Message Bubble */}
                                            <div className={`rounded-2xl px-4 py-2.5 ${isMe
                                                ? 'rounded-tr-md text-white'
                                                : 'rounded-tl-md text-white/90'
                                                }`} style={
                                                    isMe
                                                        ? { background: 'linear-gradient(135deg, hsl(210, 86%, 29%), hsl(210, 86%, 35%))' }
                                                        : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)' }
                                                }>
                                                {msg.type === 'TEXT' && (
                                                    <p className="text-[14px] leading-relaxed break-words">{msg.content}</p>
                                                )}
                                                {msg.type === 'AUDIO' && (
                                                    <div className="flex items-center gap-2 text-sm italic text-white/50">
                                                        <Mic className="w-4 h-4" /> Mensagem de áudio
                                                    </div>
                                                )}
                                            </div>

                                            {/* Time */}
                                            <span className="text-[9px] text-white/20 mt-0.5 mx-1">
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </motion.div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* ── Input Area ── */}
                    <div className="px-4 py-3 border-t border-white/5 shrink-0" style={{ background: 'linear-gradient(135deg, hsl(222, 47%, 13%), hsl(223, 47%, 16%))' }}>
                        {/* Emoji Bar */}
                        <AnimatePresence>
                            {showEmojiHint && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                    exit={{ opacity: 0, y: 10, height: 0 }}
                                    className="flex items-center gap-1 pb-2 overflow-hidden"
                                >
                                    {QUICK_EMOJIS.map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => addEmoji(emoji)}
                                            className="w-9 h-9 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-lg transition-all hover:scale-110"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                            {/* Emoji Toggle */}
                            <button
                                type="button"
                                onClick={() => setShowEmojiHint(!showEmojiHint)}
                                className={`p-2 rounded-lg transition-all ${showEmojiHint ? 'bg-primary/20 text-primary' : 'text-white/20 hover:text-white/40 hover:bg-white/[0.03]'}`}
                            >
                                <Smile className="w-5 h-5" />
                            </button>

                            {/* Main Input */}
                            <div className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl flex items-center px-4 focus-within:border-primary/30 focus-within:bg-white/[0.06] transition-all">
                                <input
                                    ref={inputRef}
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={messagesLeft === 0 ? 'Limite diário atingido...' : 'Escreva uma mensagem...'}
                                    disabled={messagesLeft === 0}
                                    className="flex-1 bg-transparent border-0 outline-none text-white/90 text-sm placeholder:text-white/20 py-3 disabled:opacity-30"
                                />
                                {canSendAudio ? (
                                    <button type="button" className="text-white/20 hover:text-primary transition-colors p-1">
                                        <Mic className="w-4.5 h-4.5" />
                                    </button>
                                ) : (
                                    <div title="Disponível apenas para Nível Presidente" className="text-white/10 p-1">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                )}
                            </div>

                            {/* Send Button */}
                            <Button
                                type="submit"
                                disabled={!newMessage.trim() || messagesLeft === 0}
                                className="h-11 w-11 rounded-xl shrink-0 p-0 flex items-center justify-center border-0 text-white disabled:opacity-20 transition-all hover:scale-105 active:scale-95"
                                style={{ background: 'linear-gradient(135deg, hsl(210, 86%, 29%), hsl(210, 86%, 35%))' }}
                            >
                                <Send className="w-4.5 h-4.5" />
                            </Button>
                        </form>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════ */}
                {/* RIGHT SIDEBAR — User Info Panel (Desktop Only) */}
                {/* ══════════════════════════════════════════════════════════ */}
                <div className="hidden lg:flex lg:w-[280px] flex-col border-l border-white/5 shrink-0" style={{ background: 'linear-gradient(180deg, hsl(222, 47%, 12%), hsl(222, 47%, 9%))' }}>
                    {/* My Profile */}
                    <div className="p-5 border-b border-white/5 flex flex-col items-center text-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${levelColor.bg} ${levelColor.glow ? `shadow-xl ${levelColor.glow}` : ''} mb-3`}>
                            <span className={`text-2xl font-bold ${levelColor.text}`}>
                                {(profile?.nome || 'U')[0].toUpperCase()}
                            </span>
                        </div>
                        <h3 className="text-white font-bold text-sm">{profile?.nome || 'Usuário'}</h3>
                        <div className={`flex items-center gap-1 mt-1 px-2.5 py-1 rounded-full ${levelColor.bg}`}>
                            <LevelIcon className={`w-3 h-3 ${levelColor.text}`} />
                            <span className={`text-[10px] font-bold uppercase ${levelColor.text}`}>{userLevel.name}</span>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="p-4 space-y-3">
                        <p className="text-[9px] uppercase tracking-widest font-bold text-white/20">Informações</p>
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-white/30 text-xs">Pontuação</span>
                                <span className="text-white/80 text-xs font-bold">{profile?.score || 0} pts</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-white/30 text-xs">Msgs hoje</span>
                                <span className="text-white/80 text-xs font-bold">{dailyMessageCount}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-white/30 text-xs">Limite diário</span>
                                <span className={`text-xs font-bold ${limit === Infinity ? 'text-green-400' : 'text-white/80'}`}>
                                    {limit === Infinity ? '∞ Ilimitado' : `${limit} msgs`}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Privileges */}
                    <div className="p-4 border-t border-white/5 space-y-3">
                        <p className="text-[9px] uppercase tracking-widest font-bold text-white/20">Privilégios do Nível</p>
                        <div className="space-y-2">
                            {[
                                { label: 'Chat Público', unlocked: true },
                                { label: 'Status Online', unlocked: (profile?.score || 0) >= 600 },
                                { label: 'Chat Privado', unlocked: (profile?.score || 0) >= 800 },
                                { label: 'Mensagens de Áudio', unlocked: (profile?.score || 0) >= 1000 },
                                { label: 'Chamadas de Vídeo', unlocked: (profile?.score || 0) >= 1000 },
                            ].map((priv) => (
                                <div key={priv.label} className="flex items-center gap-2">
                                    {priv.unlocked ? (
                                        <ShieldCheck className="w-3.5 h-3.5 text-green-400 shrink-0" />
                                    ) : (
                                        <Lock className="w-3.5 h-3.5 text-white/15 shrink-0" />
                                    )}
                                    <span className={`text-xs ${priv.unlocked ? 'text-white/70' : 'text-white/20'}`}>{priv.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Next Level */}
                    {(profile?.score || 0) < 1000 && (
                        <div className="p-4 mt-auto border-t border-white/5">
                            <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                                <p className="text-[9px] uppercase tracking-widest font-bold text-white/20 mb-2">Próximo Nível</p>
                                <div className="w-full bg-white/5 rounded-full h-1.5 mb-1.5">
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{
                                            width: `${Math.min(100, ((profile?.score || 0) / (userLevel.minScore + 200)) * 100)}%`,
                                            background: 'linear-gradient(90deg, hsl(210, 86%, 29%), hsl(28, 91%, 54%))'
                                        }}
                                    />
                                </div>
                                <p className="text-[10px] text-white/30">{profile?.score || 0} / {userLevel.minScore + 200} pts</p>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </ClientLayout>
    );
}
