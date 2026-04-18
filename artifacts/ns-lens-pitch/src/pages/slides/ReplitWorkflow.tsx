export default function ReplitWorkflow() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute -top-[15vh] right-[5vw] w-[50vw] h-[50vw] rounded-full bg-accent opacity-12 blur-[140px]" />
      <div className="absolute -bottom-[20vh] left-[0vw] w-[45vw] h-[45vw] rounded-full bg-primary opacity-12 blur-[140px]" />

      {/* Header */}
      <div className="absolute top-[5vh] left-[6vw] right-[6vw] flex items-center justify-between">
        <div className="flex items-center gap-[1vw]">
          <div className="h-[1px] w-[3vw] bg-accent" />
          <div className="text-[1vw] uppercase tracking-[0.4em] text-accent font-medium">Built on Replit</div>
        </div>
        <div className="text-[1.1vw] text-muted">08 / 09</div>
      </div>

      {/* Title */}
      <div className="absolute top-[12vh] left-[6vw] right-[6vw]">
        <h2 className="font-display font-black text-[4.4vw] leading-[1] tracking-tighter">
          End-to-end on
          <span className="font-serif italic font-normal bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {" "}Replit.
          </span>
        </h2>
        <p className="mt-[1.6vh] text-[1.2vw] text-muted max-w-[70vw] leading-relaxed">
          One workspace, one prompt, one URL — from idea to a live, multi-service app.
        </p>
      </div>

      {/* Pipeline: 5 stages */}
      <div className="absolute top-[28vh] left-[6vw] right-[6vw]">
        <div className="grid grid-cols-9 gap-0 items-stretch">
          {/* Stage 1 */}
          <div className="col-span-1 rounded-[1vw] border border-line bg-ink p-[1.2vw]">
            <div className="text-[0.75vw] uppercase tracking-[0.3em] text-accent font-semibold">01</div>
            <div className="mt-[0.8vh] text-[1.1vw] font-display font-bold tracking-tight leading-tight">Prompt &amp; Plan</div>
            <div className="mt-[0.8vh] text-[0.85vw] text-muted leading-snug">Replit Agent scopes features into project tasks.</div>
          </div>
          <div className="col-span-1 grid place-items-center">
            <svg viewBox="0 0 24 24" className="w-[1.6vw] h-[1.6vw] text-line" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </div>
          {/* Stage 2 */}
          <div className="col-span-1 rounded-[1vw] border border-line bg-ink p-[1.2vw]">
            <div className="text-[0.75vw] uppercase tracking-[0.3em] text-accent font-semibold">02</div>
            <div className="mt-[0.8vh] text-[1.1vw] font-display font-bold tracking-tight leading-tight">Scaffold</div>
            <div className="mt-[0.8vh] text-[0.85vw] text-muted leading-snug">pnpm monorepo: web, api-server, slides artifacts.</div>
          </div>
          <div className="col-span-1 grid place-items-center">
            <svg viewBox="0 0 24 24" className="w-[1.6vw] h-[1.6vw] text-line" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </div>
          {/* Stage 3 */}
          <div className="col-span-1 rounded-[1vw] border border-primary/50 bg-gradient-to-br from-primary/12 to-accent/8 p-[1.2vw]">
            <div className="text-[0.75vw] uppercase tracking-[0.3em] text-accent font-semibold">03</div>
            <div className="mt-[0.8vh] text-[1.1vw] font-display font-bold tracking-tight leading-tight">Build &amp; Iterate</div>
            <div className="mt-[0.8vh] text-[0.85vw] text-muted leading-snug">Workflows hot-reload on every edit; canvas previews UI variants.</div>
          </div>
          <div className="col-span-1 grid place-items-center">
            <svg viewBox="0 0 24 24" className="w-[1.6vw] h-[1.6vw] text-line" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </div>
          {/* Stage 4 */}
          <div className="col-span-1 rounded-[1vw] border border-line bg-ink p-[1.2vw]">
            <div className="text-[0.75vw] uppercase tracking-[0.3em] text-accent font-semibold">04</div>
            <div className="mt-[0.8vh] text-[1.1vw] font-display font-bold tracking-tight leading-tight">Wire Services</div>
            <div className="mt-[0.8vh] text-[0.85vw] text-muted leading-snug">Postgres, Object Storage, secrets, Telegram bot — one click.</div>
          </div>
          <div className="col-span-1 grid place-items-center">
            <svg viewBox="0 0 24 24" className="w-[1.6vw] h-[1.6vw] text-line" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </div>
          {/* Stage 5 */}
          <div className="col-span-1 rounded-[1vw] border border-accent/50 bg-gradient-to-br from-accent/12 to-primary/8 p-[1.2vw]">
            <div className="text-[0.75vw] uppercase tracking-[0.3em] text-accent font-semibold">05</div>
            <div className="mt-[0.8vh] text-[1.1vw] font-display font-bold tracking-tight leading-tight">Deploy</div>
            <div className="mt-[0.8vh] text-[0.85vw] text-muted leading-snug">Autoscale on .replit.app with TLS, health checks, logs.</div>
          </div>
        </div>
      </div>

      {/* Workspace mock + side panel */}
      <div className="absolute bottom-[5vh] left-[6vw] right-[6vw] grid grid-cols-12 gap-[1.4vw]">
        {/* Workspace mock */}
        <div className="col-span-8 rounded-[1vw] border border-line bg-ink overflow-hidden">
          {/* Title bar */}
          <div className="flex items-center gap-[0.6vw] px-[1vw] py-[1vh] border-b border-line bg-[#0f0e1a]">
            <div className="flex gap-[0.4vw]">
              <span className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#ff5f56]" />
              <span className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#ffbd2e]" />
              <span className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#27c93f]" />
            </div>
            <div className="ml-[0.6vw] text-[0.85vw] text-muted">replit.com / nslens</div>
            <div className="ml-auto flex gap-[0.4vw]">
              <span className="px-[0.6vw] py-[0.3vh] rounded-md bg-line text-[0.75vw] text-muted">Agent</span>
              <span className="px-[0.6vw] py-[0.3vh] rounded-md bg-line text-[0.75vw] text-muted">Workflows</span>
              <span className="px-[0.6vw] py-[0.3vh] rounded-md bg-primary/30 text-[0.75vw] text-text">Preview</span>
            </div>
          </div>
          {/* Body: 3-column workspace */}
          <div className="grid grid-cols-12 h-[24vh]">
            {/* Files */}
            <div className="col-span-3 border-r border-line p-[0.8vw] text-[0.78vw] text-muted space-y-[0.6vh]">
              <div className="text-text font-semibold">artifacts/</div>
              <div className="pl-[0.8vw]">web/</div>
              <div className="pl-[0.8vw]">api-server/</div>
              <div className="pl-[0.8vw]">ns-lens-pitch/</div>
              <div className="text-text font-semibold mt-[0.8vh]">packages/</div>
              <div className="pl-[0.8vw]">db/</div>
              <div className="pl-[0.8vw]">api-spec/</div>
            </div>
            {/* Chat / agent */}
            <div className="col-span-5 border-r border-line p-[0.8vw] space-y-[0.6vh]">
              <div className="text-[0.75vw] uppercase tracking-[0.3em] text-muted">Agent</div>
              <div className="rounded-md bg-[#0f0e1a] px-[0.7vw] py-[0.6vh] text-[0.8vw] text-text">build a personal CRM with telegram + RAG</div>
              <div className="rounded-md bg-primary/20 border border-primary/40 px-[0.7vw] py-[0.6vh] text-[0.8vw] text-text">scaffolded web + api + db · running…</div>
              <div className="rounded-md bg-accent/15 border border-accent/40 px-[0.7vw] py-[0.6vh] text-[0.8vw] text-text">added pgvector, telegram bot, follow-ups</div>
            </div>
            {/* Preview */}
            <div className="col-span-4 p-[0.8vw]">
              <div className="text-[0.75vw] uppercase tracking-[0.3em] text-muted mb-[0.6vh]">Live preview</div>
              <div className="rounded-md h-[18vh] bg-gradient-to-br from-primary/30 via-fuchsia-500/20 to-accent/30 border border-line grid place-items-center">
                <div className="font-serif italic text-[1.4vw] bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">NS Lens</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: powered-by stack */}
        <div className="col-span-4 rounded-[1vw] border border-line bg-ink p-[1.2vw]">
          <div className="text-[0.8vw] uppercase tracking-[0.3em] text-muted">Powered by Replit</div>
          <div className="mt-[1vh] grid grid-cols-2 gap-[0.6vw]">
            <div className="rounded-md border border-line bg-bg px-[0.7vw] py-[0.7vh] text-[0.85vw]">Agent</div>
            <div className="rounded-md border border-line bg-bg px-[0.7vw] py-[0.7vh] text-[0.85vw]">Workflows</div>
            <div className="rounded-md border border-line bg-bg px-[0.7vw] py-[0.7vh] text-[0.85vw]">Postgres</div>
            <div className="rounded-md border border-line bg-bg px-[0.7vw] py-[0.7vh] text-[0.85vw]">Object Storage</div>
            <div className="rounded-md border border-line bg-bg px-[0.7vw] py-[0.7vh] text-[0.85vw]">Secrets</div>
            <div className="rounded-md border border-line bg-bg px-[0.7vw] py-[0.7vh] text-[0.85vw]">Canvas</div>
            <div className="rounded-md border border-line bg-bg px-[0.7vw] py-[0.7vh] text-[0.85vw]">Slides</div>
            <div className="rounded-md border border-line bg-bg px-[0.7vw] py-[0.7vh] text-[0.85vw]">Deploy</div>
          </div>
          <div className="mt-[1.4vh] flex items-center justify-between border-t border-line pt-[1vh]">
            <div className="text-[0.8vw] text-muted">Time to first deploy</div>
            <div className="font-display font-bold text-[1.4vw] text-accent">~1 day</div>
          </div>
        </div>
      </div>
    </div>
  );
}
