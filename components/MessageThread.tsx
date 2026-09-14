'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Send, ChevronDown, ImagePlus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { sendMessage } from '@/app/messages/[id]/actions';
import { formatDateTime } from '@/lib/format';
import type { Message } from '@/lib/types';

export function MessageThread({
  conversationId,
  currentUserId,
  initialMessages,
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [showNewMsg, setShowNewMsg] = useState(false);

  // 画像添付
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [attachPreview, setAttachPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceRef = useRef<RealtimeChannel | null>(null);

  function isNearBottom() {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
    bottomRef.current?.scrollIntoView({ behavior });
  }

  useEffect(() => {
    scrollToBottom('instant');
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const msgChannel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          if (msg.sender_id !== currentUserId) {
            if (isNearBottom()) {
              setTimeout(() => scrollToBottom(), 50);
            } else {
              setShowNewMsg(true);
            }
          }
        }
      )
      .subscribe();

    const presenceChannel = supabase.channel(`typing:${conversationId}`, {
      config: { presence: { key: currentUserId } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState<{ typing: boolean }>();
        const typing = Object.entries(state)
          .filter(([key]) => key !== currentUserId)
          .flatMap(([, v]) => v)
          .some((p) => (p as unknown as { typing: boolean }).typing);
        setOtherTyping(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await presenceChannel.track({ typing: false });
      });

    presenceRef.current = presenceChannel;

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [conversationId, currentUserId]);

  useEffect(() => {
    const last = messages.at(-1);
    if (last?.sender_id === currentUserId) scrollToBottom();
  }, [messages, currentUserId]);

  const trackTyping = useCallback(async (isTyping: boolean) => {
    const ch = presenceRef.current;
    if (!ch) return;
    await ch.track({ typing: isTyping });
  }, []);

  function onTextChange(val: string) {
    setText(val);
    trackTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => trackTyping(false), 2000);
  }

  function onImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachFile(file);
    setAttachPreview(URL.createObjectURL(file));
    e.target.value = '';
  }

  function removeAttach() {
    if (attachPreview) URL.revokeObjectURL(attachPreview);
    setAttachFile(null);
    setAttachPreview(null);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if ((!body && !attachFile) || sending) return;

    setSending(true);
    let attachmentUrl: string | null = null;

    if (attachFile) {
      const supabase = createClient();
      const ext = attachFile.type.split('/')[1] ?? 'jpg';
      const path = `${conversationId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('chat-images')
        .upload(path, attachFile, { contentType: attachFile.type });
      if (!upErr) {
        const { data: pub } = supabase.storage.from('chat-images').getPublicUrl(path);
        attachmentUrl = pub.publicUrl;
      }
      removeAttach();
    }

    setText('');
    trackTyping(false);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);

    const res = await sendMessage(conversationId, body, attachmentUrl);
    if (res.error) {
      setText(body);
      alert(res.error);
    }
    setSending(false);
  }

  const canSend = !sending && (!!text.trim() || !!attachFile);

  return (
    <div className="flex h-[65vh] flex-col">
      {/* メッセージ一覧 */}
      <div ref={scrollRef} className="relative flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-400">
            メッセージを送って取引を始めましょう。
          </p>
        )}

        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                  mine ? 'bg-navy-500 text-white' : 'bg-white text-slate-800 ring-1 ring-slate-200'
                }`}
              >
                {m.attachment_url && (
                  <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className="block mb-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.attachment_url}
                      alt="添付画像"
                      className="max-h-60 w-auto max-w-full rounded-xl object-contain hover:opacity-90"
                    />
                  </a>
                )}
                {m.body && (
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                )}
                <p className={`mt-1 text-[10px] ${mine ? 'text-navy-200' : 'text-slate-400'}`}>
                  {formatDateTime(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}

        {/* 入力中インジケーター */}
        {otherTyping && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl bg-white px-4 py-2.5 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
              <span className="flex gap-1">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="h-2 w-2 rounded-full bg-slate-400 animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </span>
              入力中…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 新着メッセージボタン */}
      {showNewMsg && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
          <button
            onClick={() => { scrollToBottom(); setShowNewMsg(false); }}
            className="flex items-center gap-1.5 rounded-full bg-navy-500 px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-navy-600"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            新着メッセージ
          </button>
        </div>
      )}

      {/* 画像プレビュー */}
      {attachPreview && (
        <div className="relative flex items-center gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={attachPreview} alt="添付プレビュー" className="h-16 w-24 rounded-lg object-cover" />
          <button
            type="button"
            onClick={removeAttach}
            className="absolute left-20 top-1 rounded-full bg-black/60 p-0.5 text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 入力フォーム */}
      <form
        onSubmit={handleSend}
        className="flex items-end gap-2 border-t border-slate-200 bg-white p-3"
      >
        {/* 画像添付ボタン */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 rounded-xl border border-slate-200 p-2.5 text-slate-400 hover:bg-slate-50 hover:text-navy-500"
          title="画像を添付"
        >
          <ImagePlus className="h-4 w-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onImagePick}
        />

        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend(e);
          }}
          rows={1}
          placeholder="メッセージを入力（Ctrl+Enterで送信）"
          className="input max-h-32 flex-1 resize-none"
        />
        <button
          type="submit"
          disabled={!canSend}
          className="btn-primary shrink-0 px-4 py-2.5 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
