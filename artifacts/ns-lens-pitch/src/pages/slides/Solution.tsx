export default function Solution() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute -bottom-[20vh] -left-[10vw] w-[55vw] h-[55vw] rounded-full bg-accent opacity-15 blur-[120px]" />

      {/* Header */}
      <div className="absolute top-[6vh] left-[6vw] right-[6vw] flex items-center justify-between">
        <div className="flex items-center gap-[1vw]">
          <div className="h-[1px] w-[3vw] bg-accent" />
          <div className="text-[1vw] uppercase tracking-[0.4em] text-accent font-medium">The solution</div>
        </div>
        <div className="text-[1.1vw] text-muted">03 / 07</div>
      </div>

      <div className="absolute top-[15vh] left-[6vw] right-[6vw]">
        <h2 className="font-display font-black text-[5.5vw] leading-[1] tracking-tighter">
          One brain for your
          <span className="font-serif italic font-normal bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {" "}whole network.
          </span>
        </h2>
        <p className="mt-[2vh] text-[1.5vw] text-muted max-w-[60vw] leading-relaxed">
          NS Lens captures every interaction once and gives it back to you everywhere — searchable,
          rankable, and queryable in plain English.
        </p>
      </div>

      {/* Four pillars */}
      <div className="absolute bottom-[6vh] left-[6vw] right-[6vw] grid grid-cols-4 gap-[1.6vw]">
        <div className="rounded-[1.2vw] border border-line bg-ink p-[2vw]">
          <div className="text-[2.4vw] font-display font-bold text-primary">01</div>
          <div className="mt-[1.5vh] text-[1.4vw] font-semibold tracking-tight">Capture</div>
          <div className="mt-[0.8vh] text-[1vw] text-muted leading-snug">
            Contacts, interactions, voice notes, and Telegram messages — all in one timeline.
          </div>
        </div>
        <div className="rounded-[1.2vw] border border-line bg-ink p-[2vw]">
          <div className="text-[2.4vw] font-display font-bold text-primary">02</div>
          <div className="mt-[1.5vh] text-[1.4vw] font-semibold tracking-tight">Remember</div>
          <div className="mt-[0.8vh] text-[1vw] text-muted leading-snug">
            Per-user RAG memory, AI tags, priority ranking — your own vector brain.
          </div>
        </div>
        <div className="rounded-[1.2vw] border border-line bg-ink p-[2vw]">
          <div className="text-[2.4vw] font-display font-bold text-primary">03</div>
          <div className="mt-[1.5vh] text-[1.4vw] font-semibold tracking-tight">Act</div>
          <div className="mt-[0.8vh] text-[1vw] text-muted leading-snug">
            Scheduled follow-ups and calendar nudges land on the right day, not "someday".
          </div>
        </div>
        <div className="rounded-[1.2vw] border border-line bg-ink p-[2vw]">
          <div className="text-[2.4vw] font-display font-bold text-primary">04</div>
          <div className="mt-[1.5vh] text-[1.4vw] font-semibold tracking-tight">Ask</div>
          <div className="mt-[0.8vh] text-[1vw] text-muted leading-snug">
            Chat your CRM. From the web app or right inside Telegram, anywhere you are.
          </div>
        </div>
      </div>
    </div>
  );
}
