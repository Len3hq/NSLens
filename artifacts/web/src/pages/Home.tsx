import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { LensMark } from "@/components/Brand";
import { Users, Sparkles, Megaphone, ArrowRight, CalendarClock, MessageCircle } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-30 glass border-b border-border/60">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            aria-label="NS Lens — go to home"
            className="flex items-center gap-2.5 rounded-md hover:opacity-80 transition-opacity"
          >
            <LensMark className="w-7 h-7" />
            <span className="font-semibold tracking-tight text-[15px]">NS Lens</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href={`${basePath}#features`} className="hover:text-foreground transition-colors">Features</a>
            <a href={`${basePath}#how`} className="hover:text-foreground transition-colors">How it works</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" className="rounded-full px-4">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex-1 flex items-center justify-center px-6 pt-16 pb-24 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute right-0 bottom-0 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-3xl" />
        </div>
        <div className="max-w-3xl text-center space-y-7">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/80 bg-card/60 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            New · AI follow-ups, calendar sync & priority signals
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.02]">
            See your <span className="font-display gradient-text">whole network</span><br />in focus.
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            NS Lens captures every person you meet, remembers what they're working on,
            and quietly nudges you when it's time to reach back out.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link href="/sign-up">
              <Button size="lg" className="rounded-full px-6 ring-glow">
                Build your lens <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
            <a href={`${basePath}#features`}>
              <Button size="lg" variant="outline" className="rounded-full px-6">How it works</Button>
            </a>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section id="features" className="px-6 pb-20">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group relative rounded-2xl border border-border bg-card/60 p-6 space-y-3 hover:border-primary/40 hover:bg-card transition-all"
            >
              <div className="w-10 h-10 rounded-xl grid place-items-center bg-primary/10 text-primary">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-[15px]">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="px-6 pb-24">
        <div className="max-w-4xl mx-auto text-center space-y-3 mb-10">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            One <span className="font-display gradient-text">lens</span> for everyone you know.
          </h2>
          <p className="text-muted-foreground">Drop in a screenshot, a transcript, or a name. We do the rest.</p>
        </div>
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-border bg-card/40 p-6 space-y-2">
              <div className="text-xs font-mono text-primary">0{i + 1}</div>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 px-6 py-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <LensMark className="w-4 h-4" />
            <span>© {new Date().getFullYear()} NS Lens</span>
          </div>
          <span>Your network, in focus.</span>
        </div>
      </footer>
    </div>
  );
}

const FEATURES = [
  { icon: Users, title: "Capture anyone", body: "Drop in notes, screenshots or transcripts — the agent extracts contacts and the context behind them." },
  { icon: MessageCircle, title: "Ask your network", body: "Conversational memory: 'Who do I know working on developer tools?' — grounded answers with sources." },
  { icon: CalendarClock, title: "Never drop the ball", body: "Schedule follow-ups, subscribe to your calendar, get nudged on Telegram when it's time to reach out." },
  { icon: Sparkles, title: "AI signals", body: "Auto-suggested tags, a 'who matters' priority score, and proactive reminders for stale relationships." },
  { icon: Megaphone, title: "Founders Hub", body: "Post a question or update — we route it to the people in your circle whose interests actually match." },
  { icon: ArrowRight, title: "Anywhere, instant", body: "Web, Telegram bot, calendar feed. One lens, everywhere you already are." },
];

const STEPS = [
  { title: "Drop it in", body: "Forward a chat, snap a business card, or just type a name. NS Lens parses it into a contact." },
  { title: "Stay in focus", body: "Star the people who matter. We rank by recency, frequency and your signals." },
  { title: "Get nudged", body: "Follow-ups land in your calendar and Telegram so nothing falls through." },
];
