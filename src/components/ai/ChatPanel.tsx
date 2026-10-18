"use client";

import { useChat } from "ai/react";
import { useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles, Shield, ArrowRight } from "lucide-react";

const SUGGESTED_PROMPTS = [
  "What's my 30d revenue & dispute rate?",
  "Show failed transactions and risk flags",
  "Create an invoice for Acme Corp for $2,500",
  "How does my headphone pricing compare to market?",
  "Generate a shareable PayPal payment link for $49",
];

export function ChatPanel() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput } =
    useChat({ api: "/api/chat" });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSuggestion = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl flex flex-col h-full shadow-2xl backdrop-blur-xl overflow-hidden">
      {/* Purrweb Header Bar */}
      <div className="px-5 py-4 border-b border-slate-800/70 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">PaySight Copilot</h2>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-blue-500/10 text-cyan-400 border border-cyan-500/20">
                Agentic
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Gemini 2.0 Flash + PayPal Toolkit</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Active</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl rounded-tl-sm p-3.5 text-xs text-slate-200 leading-relaxed shadow-sm">
                👋 Welcome to your <strong>PaySight AI Copilot</strong>. I have direct access to your PayPal Sandbox ledger, dispute resolution tools, and live <strong>Channel3</strong> market pricing.
                <div className="mt-2 text-slate-400">
                  Ask me to analyze your revenue velocity, draft and send invoices, or check your competitive positioning!
                </div>
              </div>
            </div>

            {/* Quick Context Chips */}
            <div className="space-y-2 pt-2">
              <div className="text-[11px] font-semibold text-slate-400 px-1 uppercase tracking-wider">
                Instant Actions
              </div>
              <div className="flex flex-col gap-1.5">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSuggestion(prompt)}
                    className="group text-left text-xs bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white px-3 py-2 rounded-xl transition-all border border-slate-700/60 hover:border-blue-500/40 flex items-center justify-between"
                  >
                    <span className="truncate pr-2">{prompt}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${
                msg.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  msg.role === "user"
                    ? "bg-slate-700 text-slate-200"
                    : "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white"
                }`}
              >
                {msg.role === "user" ? (
                  <User className="w-3.5 h-3.5" />
                ) : (
                  <Bot className="w-3.5 h-3.5" />
                )}
              </div>
              <div
                className={`p-3.5 rounded-2xl text-xs max-w-[85%] leading-relaxed whitespace-pre-wrap shadow-sm ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-sm font-medium"
                    : "bg-slate-800/90 border border-slate-700/60 text-slate-200 rounded-tl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span className="text-xs text-slate-400">Executing PayPal &amp; Channel3 tools…</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-slate-800/80 bg-slate-900/90 flex gap-2 flex-shrink-0"
      >
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Instruct copilot or ask about business..."
          disabled={isLoading}
          className="flex-1 bg-slate-800 border border-slate-700/80 text-white text-xs rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 placeholder:text-slate-500 disabled:opacity-50 transition-all"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-all flex-shrink-0 shadow-md shadow-blue-600/20"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
