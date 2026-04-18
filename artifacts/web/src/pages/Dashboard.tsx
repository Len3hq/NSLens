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
import { Users, MessageSquare, AlarmClock, Bell, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import TelegramCard from "@/components/TelegramCard";

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
