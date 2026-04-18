import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListContacts,
  useCreateContact,
  useIngestText,
  useIngestImage,
  getListContactsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Search, Plus, Wand2, Image as ImageIcon, User } from "lucide-react";

export default function Contacts() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const { data } = useListContacts({ q: q || undefined });
  const contacts = data ?? [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <Button onClick={() => setOpen((v) => !v)}>
          <Plus className="w-4 h-4 mr-2" /> Add
        </Button>
      </div>

      {open && <AddPanel onClose={() => setOpen(false)} />}

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, project, company, tag..."
          className="pl-9"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground col-span-full">No contacts yet.</p>
        ) : contacts.map((c) => (
          <Link key={c.id} href={`/app/contacts/${c.id}`}>
            <Card className="cursor-pointer hover:border-primary transition-colors h-full">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="font-semibold">{c.name}</div>
                </div>
                {c.project && <div className="text-sm"><span className="text-muted-foreground">Project:</span> {c.project}</div>}
                {c.company && <div className="text-sm"><span className="text-muted-foreground">Company:</span> {c.company}</div>}
                {c.context && <div className="text-xs text-muted-foreground line-clamp-2">{c.context}</div>}
                {c.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {c.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function AddPanel({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [project, setProject] = useState("");
  const [company, setCompany] = useState("");
  const [context, setContext] = useState("");
  const [tags, setTags] = useState("");
  const [email, setEmail] = useState("");
  const [telegramUsername, setTg] = useState("");
  const [xUsername, setX] = useState("");
  const [discordUsername, setDc] = useState("");
  const [text, setText] = useState("");

  const refresh = () => qc.invalidateQueries({ queryKey: getListContactsQueryKey() });
  const create = useCreateContact({
    mutation: {
      onSuccess: () => {
        toast.success("Contact added — we'll match Hub posts from this person.");
        setName(""); setProject(""); setCompany(""); setContext(""); setTags("");
        setEmail(""); setTg(""); setX(""); setDc("");
        refresh();
      },
    },
  });
  const ingestText = useIngestText({
    mutation: {
      onSuccess: (res) => {
        
        toast.success(`Created ${res.created.length}, updated ${res.updated.length}`);
        setText("");
        refresh();
      },
      onError: () => toast.error("Extraction failed"),
    },
  });
  const ingestImage = useIngestImage({
    mutation: {
      onSuccess: (res) => {
        
        toast.success(`Created ${res.created.length}, updated ${res.updated.length}`);
        refresh();
      },
      onError: () => toast.error("Image extraction failed"),
    },
  });

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      ingestImage.mutate({ data: { image: String(reader.result) } });
    };
    reader.readAsDataURL(file);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Add contacts</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="manual">
          <TabsList>
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="text"><Wand2 className="w-4 h-4 mr-1" />From text</TabsTrigger>
            <TabsTrigger value="image"><ImageIcon className="w-4 h-4 mr-1" />From image</TabsTrigger>
          </TabsList>
          <TabsContent value="manual" className="space-y-3 pt-3">
            <Input placeholder="Name *" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Project" value={project} onChange={(e) => setProject(e.target.value)} />
              <Input placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <Textarea placeholder="Context (where you met, what they're up to)" value={context} onChange={(e) => setContext(e.target.value)} />
            <div className="space-y-2 border rounded-md p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground">
                Add their handles so we can match them when they post on NS Lens — even before
                you connect as friends.
              </p>
              <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Telegram @" value={telegramUsername} onChange={(e) => setTg(e.target.value)} />
                <Input placeholder="X / Twitter @" value={xUsername} onChange={(e) => setX(e.target.value)} />
                <Input placeholder="Discord" value={discordUsername} onChange={(e) => setDc(e.target.value)} />
              </div>
            </div>
            <Input placeholder="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} />
            <Button
              disabled={!name.trim() || create.isPending}
              onClick={() =>
                create.mutate({
                  data: {
                    name: name.trim(),
                    project: project || null,
                    company: company || null,
                    context: context || null,
                    email: email.trim() || null,
                    telegramUsername: telegramUsername.replace(/^@+/, "").trim() || null,
                    xUsername: xUsername.replace(/^@+/, "").trim() || null,
                    discordUsername: discordUsername.replace(/^@+/, "").trim() || null,
                    tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
                  },
                })
              }
            >
              Add contact
            </Button>
          </TabsContent>
          <TabsContent value="text" className="space-y-3 pt-3">
            <Textarea
              rows={6}
              placeholder="Paste notes, transcript, or list of names. The agent will extract people, projects, and context."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <Button
              disabled={!text.trim() || ingestText.isPending}
              onClick={() => ingestText.mutate({ data: { text } })}
            >
              {ingestText.isPending ? "Extracting..." : "Extract & save"}
            </Button>
          </TabsContent>
          <TabsContent value="image" className="space-y-3 pt-3">
            <p className="text-sm text-muted-foreground">Upload a screenshot of a chat, business card, or list.</p>
            <Input type="file" accept="image/*" onChange={handleImage} disabled={ingestImage.isPending} />
            {ingestImage.isPending && <p className="text-sm">Extracting...</p>}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
