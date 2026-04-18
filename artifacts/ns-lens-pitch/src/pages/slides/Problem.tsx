export default function Problem() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute -top-[30vh] right-[-15vw] w-[65vw] h-[65vw] rounded-full bg-primary opacity-15 blur-[140px]" />

      {/* Section label */}
      <div className="absolute top-[6vh] left-[6vw] flex items-center gap-[1vw]">
        <div className="h-[1px] w-[3vw] bg-accent" />
        <div className="text-[1vw] uppercase tracking-[0.4em] text-accent font-medium">The problem</div>
      </div>
      <div className="absolute top-[6vh] right-[6vw] text-[1.1vw] text-muted">02 / 07</div>

      {/* Hero quote */}
      <div className="absolute inset-0 flex flex-col justify-center px-[6vw]">
        <h2 className="font-display font-black text-[6.5vw] leading-[1.02] tracking-tighter max-w-[78vw]">
          We meet hundreds.
        </h2>
        <h2 className="font-display font-black text-[6.5vw] leading-[1.02] tracking-tighter text-muted">
          Remember dozens.
        </h2>
        <h2 className="font-serif italic text-[6.5vw] leading-[1.02] tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Follow up with none.
        </h2>
      </div>

      {/* Three pain stats */}
      <div className="absolute bottom-[6vh] left-[6vw] right-[6vw] grid grid-cols-3 gap-[2vw]">
        <div className="border-t border-line pt-[2vh]">
          <div className="font-display text-[3.2vw] font-bold tracking-tight text-text">73%</div>
          <div className="text-[1.1vw] text-muted leading-snug mt-[0.6vh]">
            of new connections are never contacted again after the first meeting.
          </div>
        </div>
        <div className="border-t border-line pt-[2vh]">
          <div className="font-display text-[3.2vw] font-bold tracking-tight text-text">8 apps</div>
          <div className="text-[1.1vw] text-muted leading-snug mt-[0.6vh]">
            scattered across notes, contacts, calendars, DMs, and screenshots.
          </div>
        </div>
        <div className="border-t border-line pt-[2vh]">
          <div className="font-display text-[3.2vw] font-bold tracking-tight text-text">0 memory</div>
          <div className="text-[1.1vw] text-muted leading-snug mt-[0.6vh]">
            shared between your inbox, your CRM, and the AI you actually talk to.
          </div>
        </div>
      </div>
    </div>
  );
}
