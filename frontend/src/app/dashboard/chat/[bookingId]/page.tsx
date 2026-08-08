'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';
import { request } from '@/lib/api';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;
  const { user, accessToken, isLoading: authLoading } = useAuth();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Protect route
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/dashboard');
    }
  }, [authLoading, user, router]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch initial messages & Polling Fallback
  const fetchMessages = useCallback(async () => {
    if (!accessToken || !bookingId) return;
    try {
      const data = await request<{ messages: any[] }>(`/api/messages/${bookingId}`, {
        token: accessToken
      });
      setMessages(data.messages);
    } catch (err) {
      console.error('Failed to fetch messages', err);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, bookingId]);

  // Initial load
  useEffect(() => {
    if (user && accessToken) {
      fetchMessages();
    }
  }, [user, accessToken, fetchMessages]);

  const isConnectedRef = useRef(false);

  // Socket setup & Fallback Polling
  useEffect(() => {
    if (!accessToken || !bookingId) return;

    // 1. Setup Socket
    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
      withCredentials: true
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      isConnectedRef.current = true;
      socket.emit('join_booking_room', bookingId);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      isConnectedRef.current = false;
    });

    socket.on('receive_message', (message: any) => {
      setMessages((prev) => {
        // Prevent duplicates if we already added it locally
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    // 2. Setup Polling Fallback
    const pollInterval = setInterval(() => {
      if (!isConnectedRef.current) {
        fetchMessages();
      }
    }, 5000);

    return () => {
      socket.disconnect();
      clearInterval(pollInterval);
    };
  }, [accessToken, bookingId, fetchMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending || !accessToken) return;

    setIsSending(true);
    setError('');

    try {
      const data = await request<{ message: any }>(`/api/messages/${bookingId}`, {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ content: inputText })
      });

      setMessages(prev => prev.some(m => m.id === data.message.id) ? prev : [...prev, data.message]);
      setInputText('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Only call handleSend if there's text
      if (inputText.trim() && !isSending) {
        // Pass a synthetic event-like object to satisfy TypeScript if needed, 
        // or refactor handleSend to take optional event.
        handleSend(e as unknown as React.FormEvent); 
      }
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-primary" />
      </div>
    );
  }

  return (
    // Fixed height container matching viewport minus standard nav height, to prevent body scroll
    <div className="flex h-[calc(100dvh-69px)] flex-col bg-[#F7F8FA] relative overflow-hidden">
      
      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <div className="absolute top-0 w-full z-20 flex items-center justify-between border-b border-gray-100/50 bg-white/70 backdrop-blur-xl px-4 py-3 sm:px-8 shadow-sm">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/dashboard" className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100/50 text-gray-500 hover:bg-gray-200 transition-colors">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </Link>
          <div>
            <h2 className="text-lg font-heading font-extrabold text-gray-900 tracking-tight">Conversation</h2>
            <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase mt-0.5">
              <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-success shadow-[0_0_8px_rgba(0,166,126,0.6)]' : 'bg-warning animate-pulse'}`} />
              <span className={isConnected ? 'text-success' : 'text-warning'}>
                {isConnected ? 'Online' : 'Reconnecting...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Messages Area ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pt-24 pb-32 sm:px-8 sm:pb-36 no-scrollbar relative">
        <div className="max-w-3xl mx-auto w-full flex flex-col space-y-5">
          {isLoading ? (
            <>
              <div className="flex justify-start"><Skeleton className="h-12 w-3/4 max-w-sm rounded-3xl rounded-bl-sm" /></div>
              <div className="flex justify-end"><Skeleton className="h-16 w-2/3 max-w-sm rounded-3xl rounded-br-sm" /></div>
              <div className="flex justify-end"><Skeleton className="h-10 w-1/2 max-w-sm rounded-3xl rounded-br-sm" /></div>
              <div className="flex justify-start"><Skeleton className="h-20 w-4/5 max-w-sm rounded-3xl rounded-bl-sm" /></div>
            </>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-20">
              <div className="mb-6 rounded-full bg-primary/5 p-6 ring-1 ring-primary/10">
                <svg className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-heading font-extrabold text-foreground">Start the Conversation</h3>
              <p className="mt-2 max-w-xs text-sm text-muted font-medium">
                Introduce yourself and coordinate pickup details to make this rental smooth.
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((m) => {
                const isMine = m.senderId === user.id;
                return (
                  <motion.div 
                    key={m.id} 
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] sm:max-w-[75%] rounded-3xl px-5 py-3 shadow-sm ${
                      isMine 
                        ? 'bg-black text-white rounded-br-sm shadow-[0_4px_14px_0_rgb(0,0,0,0.1)]' 
                        : 'bg-white text-gray-900 border border-gray-100 rounded-bl-sm'
                    }`}>
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{m.content}</p>
                      <span className={`mt-1 block text-[10px] font-semibold tracking-wider ${isMine ? 'text-gray-400' : 'text-gray-400'}`}>
                        {format(new Date(m.createdAt), 'h:mm a')}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* ─── Input Area ───────────────────────────────────────────────────── */}
      <div className="absolute bottom-0 w-full z-20 pb-4 sm:pb-8 pt-4 px-4 bg-gradient-to-t from-[#F7F8FA] via-[#F7F8FA] to-transparent pointer-events-none">
        <div className="max-w-3xl mx-auto w-full pointer-events-auto">
          {error && <p className="mb-2 text-xs text-red-600 text-center bg-red-50 py-1 rounded-full">{error}</p>}
          <form 
            onSubmit={handleSend} 
            className="flex items-end gap-2 bg-white rounded-[2rem] p-2 shadow-[0_8px_30px_rgb(0,0,0,0.08)] ring-1 ring-gray-200/50 transition-all focus-within:ring-black focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
          >
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="max-h-32 min-h-[48px] w-full resize-none bg-transparent px-4 py-3.5 text-[15px] font-medium text-foreground placeholder-gray-400 focus:outline-none no-scrollbar"
              rows={1}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                inputText.trim() && !isSending 
                  ? 'bg-black text-white shadow-md hover:scale-105' 
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {isSending ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <svg className="h-5 w-5 ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              )}
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}
