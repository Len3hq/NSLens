import { useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetContact,
  useAddInteraction,
  useDeleteContact,
  useUpdateContact,
  getGetContactQueryKey,
  getListContactsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trash2, Save } from "lucide-react";
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
        <CardHeader>
          <CardTitle className="text-2xl">{c.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <EditForm
            initial={c}
            onSave={(v) => update.mutate({ id, data: v })}
            saving={update.isPending}
          />
        </CardContent>
      </Card>

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
