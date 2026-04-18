import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Brain, Users, Sparkles, Megaphone } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      <header className="px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-7 h-7 text-primary" />
          <span className="font-semibold text-lg">Network Brain</span>
        </div>
        <div className="flex gap-2">
          <Link href="/sign-in">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link href="/sign-up">
            <Button>Get started</Button>
          </Link>
        </div>
      </header>
      <section className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-3xl text-center space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Your second brain for{" "}
            <span className="bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
              every person you meet
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Network Brain captures who you've met, what they're working on, and when to reach back
            out — then proactively connects you to founders building things you care about.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/sign-up">
              <Button size="lg">Build your brain</Button>
            </Link>
            <a href={`${basePath}#features`}>
              <Button size="lg" variant="outline">How it works</Button>
            </a>
          </div>
        </div>
      </section>
      <section id="features" className="px-6 py-16 grid md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full">
        {[
          { icon: Users, title: "Capture anyone", body: "Drop in notes, screenshots, or transcripts. The agent extracts contacts and context." },
          { icon: Sparkles, title: "Ask your network", body: "Conversational memory: 'Who do I know working on developer tools?'" },
          { icon: Megaphone, title: "Founders Hub", body: "Post a question — we route it to founders whose networks match." },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border bg-card p-6 space-y-3">
            <f.icon className="w-6 h-6 text-primary" />
            <h3 className="font-semibold">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
