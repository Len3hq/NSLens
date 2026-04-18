export default function HowItWorks() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute -top-[20vh] left-[20vw] w-[50vw] h-[50vw] rounded-full bg-primary opacity-15 blur-[140px]" />

      <div className="absolute top-[6vh] left-[6vw] right-[6vw] flex items-center justify-between">
        <div className="flex items-center gap-[1vw]">
          <div className="h-[1px] w-[3vw] bg-accent" />
          <div className="text-[1vw] uppercase tracking-[0.4em] text-accent font-medium">How it works</div>
        </div>
        <div className="text-[1.1vw] text-muted">04 / 08</div>
      </div>

      <div className="absolute top-[14vh] left-[6vw] right-[6vw]">
        <h2 className="font-display font-black text-[5.2vw] leading-[1] tracking-tighter">
          Three steps,
          <span className="font-serif italic font-normal bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {" "}zero friction.
          </span>
        </h2>
      </div>

      {/* Three step cards with connecting line */}
      <div className="absolute top-[42vh] left-[6vw] right-[6vw]">
        <div className="relative">
          {/* Connector line */}
          <div className="absolute top-[4vh] left-[12vw] right-[12vw] h-[2px] bg-gradient-to-r from-primary via-fuchsia-400 to-accent opacity-50" />

          <div className="grid grid-cols-3 gap-[3vw] relative">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-[8vw] h-[8vw] rounded-full bg-ink border-2 border-primary grid place-items-center relative z-10">
                <svg viewBox="0 0 24 24" className="w-[3.5vw] h-[3.5vw]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" className="text-primary" />
                </svg>
              </div>
              <div className="mt-[2.5vh] font-display text-[1.6vw] font-bold tracking-tight">Add a contact</div>
              <div className="mt-[1vh] text-[1.1vw] text-muted leading-relaxed max-w-[20vw]">
                Type, paste, or forward a Telegram message. NS Lens auto-extracts name, role, and tags.
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-[8vw] h-[8vw] rounded-full bg-ink border-2 border-fuchsia-400 grid place-items-center relative z-10">
                <svg viewBox="0 0 24 24" className="w-[3.5vw] h-[3.5vw]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" className="text-fuchsia-400" />
                </svg>
              </div>
              <div className="mt-[2.5vh] font-display text-[1.6vw] font-bold tracking-tight">Log every touch</div>
              <div className="mt-[1vh] text-[1.1vw] text-muted leading-relaxed max-w-[20vw]">
                Calls, coffees, DMs, intros. Each one is embedded into your private memory layer.
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-[8vw] h-[8vw] rounded-full bg-ink border-2 border-accent grid place-items-center relative z-10">
                <svg viewBox="0 0 24 24" className="w-[3.5vw] h-[3.5vw]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" className="text-accent" />
                  <path d="M21 21l-4.3-4.3" className="text-accent" />
                </svg>
              </div>
              <div className="mt-[2.5vh] font-display text-[1.6vw] font-bold tracking-tight">Ask anything</div>
              <div className="mt-[1vh] text-[1.1vw] text-muted leading-relaxed max-w-[20vw]">
                "Who in my network ships AI infra?" Answers come back with citations to real notes.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-[5vh] left-[6vw] text-[1vw] text-muted">
        Capture once. Recall everywhere.
      </div>
    </div>
  );
}
