export default function Closing() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute -top-[10vh] -right-[10vw] w-[60vw] h-[60vw] rounded-full bg-primary opacity-25 blur-[140px]" />
      <div className="absolute -bottom-[20vh] -left-[15vw] w-[55vw] h-[55vw] rounded-full bg-accent opacity-20 blur-[140px]" />

      {/* Top brand row */}
      <div className="absolute top-[6vh] left-[6vw] right-[6vw] flex items-center justify-between">
        <div className="flex items-center gap-[1.2vw]">
          <svg viewBox="0 0 64 64" className="w-[3vw] h-[3vw]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="closeGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                <stop stopColor="#8b5cf6" />
                <stop offset="1" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            <circle cx="32" cy="32" r="26" stroke="url(#closeGrad)" strokeWidth="3" />
            <circle cx="32" cy="32" r="14" stroke="url(#closeGrad)" strokeWidth="3" />
            <circle cx="32" cy="32" r="5" fill="url(#closeGrad)" />
          </svg>
          <div className="font-display font-semibold text-[1.4vw] tracking-tight">NS Lens</div>
        </div>
        <div className="text-[1.1vw] text-muted">09 / 09</div>
      </div>

      {/* Centered hero */}
      <div className="absolute inset-0 flex flex-col justify-center px-[6vw]">
        <div className="text-[1.1vw] uppercase tracking-[0.5em] text-accent font-medium">One last thing</div>
        <h1 className="mt-[3vh] font-display font-black text-[7.5vw] leading-[0.95] tracking-tighter max-w-[80vw]">
          Don't lose another
        </h1>
        <h1 className="font-serif italic text-[7.5vw] leading-[0.95] tracking-tight bg-gradient-to-r from-primary via-fuchsia-400 to-accent bg-clip-text text-transparent">
          conversation.
        </h1>
        <p className="mt-[5vh] text-[1.6vw] text-muted max-w-[55vw] leading-relaxed">
          NS Lens is your network's memory — searchable from your laptop, callable from your phone,
          ready every time someone asks "do you know anyone who…?"
        </p>
      </div>

      {/* Bottom CTA row */}
      <div className="absolute bottom-[6vh] left-[6vw] right-[6vw] flex items-end justify-between border-t border-line pt-[2.5vh]">
        <div>
          <div className="text-[0.9vw] uppercase tracking-[0.3em] text-muted">Try it now</div>
          <div className="mt-[0.6vh] font-display text-[1.6vw] font-semibold tracking-tight">nslens.replit.app</div>
        </div>
        <div>
          <div className="text-[0.9vw] uppercase tracking-[0.3em] text-muted">Talk to the bot</div>
          <div className="mt-[0.6vh] font-display text-[1.6vw] font-semibold tracking-tight">@NetworkLens_bot</div>
        </div>
        <div className="text-right">
          <div className="text-[0.9vw] uppercase tracking-[0.3em] text-muted">Built at</div>
          <div className="mt-[0.6vh] font-display text-[1.6vw] font-semibold tracking-tight">Hackathon · 2026</div>
        </div>
      </div>
    </div>
  );
}
