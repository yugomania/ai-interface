"use client";

import { useChat } from "ai/react";
import { useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles, ArrowRight, X } from "lucide-react";

const SUGGESTED_PROMPTS = [
  "Summarise my payments for the last 30 days.",
  "Show failed or pending transactions.",
  "Compare this product with relevant market listings.",
  "Prepare an invoice for this customer.",
];

interface ChatPanelProps {
  onClose?: () => void;
  prefillPrompt?: string;
  onClearPrefill?: () => void;
}

export function ChatPanel({ onClose, prefillPrompt, onClearPrefill }: ChatPanelProps) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput } =
    useChat({ api: "/api/chat" });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle contextual prefill prompt from anywhere in dashboard
  useEffect(() => {
    if (prefillPrompt && prefillPrompt.trim().length > 0) {
      setInput(prefillPrompt);
      onClearPrefill?.();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [prefillPrompt, setInput, onClearPrefill]);

  const handleSuggestion = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  return (
    <div className="bg-white border-l border-[#E5E5E5] flex flex-col h-full overflow-hidden shadow-2xl">
      {/* Header Bar */}
      <div className="px-5 py-3.5 border-b border-[#E5E5E5] flex items-center justify-between flex-shrink-0 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#FFF3EB] border border-[#FED7AA] flex items-center justify-center text-[#C2410C]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#171717]">Ask PaySight</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-[#F7F7F8] text-[#171717] border border-[#E5E5E5]">
                Copilot
              </span>
            </div>
            <p className="text-xs text-[#626262]">Merchant analytics &amp; PayPal actions</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#ECFDF3] border border-[#BBF7D0] text-[10px] text-[#15803D] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
            <span>Active</span>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#626262] hover:text-[#171717] hover:bg-[#F7F7F8] border border-[#E5E5E5] transition-colors focus:outline-none focus:ring-1 focus:ring-[#C2410C]"
              aria-label="Close assistant"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 min-h-0 bg-white">
        {messages.length === 0 ? (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 bg-[#FFF3EB] border border-[#FED7AA] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[#C2410C]">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="bg-[#F7F7F8] border border-[#E5E5E5] rounded-xl rounded-tl-sm p-3.5 text-xs text-[#171717] leading-relaxed break-words">
                👋 Welcome to <strong>PaySight Copilot</strong>. I have direct access to your PayPal Sandbox ledger, dispute resolution tools, and live <strong>Channel3</strong> market intelligence.
                <div className="mt-2 text-[#626262]">
                  Ask me to analyze your revenue velocity, draft and send invoices, or check your competitive positioning.
                </div>
              </div>
            </div>

            {/* Quick Context Chips */}
            <div className="space-y-2 pt-2">
              <div className="text-[11px] font-semibold text-[#626262] px-1 uppercase tracking-wider">
                Suggested Prompts
              </div>
              <div className="flex flex-col gap-1.5">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSuggestion(prompt)}
                    className="group text-left text-xs bg-white hover:bg-[#FFF3EB] text-[#171717] px-3 py-2 rounded-lg transition-colors border border-[#E5E5E5] hover:border-[#FED7AA] flex items-center justify-between"
                  >
                    <span className="truncate pr-2">{prompt}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#626262] group-hover:text-[#C2410C] transition-colors flex-shrink-0" />
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
                    ? "bg-[#111111] text-white"
                    : "bg-[#FFF3EB] border border-[#FED7AA] text-[#C2410C]"
                }`}
              >
                {msg.role === "user" ? (
                  <User className="w-3.5 h-3.5" />
                ) : (
                  <Bot className="w-3.5 h-3.5" />
                )}
              </div>
              <div
                className={`p-3.5 rounded-xl text-xs max-w-[85%] leading-relaxed whitespace-pre-wrap break-words ${
                  msg.role === "user"
                    ? "bg-[#FFF3EB] border border-[#FED7AA] text-[#171717] rounded-tr-sm font-medium"
                    : "bg-[#F7F7F8] border border-[#E5E5E5] text-[#171717] rounded-tl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 bg-[#FFF3EB] border border-[#FED7AA] rounded-full flex items-center justify-center flex-shrink-0 text-[#C2410C]">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-[#F7F7F8] border border-[#E5E5E5] rounded-xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-[#C2410C] animate-spin" />
              <span className="text-xs text-[#626262]">Executing PayPal &amp; Channel3 tools…</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box / Composer */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-[#E5E5E5] bg-white flex gap-2 flex-shrink-0"
      >
        <input
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about payments, invoices or pricing…"
          disabled={isLoading}
          className="flex-1 bg-white border border-[#E5E5E5] text-[#171717] text-xs rounded-lg px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#FFF3EB] focus:border-[#C2410C] placeholder:text-[#626262] disabled:opacity-50 transition-all"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          aria-label="Send message"
          className="bg-[#C2410C] hover:bg-[#9A3412] disabled:opacity-40 disabled:cursor-not-allowed text-white p-2.5 rounded-lg transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
