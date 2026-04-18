import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, Trash2, CalendarClock } from "lucide-react";

type FollowUp = {
  id: number;
  contactId: number;
  dueAt: string;
  note: string | null;
  source: string;
  completedAt: string | null;
  createdAt: string;
  contactName: string | null;
  contactProject: string | null;
  contactCompany: string | null;
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.round((d.getTime() - now.getTime()) / 86400000);
  const date = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  if (diffDays < 0) return `${date} (${Math.abs(diffDays)}d overdue)`;
  if (diffDays === 0) return `${date} (today)`;
  if (diffDays === 1) return `${date} (tomorrow)`;
  return `${date} (in ${diffDays}d)`;
}

export default function FollowUps() {
  const qc = useQueryClient();
  const [includeDone, setIncludeDone] = useState(false);

  const { data: rows = [] } = useQuery<FollowUp[]>({
    queryKey: ["followups", { includeDone }],
    queryFn: () =>
      customFetch<FollowUp[]>(
        `/api/followups${includeDone ? "?includeDone=1" : ""}`,
        { responseType: "json" },
      ),
  });

  const { data: cal } = useQuery<{ httpUrl: string; webcalUrl: string; instructions: string }>({
    queryKey: ["calendar-feed"],
    queryFn: () => customFetch("/api/me/calendar", { responseType: "json" }),
  });

  const complete = useMutation({
    mutationFn: (id: number) =>
      customFetch(`/api/followups/${id}/complete`, { method: "POST", responseType: "json" }),
    onSuccess: () => {
      toast.success("Marked complete");
      qc.invalidateQueries({ queryKey: ["followups"] });
    },
  });
  const remove = useMutation({
    mutationFn: (id: number) =>
      customFetch(`/api/followups/${id}`, { method: "DELETE", responseType: "auto" }),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["followups"] });
    },
  });

  const open = rows.filter((r) => !r.completedAt);
  const done = rows.filter((r) => !!r.completedAt);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarClock className="w-6 h-6 text-primary" /> Follow-ups
        </h1>
        <Button variant="outline" size="sm" onClick={() => setIncludeDone((v) => !v)}>
          {includeDone ? "Hide completed" : "Show completed"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sync to your calendar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {cal ? (
            <>
              <p className="text-muted-foreground">{cal.instructions}</p>
              <div className="flex flex-wrap gap-2 items-center">
                <code className="text-xs bg-muted px-2 py-1 rounded break-all">{cal.webcalUrl}</code>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(cal.webcalUrl);
                    toast.success("Subscribe URL copied");
                  }}
                >
                  Copy
                </Button>
                <a href={cal.webcalUrl}>
                  <Button size="sm">Open in calendar</Button>
                </a>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">Loading…</p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Open ({open.length})
        </h2>
        {open.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing scheduled. Open a contact and click "Follow up" to schedule one, or just tell the
            agent: "remind me to email Sara next Tuesday".
          </p>
        ) : (
          open.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/app/contacts/${r.contactId}`}>
                      <span className="font-semibold hover:underline cursor-pointer">
                        {r.contactName ?? "Unknown contact"}
                      </span>
                    </Link>
                    {r.source === "agent" && <Badge variant="outline">via agent</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground">{fmtDate(r.dueAt)}</div>
                  {r.note && <div className="text-sm">{r.note}</div>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => complete.mutate(r.id)}
                    disabled={complete.isPending}
                  >
                    <Check className="w-4 h-4 mr-1" /> Done
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove.mutate(r.id)}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {includeDone && done.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Completed ({done.length})
          </h2>
          {done.map((r) => (
            <Card key={r.id} className="opacity-60">
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold line-through">{r.contactName}</div>
                  <div className="text-sm text-muted-foreground">{fmtDate(r.dueAt)}</div>
                  {r.note && <div className="text-sm">{r.note}</div>}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove.mutate(r.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
