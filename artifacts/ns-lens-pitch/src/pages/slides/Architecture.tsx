export default function Architecture() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute -bottom-[20vh] right-[10vw] w-[50vw] h-[50vw] rounded-full bg-primary opacity-10 blur-[140px]" />

      <div className="absolute top-[6vh] left-[6vw] right-[6vw] flex items-center justify-between">
        <div className="flex items-center gap-[1vw]">
          <div className="h-[1px] w-[3vw] bg-accent" />
          <div className="text-[1vw] uppercase tracking-[0.4em] text-accent font-medium">Under the hood</div>
        </div>
        <div className="text-[1.1vw] text-muted">07 / 08</div>
      </div>

      <div className="absolute top-[14vh] left-[6vw] right-[6vw]">
        <h2 className="font-display font-black text-[4.8vw] leading-[1] tracking-tighter">
          Built to feel
          <span className="font-serif italic font-normal bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {" "}instant.
          </span>
        </h2>
      </div>

      {/* Architecture flow */}
      <div className="absolute top-[36vh] left-[6vw] right-[6vw]">
        <div className="grid grid-cols-5 gap-[1vw] items-stretch">
          {/* Inputs */}
          <div className="rounded-[1vw] border border-line bg-ink p-[1.4vw]">
            <div className="text-[0.8vw] uppercase tracking-[0.3em] text-muted">Inputs</div>
            <div className="mt-[1vh] text-[1.3vw] font-display font-bold tracking-tight">Web · Telegram</div>
            <div className="mt-[0.8vh] text-[0.9vw] text-muted leading-snug">Passwordless auth, voice, text, forwards, attachments.</div>
          </div>

          <div className="grid place-items-center">
            <svg viewBox="0 0 24 24" className="w-[2.4vw] h-[2.4vw] text-accent" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </div>

          {/* Brain */}
          <div className="rounded-[1vw] border border-primary/50 bg-gradient-to-br from-primary/15 to-accent/10 p-[1.4vw]">
            <div className="text-[0.8vw] uppercase tracking-[0.3em] text-accent">Memory layer</div>
            <div className="mt-[1vh] text-[1.3vw] font-display font-bold tracking-tight">RAG · Vectors · Tags</div>
            <div className="mt-[0.8vh] text-[0.9vw] text-muted leading-snug">Per-user index. Embeds every interaction with citations.</div>
          </div>

          <div className="grid place-items-center">
            <svg viewBox="0 0 24 24" className="w-[2.4vw] h-[2.4vw] text-accent" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </div>

          {/* Outputs */}
          <div className="rounded-[1vw] border border-line bg-ink p-[1.4vw]">
            <div className="text-[0.8vw] uppercase tracking-[0.3em] text-muted">Outputs</div>
            <div className="mt-[1vh] text-[1.3vw] font-display font-bold tracking-tight">Answers · Nudges</div>
            <div className="mt-[0.8vh] text-[0.9vw] text-muted leading-snug">Ranked intros, scheduled follow-ups, calendar holds.</div>
          </div>
        </div>
      </div>

      {/* Stack pills */}
      <div className="absolute bottom-[8vh] left-[6vw] right-[6vw]">
        <div className="text-[0.85vw] uppercase tracking-[0.3em] text-muted mb-[1.4vh]">Stack</div>
        <div className="flex flex-wrap gap-[0.6vw]">
          <span className="px-[1vw] py-[0.8vh] rounded-full border border-line bg-ink text-[1vw] font-medium">React + Vite</span>
          <span className="px-[1vw] py-[0.8vh] rounded-full border border-line bg-ink text-[1vw] font-medium">Express API</span>
          <span className="px-[1vw] py-[0.8vh] rounded-full border border-line bg-ink text-[1vw] font-medium">Postgres + pgvector</span>
          <span className="px-[1vw] py-[0.8vh] rounded-full border border-line bg-ink text-[1vw] font-medium">Drizzle ORM</span>
          <span className="px-[1vw] py-[0.8vh] rounded-full border border-line bg-ink text-[1vw] font-medium">Telegram Bot API</span>
          <span className="px-[1vw] py-[0.8vh] rounded-full border border-line bg-ink text-[1vw] font-medium">OpenAI · Anthropic</span>
          <span className="px-[1vw] py-[0.8vh] rounded-full border border-line bg-ink text-[1vw] font-medium">Object Storage</span>
          <span className="px-[1vw] py-[0.8vh] rounded-full border border-line bg-ink text-[1vw] font-medium">Clerk Auth</span>
        </div>
      </div>
    </div>
  );
}
