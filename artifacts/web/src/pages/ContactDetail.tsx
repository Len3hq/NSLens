import { useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import {
  useGetContact,
  useAddInteraction,
  useDeleteContact,
  useUpdateContact,
  getGetContactQueryKey,
  getListContactsQueryKey,
  customFetch,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trash2, Save, Star, CalendarPlus, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";

export default function ContactDetail() {
  const [, params] = useRoute("/app/contacts/:id");
  const [, setLocation] = useLocation();
  const id = Number(params?.id);
  const qc = useQueryClient();
  const { data: c, isLoading } = useGetContact(id, { query: { enabled: !!id } as any });

  const [note, setNote] = useState("");
  const addInteraction = useAddInteraction({
    mutation: {
      onSuccess: () => {
        setNote("");
        toast.success("Interaction added");
        qc.invalidateQueries({ queryKey: getGetContactQueryKey(id) });
        qc.invalidateQueries({ queryKey: getListContactsQueryKey() });
      },
    },
  });
  const update = useUpdateContact({
    mutation: {
      onSuccess: () => {
        toast.success("Saved");
        qc.invalidateQueries({ queryKey: getGetContactQueryKey(id) });
        qc.invalidateQueries({ queryKey: getListContactsQueryKey() });
      },
    },
  });
  const del = useDeleteContact({
    mutation: {
      onSuccess: () => {
        toast.success("Deleted");
        qc.invalidateQueries({ queryKey: getListContactsQueryKey() });
        setLocation("/app/contacts");
      },
    },
  });

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (!c) return <div className="p-6">Not found.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <Link href="/app/contacts" className="text-sm text-muted-foreground inline-flex items-center hover:text-foreground">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <CardTitle className="text-2xl flex items-center gap-2">
            {c.starred && <Star className="w-5 h-5 fill-amber-400 text-amber-400" />}
            {c.name}
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <StarButton id={id} starred={!!c.starred} />
            <SuggestTagsButton id={id} currentTags={c.tags ?? []} />
          </div>
        </CardHeader>
        <CardContent>
          <EditForm
            initial={c}
            onSave={(v) => update.mutate({ id, data: v })}
            saving={update.isPending}
          />
        </CardContent>
      </Card>

      <FollowUpsCard contactId={id} contactName={c.name} />

      <Card>
        <CardHeader><CardTitle>Add note</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Textarea rows={3} placeholder="What happened?" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button
            disabled={!note.trim() || addInteraction.isPending}
            onClick={() => addInteraction.mutate({ id, data: { content: note, source: "note" } })}
          >
            Save note
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>History</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {c.interactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No interactions logged yet.</p>
          ) : c.interactions.map((i) => (
            <div key={i.id} className="border-l-2 border-primary/50 pl-3 py-1">
              <div className="text-xs text-muted-foreground">
                {new Date(i.occurredAt).toLocaleString()} • {i.source}
              </div>
              <div className="text-sm whitespace-pre-wrap">{i.content}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="pt-4">
        <Button
          variant="destructive"
          onClick={() => {
            if (confirm(`Delete ${c.name}?`)) del.mutate({ id });
          }}
        >
          <Trash2 className="w-4 h-4 mr-2" /> Delete contact
        </Button>
      </div>
    </div>
  );
}

function EditForm({
  initial,
  onSave,
  saving,
}: {
  initial: {
    name: string;
    project?: string | null;
    company?: string | null;
    context?: string | null;
    email?: string | null;
    telegramUsername?: string | null;
    xUsername?: string | null;
    discordUsername?: string | null;
    tags: string[];
  };
  onSave: (v: {
    name: string;
    project: string | null;
    company: string | null;
    context: string | null;
    email: string | null;
    telegramUsername: string | null;
    xUsername: string | null;
    discordUsername: string | null;
    tags: string[];
  }) => void;
  saving: boolean;
}) {
  const [name, setName] = useState(initial.name);
  const [project, setProject] = useState(initial.project ?? "");
  const [company, setCompany] = useState(initial.company ?? "");
  const [context, setContext] = useState(initial.context ?? "");
  const [email, setEmail] = useState(initial.email ?? "");
  const [telegramUsername, setTg] = useState(initial.telegramUsername ?? "");
  const [xUsername, setX] = useState(initial.xUsername ?? "");
  const [discordUsername, setDc] = useState(initial.discordUsername ?? "");
  const [tags, setTags] = useState((initial.tags ?? []).join(", "));
  return (
    <div className="space-y-2">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
      <div className="grid grid-cols-2 gap-2">
        <Input value={project} onChange={(e) => setProject(e.target.value)} placeholder="Project" />
        <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" />
      </div>
      <Textarea value={context} onChange={(e) => setContext(e.target.value)} placeholder="Context" />
      <div className="space-y-2 border rounded-md p-3 bg-muted/30">
        <p className="text-xs text-muted-foreground">
          Their handles — when this person posts on the Hub, we'll surface it as part of your network.
        </p>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <div className="grid grid-cols-3 gap-2">
          <Input value={telegramUsername} onChange={(e) => setTg(e.target.value)} placeholder="Telegram @" />
          <Input value={xUsername} onChange={(e) => setX(e.target.value)} placeholder="X / Twitter @" />
          <Input value={discordUsername} onChange={(e) => setDc(e.target.value)} placeholder="Discord" />
        </div>
      </div>
      <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (comma separated)" />
      <div className="flex gap-2 items-center flex-wrap">
        {tags.split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
          <Badge key={t} variant="secondary">{t}</Badge>
        ))}
      </div>
      <Button
        onClick={() =>
          onSave({
            name,
            project: project || null,
            company: company || null,
            context: context || null,
            email: email.trim() || null,
            telegramUsername: telegramUsername.replace(/^@+/, "").trim() || null,
            xUsername: xUsername.replace(/^@+/, "").trim() || null,
            discordUsername: discordUsername.replace(/^@+/, "").trim() || null,
            tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          })
        }
        disabled={saving}
      >
        <Save className="w-4 h-4 mr-2" /> Save
      </Button>
    </div>
  );
}

function StarButton({ id, starred }: { id: number; starred: boolean }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (next: boolean) =>
      customFetch(`/api/contacts/${id}/star`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starred: next }),
        responseType: "json",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getGetContactQueryKey(id) });
      qc.invalidateQueries({ queryKey: getListContactsQueryKey() });
    },
  });
  return (
    <Button
      size="sm"
      variant={starred ? "default" : "outline"}
      onClick={() => m.mutate(!starred)}
      disabled={m.isPending}
    >
      <Star className={`w-4 h-4 mr-1 ${starred ? "fill-current" : ""}`} />
      {starred ? "Starred" : "Star"}
    </Button>
  );
}

