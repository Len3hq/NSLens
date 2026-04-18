export default function Title() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      {/* Ambient gradient blobs */}
      <div className="absolute -top-[20vh] -left-[10vw] w-[60vw] h-[60vw] rounded-full bg-primary opacity-30 blur-[120px]" />
      <div className="absolute -bottom-[25vh] right-[-10vw] w-[55vw] h-[55vw] rounded-full bg-accent opacity-20 blur-[140px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(139,92,246,0.08),transparent_60%)]" />

      {/* Top brand row */}
      <div className="absolute top-[6vh] left-[6vw] right-[6vw] flex items-center justify-between">
        <div className="flex items-center gap-[1.2vw]">
          <svg viewBox="0 0 64 64" className="w-[3.2vw] h-[3.2vw]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="lensGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                <stop stopColor="#8b5cf6" />
                <stop offset="1" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            <circle cx="32" cy="32" r="26" stroke="url(#lensGrad)" strokeWidth="3" />
            <circle cx="32" cy="32" r="14" stroke="url(#lensGrad)" strokeWidth="3" />
            <circle cx="32" cy="32" r="5" fill="url(#lensGrad)" />
          </svg>
          <div className="font-display font-semibold text-[1.5vw] tracking-tight">NS Lens</div>
        </div>
        <div className="text-[1.1vw] text-muted tracking-[0.3em] uppercase">Hackathon · 2026</div>
      </div>

      {/* Hero */}
      <div className="absolute inset-0 flex flex-col justify-center px-[6vw]">
        <div className="text-[1.2vw] text-accent uppercase tracking-[0.4em] font-medium mb-[3vh]">
          A personal CRM for people who actually meet people
        </div>
        <h1 className="font-display font-black text-[8vw] leading-[0.95] tracking-tighter max-w-[80vw]">
          Your relationships,
        </h1>
        <h1 className="font-serif italic font-normal text-[8vw] leading-[0.95] tracking-tight bg-gradient-to-r from-primary via-fuchsia-400 to-accent bg-clip-text text-transparent">
          in focus.
        </h1>
        <div className="mt-[5vh] max-w-[55vw] text-[1.6vw] text-muted leading-relaxed">
          NS Lens turns every contact, conversation, and follow-up into a living memory you can
          search, ask, and act on — from the web or right inside Telegram.
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-[5vh] left-[6vw] right-[6vw] flex items-end justify-between">
        <div className="text-[1.1vw] text-muted">Built for founders, operators, and connectors.</div>
        <div className="text-[1.1vw] text-muted">01 / 07</div>
      </div>
    </div>
  );
}
