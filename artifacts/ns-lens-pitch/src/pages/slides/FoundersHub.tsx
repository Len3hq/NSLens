export default function FoundersHub() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute -top-[15vh] left-[10vw] w-[55vw] h-[55vw] rounded-full bg-fuchsia-500 opacity-10 blur-[140px]" />

      <div className="absolute top-[6vh] left-[6vw] right-[6vw] flex items-center justify-between">
        <div className="flex items-center gap-[1vw]">
          <div className="h-[1px] w-[3vw] bg-accent" />
          <div className="text-[1vw] uppercase tracking-[0.4em] text-accent font-medium">Feature spotlight</div>
        </div>
        <div className="text-[1.1vw] text-muted">06 / 08</div>
      </div>

      <div className="absolute top-[14vh] left-[6vw] w-[44vw]">
        <h2 className="font-display font-black text-[4.8vw] leading-[1] tracking-tighter">
          Founders Hub
        </h2>
        <h2 className="font-serif italic text-[4.8vw] leading-[1] tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          fan-out
        </h2>
        <p className="mt-[3vh] text-[1.35vw] text-muted leading-relaxed">
          Post once — text, photos, video, or links. NS Lens reads your post, scans every founder's
          private network, and pings only the people for whom you're a real match.
        </p>

        <div className="mt-[4vh] grid grid-cols-2 gap-[1.4vw]">
          <div className="rounded-[1vw] border border-line bg-ink p-[1.6vw]">
            <div className="text-[2.4vw] font-display font-bold text-primary tracking-tight">1 → N</div>
            <div className="mt-[0.6vh] text-[1vw] text-muted leading-snug">One post, scoped intros across the entire community.</div>
          </div>
          <div className="rounded-[1vw] border border-line bg-ink p-[1.6vw]">
            <div className="text-[2.4vw] font-display font-bold text-accent tracking-tight">0 spam</div>
            <div className="mt-[0.6vh] text-[1vw] text-muted leading-snug">Matches use private memory — no broadcast, no noise.</div>
          </div>
        </div>
      </div>

      {/* Right: feed mockup */}
      <div className="absolute top-[14vh] right-[6vw] w-[36vw] space-y-[1.4vh]">
        {/* Post card */}
        <div className="rounded-[1.2vw] border border-line bg-ink p-[1.4vw]">
          <div className="flex items-center gap-[0.8vw]">
            <div className="w-[2.6vw] h-[2.6vw] rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-white font-bold text-[1vw]">A</div>
            <div className="min-w-0 flex-1">
              <div className="text-[1vw] font-semibold">@aria</div>
              <div className="text-[0.8vw] text-muted">2m ago</div>
            </div>
          </div>
          <div className="mt-[1.2vh] text-[1.05vw] leading-relaxed">
            Looking for a design engineer who has shipped <span className="text-accent">on-device LLM UX</span>. Equity + cash, SF or remote.
          </div>
          <div className="mt-[1.4vh] flex items-center gap-[0.8vw]">
            <div className="h-[5vh] w-[5vh] rounded-md bg-gradient-to-br from-fuchsia-500 to-primary" />
            <div className="text-[0.9vw] text-muted">attachment.png</div>
          </div>
        </div>

        {/* Match notification */}
        <div className="rounded-[1.2vw] border border-accent/40 bg-gradient-to-br from-accent/10 to-primary/10 p-[1.4vw]">
          <div className="flex items-center gap-[0.6vw]">
            <svg viewBox="0 0 24 24" className="w-[1.2vw] h-[1.2vw] text-accent" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9z" />
            </svg>
            <div className="text-[0.9vw] uppercase tracking-[0.3em] text-accent font-semibold">Match for you</div>
          </div>
          <div className="mt-[1vh] text-[1.05vw] leading-relaxed">
            <span className="font-semibold">3 contacts in your network</span> match Aria's ask. Top pick: <span className="text-accent font-semibold">Sam O.</span> — built Pixel's on-device assistant.
          </div>
          <div className="mt-[1.2vh] flex items-center gap-[0.6vw] text-[0.85vw] text-muted">
            <span>Confidence</span>
            <div className="flex-1 h-[0.5vh] rounded-full bg-line overflow-hidden">
              <div className="h-full w-[88%] bg-gradient-to-r from-primary to-accent" />
            </div>
            <span className="text-text font-semibold">88%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
