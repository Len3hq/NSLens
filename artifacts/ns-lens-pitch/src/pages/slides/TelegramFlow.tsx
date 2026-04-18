export default function TelegramFlow() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute -top-[20vh] -right-[10vw] w-[55vw] h-[55vw] rounded-full bg-accent opacity-15 blur-[140px]" />
      <div className="absolute -bottom-[20vh] -left-[10vw] w-[45vw] h-[45vw] rounded-full bg-primary opacity-15 blur-[120px]" />

      <div className="absolute top-[6vh] left-[6vw] right-[6vw] flex items-center justify-between">
        <div className="flex items-center gap-[1vw]">
          <div className="h-[1px] w-[3vw] bg-accent" />
          <div className="text-[1vw] uppercase tracking-[0.4em] text-accent font-medium">In your pocket</div>
        </div>
        <div className="text-[1.1vw] text-muted">05 / 08</div>
      </div>

      {/* Left: copy */}
      <div className="absolute top-[18vh] left-[6vw] w-[44vw]">
        <h2 className="font-display font-black text-[4.6vw] leading-[1] tracking-tighter">
          Your CRM lives
          <span className="font-serif italic font-normal bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {" "}inside Telegram.
          </span>
        </h2>
        <p className="mt-[3vh] text-[1.4vw] text-muted leading-relaxed">
          Forward a message to log a contact. Voice-note a meeting recap. Ask a question and get an
          answer with sources — without ever opening a browser.
        </p>

        <div className="mt-[4vh] space-y-[1.6vh]">
          <div className="flex items-start gap-[1vw]">
            <div className="mt-[0.6vh] w-[0.7vw] h-[0.7vw] rounded-full bg-accent shrink-0" />
            <div className="text-[1.2vw] text-text">
              <span className="font-semibold">Forward</span>
              <span className="text-muted"> a chat → contact created with auto-tags.</span>
            </div>
          </div>
          <div className="flex items-start gap-[1vw]">
            <div className="mt-[0.6vh] w-[0.7vw] h-[0.7vw] rounded-full bg-fuchsia-400 shrink-0" />
            <div className="text-[1.2vw] text-text">
              <span className="font-semibold">Voice-note</span>
              <span className="text-muted"> "met Priya at Demo Day" → transcribed & filed.</span>
            </div>
          </div>
          <div className="flex items-start gap-[1vw]">
            <div className="mt-[0.6vh] w-[0.7vw] h-[0.7vw] rounded-full bg-primary shrink-0" />
            <div className="text-[1.2vw] text-text">
              <span className="font-semibold">Ask</span>
              <span className="text-muted"> "/who works on RAG?" → ranked answers, in chat.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: phone mockup with Telegram chat */}
      <div className="absolute top-[10vh] right-[8vw] w-[26vw] h-[78vh] rounded-[3vw] bg-ink border-[0.4vw] border-line shadow-2xl overflow-hidden flex flex-col">
        {/* Phone notch */}
        <div className="h-[2.6vh] bg-[#0f0e1a] flex items-center justify-center relative shrink-0">
          <div className="w-[5vw] h-[1.4vh] rounded-full bg-bg" />
        </div>

        {/* Telegram header */}
        <div className="px-[1.4vw] py-[1.4vh] bg-[#17212b] flex items-center gap-[1vw] shrink-0 border-b border-[#0f1620]">
          <div className="w-[3vw] h-[3vw] rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-white font-bold text-[1.2vw]">N</div>
          <div className="min-w-0 flex-1">
            <div className="text-[1.1vw] font-semibold text-white truncate">NS Lens Bot</div>
            <div className="text-[0.85vw] text-[#7a8a99]">online · ready</div>
          </div>
          <svg viewBox="0 0 24 24" className="w-[1.4vw] h-[1.4vw] text-[#7a8a99]" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
        </div>

        {/* Chat body */}
        <div className="flex-1 px-[1.2vw] py-[1.6vh] bg-[#0e1621] space-y-[1.2vh] overflow-hidden">
          {/* Date pill */}
          <div className="flex justify-center">
            <div className="text-[0.75vw] px-[0.8vw] py-[0.4vh] rounded-full bg-[#182533] text-[#7a8a99] uppercase tracking-wider">Today</div>
          </div>

          {/* Outgoing: forwarded contact */}
          <div className="flex justify-end">
            <div className="max-w-[80%] bg-[#2b5278] text-white rounded-[1.2vw] rounded-br-[0.4vw] px-[1vw] py-[1vh] text-[0.95vw] leading-snug">
              <div className="text-[0.75vw] text-[#a8c7e7] font-medium">Forwarded from Priya R.</div>
              <div className="mt-[0.4vh]">Hey! Loved your talk on RAG eval at AI Founders today. Let's chat next week?</div>
            </div>
          </div>

          {/* Incoming: bot confirms */}
          <div className="flex justify-start">
            <div className="max-w-[85%] bg-[#182533] text-white rounded-[1.2vw] rounded-bl-[0.4vw] px-[1vw] py-[1vh] text-[0.95vw] leading-snug">
              <div className="font-semibold text-[#22d3ee]">Saved Priya R.</div>
              <div className="mt-[0.4vh] text-[#cfd8e3]">tagged: <span className="text-white">AI · RAG · founder</span></div>
              <div className="mt-[0.4vh] text-[#cfd8e3]">follow-up scheduled <span className="text-white">Mon 9:00</span></div>
            </div>
          </div>

          {/* Outgoing: query */}
          <div className="flex justify-end">
            <div className="max-w-[80%] bg-[#2b5278] text-white rounded-[1.2vw] rounded-br-[0.4vw] px-[1vw] py-[1vh] text-[0.95vw]">
              /who in my network ships AI infra?
            </div>
          </div>

          {/* Incoming: ranked answer */}
          <div className="flex justify-start">
            <div className="max-w-[88%] bg-[#182533] text-white rounded-[1.2vw] rounded-bl-[0.4vw] px-[1vw] py-[1vh] text-[0.9vw] leading-snug">
              <div className="font-semibold text-[#22d3ee]">Top 3 matches</div>
              <div className="mt-[0.5vh] text-[#cfd8e3]"><span className="text-white">1. Maya L.</span> — vector DB, Series A</div>
              <div className="text-[#cfd8e3]"><span className="text-white">2. Devon K.</span> — GPU orchestration</div>
              <div className="text-[#cfd8e3]"><span className="text-white">3. Priya R.</span> — RAG eval (just met)</div>
            </div>
          </div>
        </div>

        {/* Input bar */}
        <div className="px-[1vw] py-[1vh] bg-[#17212b] flex items-center gap-[0.6vw] border-t border-[#0f1620] shrink-0">
          <div className="flex-1 bg-[#242f3d] rounded-full px-[1vw] py-[0.8vh] text-[0.85vw] text-[#7a8a99]">
            Message NS Lens Bot…
          </div>
          <div className="w-[2.4vw] h-[2.4vw] rounded-full bg-[#22d3ee] grid place-items-center">
            <svg viewBox="0 0 24 24" className="w-[1.2vw] h-[1.2vw] text-[#0e1621]" fill="currentColor">
              <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
