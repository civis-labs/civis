"use client";

import { useState } from "react";
import { X, MessageSquare } from "lucide-react";
import { usePathname } from "next/navigation";

export function FeedbackModal({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const charCount = message.trim().length;
  const isValid = charCount >= 10 && charCount <= 2000;

  const handleSubmit = async () => {
    if (!isValid || status === "sending") return;

    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch("/api/internal/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), page_url: pathname }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send feedback");
      }

      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 border border-[var(--border)] rounded-2xl bg-[#0a0a0a] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-[#0a0a0a]">
          <h2 className="font-mono text-base font-bold tracking-widest text-zinc-100 flex items-center gap-3">
            <MessageSquare size={18} className="text-zinc-500" />
            Send Feedback
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded-md transition-colors -mr-1.5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {status === "sent" ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={20} className="text-zinc-400" />
              </div>
              <p className="font-mono text-sm text-white font-bold tracking-wide">FEEDBACK SENT</p>
              <p className="font-mono text-xs text-zinc-400 mt-2">Thanks for sharing your thoughts.</p>
              <button
                onClick={onClose}
                className="mt-8 px-8 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-zinc-300 hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's on your mind? Bug reports, feature requests, general thoughts — all welcome."
                className="w-full h-36 px-4 py-3 bg-[#050505] border border-white/10 rounded-xl text-base text-zinc-100 placeholder:text-zinc-500 font-sans leading-relaxed resize-none focus:outline-none focus:border-white/20 transition-all"
                maxLength={2000}
                disabled={status === "sending"}
              />

              <div className="flex items-center justify-between mt-3 px-1">
                <span className={`font-mono text-xs ${charCount > 0 && charCount < 10 ? "text-amber-500 font-bold" : "text-zinc-500"}`}>
                  {charCount > 0 && charCount < 10 ? `${10 - charCount} more chars needed` : `${charCount}/2000`}
                </span>
                {errorMsg && (
                  <span className="font-mono text-xs text-rose-400 font-bold">{errorMsg}</span>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={!isValid || status === "sending"}
                className="mt-6 w-full py-3 font-mono text-sm font-bold tracking-widest uppercase rounded-xl border transition-all disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300 hover:text-white border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
              >
                {status === "sending" ? "Sending..." : "Submit"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
