import { useState } from "react";
import { Link } from "wouter";
import {
  useGetDashboard,
  useRunReminders,
  useSeedMockData,
  useClearMockData,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, MessageSquare, AlarmClock, Bell, Plus, Sparkles, Trash2, CheckCircle2, Circle, X, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import TelegramCard from "@/components/TelegramCard";
import { WelcomeTour, TourTrigger } from "@/components/WelcomeTour";

export default function Dashboard() {
  const { data, isLoading } = useGetDashboard();
  const qc = useQueryClient();
  const runReminders = useRunReminders({
    mutation: {
      onSuccess: (res) => {
        toast.success(`Evaluated ${res.evaluated} contacts, flagged ${res.flagged}`);
        qc.invalidateQueries();
      },
    },
  });
  const seed = useSeedMockData({
    mutation: {
      onSuccess: (res) => {
        const s = res.summary;
        toast.success(
          `Seeded ${s.contacts} contacts, ${s.interactions} notes, ${s.posts + s.peerPosts} posts. Flagged ${s.remindersFlagged} stale.`,
        );
        qc.invalidateQueries();
      },
      onError: () => toast.error("Couldn't seed mock data."),
    },
  });
  const clearSeed = useClearMockData({
    mutation: {
      onSuccess: () => {
        toast.success("Wiped all your data.");
        qc.invalidateQueries();
      },
      onError: () => toast.error("Couldn't clear data."),
    },
  });

  const d = data;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <WelcomeTour />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">A snapshot of your network.</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button
            variant="outline"
            onClick={() => seed.mutate()}
            disabled={seed.isPending}
            title="Fill the app with realistic contacts, posts, and notifications"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {seed.isPending ? "Seeding..." : "Seed mock data"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (confirm("Wipe all your contacts, interactions, posts, and notifications?")) {
                clearSeed.mutate();
              }
            }}
            disabled={clearSeed.isPending}
            title="Delete all your data"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {clearSeed.isPending ? "Clearing..." : "Reset"}
          </Button>
          <Button variant="outline" onClick={() => runReminders.mutate()} disabled={runReminders.isPending}>
            <AlarmClock className="w-4 h-4 mr-2" />
            {runReminders.isPending ? "Running..." : "Check reminders"}
          </Button>
          <Link href="/app/contacts">
            <Button><Plus className="w-4 h-4 mr-2" />Add contact</Button>
          </Link>
        </div>
      </div>

      {!isLoading && (
        <OnboardingChecklist
          contactCount={d?.contactCount ?? 0}
          interactionCount={d?.interactionCount ?? 0}
        />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Contacts" value={isLoading ? "..." : d?.contactCount ?? 0} />
        <StatCard icon={MessageSquare} label="Interactions" value={isLoading ? "..." : d?.interactionCount ?? 0} />
        <StatCard icon={AlarmClock} label="Stale contacts" value={isLoading ? "..." : d?.staleCount ?? 0} />
        <StatCard icon={Bell} label="Unread alerts" value={isLoading ? "..." : d?.unreadNotificationCount ?? 0} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Recent contacts</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(d?.recentContacts ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts yet — add some on the Contacts page or use the Agent.</p>
            ) : d?.recentContacts.map((c) => (
              <Link key={c.id} href={`/app/contacts/${c.id}`}>
                <div className="flex items-center justify-between p-2 rounded hover:bg-accent cursor-pointer">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.project ?? c.company ?? "—"}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent interactions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(d?.recentInteractions ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No interactions logged yet.</p>
            ) : d?.recentInteractions.map((i) => (
              <div key={i.id} className="p-2 rounded hover:bg-accent">
                <div className="text-xs text-muted-foreground">
                  {new Date(i.occurredAt).toLocaleString()} • {i.source}
                </div>
                <div className="text-sm line-clamp-2">{i.content}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <TelegramCard />
    </div>
  );
}

function OnboardingChecklist({ contactCount, interactionCount }: { contactCount: number; interactionCount: number }) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem("ns_onboarding_dismissed") === "1",
  );
  const [agentTried] = useState(
    () => localStorage.getItem("ns_agent_tried") === "1",
  );

  const steps = [
    {
      label: "Add your first contact",
      description: "Paste notes, upload a screenshot, or fill in details manually.",
      done: contactCount > 0,
      href: "/app/contacts",
    },
    {
      label: "Log an interaction",
      description: "Open a contact and record a meeting, call, or message.",
      done: interactionCount > 0,
      href: "/app/contacts",
    },
    {
      label: "Try the AI agent",
      description: 'Tell the agent who you met or ask "who do I know in fintech?"',
      done: agentTried,
      href: "/app/agent",
    },
  ];

  const allDone = steps.every((s) => s.done);

  function dismiss() {
    localStorage.setItem("ns_onboarding_dismissed", "1");
    setDismissed(true);
  }

  if (dismissed || allDone) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Get started with NS Lens</CardTitle>
        <Button variant="ghost" size="icon" className="w-7 h-7 -mr-1" onClick={dismiss} title="Dismiss">
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step) => (
          <Link key={step.label} href={step.href}>
            <div className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${step.done ? "opacity-50" : "hover:bg-primary/10"}`}>
              {step.done
                ? <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                : <Circle className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${step.done ? "line-through" : ""}`}>{step.label}</div>
                {!step.done && <div className="text-xs text-muted-foreground mt-0.5">{step.description}</div>}
              </div>
              {!step.done && <ArrowRight className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />}
            </div>
          </Link>
        ))}
        <div className="px-3 pb-1">
          <TourTrigger />
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-md bg-primary/10 text-primary"><Icon className="w-5 h-5" /></div>
        <div>
          <div className="text-2xl font-semibold leading-none">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