function SuggestTagsButton({ id, currentTags }: { id: number; currentTags: string[] }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () =>
      customFetch<{ tags: string[] }>(`/api/contacts/${id}/suggest-tags`, {
        method: "POST",
        responseType: "json",
      }),
    onSuccess: async (res) => {
      if (!res.tags?.length) {
        toast("No tag suggestions");
        return;
      }
      const merged = Array.from(new Set([...currentTags, ...res.tags]));
      await customFetch(`/api/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: merged }),
        responseType: "json",
      });
      toast.success(`Added: ${res.tags.join(", ")}`);
      qc.invalidateQueries({ queryKey: getGetContactQueryKey(id) });
      qc.invalidateQueries({ queryKey: getListContactsQueryKey() });
    },
  });
  return (
    <Button size="sm" variant="outline" onClick={() => m.mutate()} disabled={m.isPending}>
      <Sparkles className="w-4 h-4 mr-1" />
      {m.isPending ? "Thinking…" : "Suggest tags"}
    </Button>
  );
}

type ContactFollowUp = {
  id: number;
  dueAt: string;
  note: string | null;
  completedAt: string | null;
  source: string;
};

function FollowUpsCard({ contactId, contactName }: { contactId: number; contactName: string }) {
  const qc = useQueryClient();
  const [when, setWhen] = useState(() => {
    const d = new Date(Date.now() + 7 * 86400000);
    d.setHours(9, 0, 0, 0);
    return d.toISOString().slice(0, 16); // for input[type=datetime-local]
  });
  const [note, setNote] = useState("");

  const { data: rows = [] } = useQuery<ContactFollowUp[]>({
    queryKey: ["contact-followups", contactId],
    queryFn: () =>
      customFetch<ContactFollowUp[]>(`/api/contacts/${contactId}/followups`, {
        responseType: "json",
      }),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["contact-followups", contactId] });
    qc.invalidateQueries({ queryKey: ["followups"] });
  };

  const create = useMutation({
    mutationFn: () =>
      customFetch(`/api/followups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          dueAt: new Date(when).toISOString(),
          note: note || null,
        }),
        responseType: "json",
      }),
    onSuccess: () => {
      toast.success(`Follow-up scheduled with ${contactName}`);
      setNote("");
      refresh();
    },
  });
  const complete = useMutation({
    mutationFn: (id: number) =>
      customFetch(`/api/followups/${id}/complete`, { method: "POST", responseType: "json" }),
    onSuccess: () => refresh(),
  });
  const remove = useMutation({
    mutationFn: (id: number) =>
      customFetch(`/api/followups/${id}`, { method: "DELETE", responseType: "auto" }),
    onSuccess: () => refresh(),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarPlus className="w-5 h-5" /> Follow-ups
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-xs text-muted-foreground">When</label>
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          <div className="flex-[2] min-w-[200px] space-y-1">
            <label className="text-xs text-muted-foreground">Note (optional)</label>
            <Input
              placeholder="e.g. send the deck"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            <CalendarPlus className="w-4 h-4 mr-1" /> Schedule
          </Button>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No follow-ups yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between border rounded-md px-3 py-2 text-sm"
              >
                <div className={r.completedAt ? "line-through opacity-60" : ""}>
                  <div className="font-medium">
                    {new Date(r.dueAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                  {r.note && <div className="text-muted-foreground">{r.note}</div>}
                </div>
                <div className="flex gap-1">
                  {!r.completedAt && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => complete.mutate(r.id)}
                      disabled={complete.isPending}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove.mutate(r.id)}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
