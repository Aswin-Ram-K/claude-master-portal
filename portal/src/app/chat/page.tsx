"use client";

import { useState, useRef, useEffect } from "react";
import { PageTransition } from "@/components/layout/PageTransition";
import { Badge } from "@/components/shared/Badge";
import {
  MessageSquare,
  Send,
  Settings,
  Bot,
  User,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

function ChatBubble({ message }: { message: ChatMessageData }) {
  const isUser = message.role === "user";
  return (
    <div
      className={cn(
        "flex gap-3 animate-slide-up",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
          isUser
            ? "bg-gradient-to-br from-accent-indigo to-accent-violet"
            : "bg-bg-surface border border-border-subtle"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-accent-indigo" />
        )}
      </div>
      <div
        className={cn(
          "max-w-[85%] sm:max-w-[75%] rounded-xl px-4 py-3",
          isUser
            ? "bg-gradient-to-br from-accent-indigo/20 to-accent-violet/20 border border-accent-indigo/20"
            : "bg-bg-card border border-border-subtle"
        )}
      >
        <p className="text-sm text-text-primary whitespace-pre-wrap">
          {message.content}
        </p>
        <span className="text-xs text-text-muted mt-1 block">
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessageData[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm your Claude Code configuration assistant. I can help you manage your settings, hooks, skills, and automations.\n\nTry asking me:\n- \"Show my current settings\"\n- \"What hooks do I have configured?\"\n- \"Add a new SessionStart hook\"\n- \"Explain my stop hook script\"",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessageData = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Placeholder — will be replaced with actual API call
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "This is a placeholder response. The chat API will be connected in Phase 5, using Claude Code CLI as a subprocess to handle your requests with full read/write capability over your configuration files.",
          timestamp: new Date(),
        },
      ]);
      setLoading(false);
    }, 1500);
  };

  return (
    <PageTransition>
      <div className="flex flex-col h-[calc(100vh-7rem)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-accent-indigo" />
              Chat
            </h1>
          </div>
          <Badge variant="accent" className="flex items-center gap-1">
            <Settings className="w-3 h-3" />
            Scoped to: Claude Code Config
          </Badge>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4 min-h-0">
          {messages.map((message) => (
            <ChatBubble key={message.id} message={message} />
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-bg-surface border border-border-subtle flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-accent-indigo" />
              </div>
              <div className="bg-bg-card border border-border-subtle rounded-xl px-4 py-3">
                <Loader2 className="w-4 h-4 text-accent-indigo animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border-subtle pt-4">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask about your Claude Code setup..."
                className="w-full px-4 py-3 bg-bg-surface border border-border-subtle rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-indigo/50 focus:ring-1 focus:ring-accent-indigo/20 transition-all resize-none"
                rows={1}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="p-3 rounded-xl bg-gradient-to-r from-accent-indigo to-accent-violet text-white hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
