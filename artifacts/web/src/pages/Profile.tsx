import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UserCircle, UserPlus, Trash2, Search, AtSign, Send, Hash } from "lucide-react";
import { toast } from "sonner";

type Me = {
  id: string;
  email: string | null;
  name: string | null;
  fullName: string | null;
  username: string | null;
  telegramUsername: string | null;
  xUsername: string | null;
  discordUsername: string | null;
};

type Friend = {
  id: number;
  friendUserId: string;
  contactId: number | null;
  username: string | null;
  fullName: string | null;
  name: string | null;
  email: string | null;
  telegramUsername: string | null;
  xUsername: string | null;
  discordUsername: string | null;
  createdAt: string;
};

type SearchResult = {
  id: string;
  username: string | null;
  fullName: string | null;
  name: string | null;
  telegramUsername: string | null;
  xUsername: string | null;
  discordUsername: string | null;
};

function HandleRow({ icon: Icon, label, value }: { icon: any; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Icon className="w-3.5 h-3.5" />
      <span className="font-medium">{label}:</span>
      <span>@{value}</span>
    </div>
  );
}

function ProfileForm({ me }: { me: Me }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    fullName: me.fullName ?? me.name ?? "",
    username: me.username ?? "",
    telegramUsername: me.telegramUsername ?? "",
    xUsername: me.xUsername ?? "",
    discordUsername: me.discordUsername ?? "",
  });

  useEffect(() => {
    setForm({
      fullName: me.fullName ?? me.name ?? "",
      username: me.username ?? "",
      telegramUsername: me.telegramUsername ?? "",
      xUsername: me.xUsername ?? "",
      discordUsername: me.discordUsername ?? "",
    });
  }, [me.id, me.username, me.fullName, me.telegramUsername, me.xUsername, me.discordUsername, me.name]);

  const save = useMutation({
    mutationFn: async () =>
      customFetch<Me>("/api/me", {
        method: "PATCH",
        body: JSON.stringify(form),
        responseType: "json",
      }),
    onSuccess: (next) => {
      qc.setQueryData(["me"], next);
      toast.success("Profile saved");
    },
    onError: (err: any) => {
      toast.error(err?.data?.error ?? "Could not save profile");
    },
  });

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Your profile</h2>
        <p className="text-xs text-muted-foreground">
          People can find and add you with these handles. Your usernames help us match you against
          contacts other people have already saved.
        </p>
      </CardHeader>
      <CardContent className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label>Full name</Label>
          <Input
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            placeholder="Ada Lovelace"
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Username</Label>
          <Input
            value={form.username}
            onChange={(e) =>
              setForm((f) => ({ ...f, username: e.target.value.replace(/^@+/, "") }))
            }
            placeholder="ada"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Friends use this to add you. Letters, numbers, _ . - only.
          </p>
        </div>
        <div>
          <Label>Telegram</Label>
          <Input
            value={form.telegramUsername}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                telegramUsername: e.target.value.replace(/^@+/, ""),
              }))
            }
            placeholder="ada_lovelace"
          />
        </div>
        <div>
          <Label>X / Twitter</Label>
          <Input
            value={form.xUsername}
            onChange={(e) =>
              setForm((f) => ({ ...f, xUsername: e.target.value.replace(/^@+/, "") }))
            }
            placeholder="ada"
          />
        </div>
        <div>
          <Label>Discord</Label>
          <Input
            value={form.discordUsername}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                discordUsername: e.target.value.replace(/^@+/, ""),
              }))
            }
            placeholder="ada#0001"
          />
        </div>
        <div className="sm:col-span-2 flex justify-end">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FriendsSection() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const friends = useQuery({
    queryKey: ["friends"],
    queryFn: () => customFetch<Friend[]>("/api/friends", { responseType: "json" }),
  });

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    let aborted = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await customFetch<SearchResult[]>(
          `/api/users/search?q=${encodeURIComponent(term)}`,
          { responseType: "json" },
        );
        if (!aborted) setResults(r);
      } catch {
        if (!aborted) setResults([]);
      } finally {
        if (!aborted) setSearching(false);
      }
    }, 200);
    return () => {
      aborted = true;
      clearTimeout(t);
    };
  }, [q]);

  const add = useMutation({
    mutationFn: (username: string) =>
      customFetch<Friend>("/api/friends", {
        method: "POST",
        body: JSON.stringify({ username }),
        responseType: "json",
      }),
    onSuccess: () => {
      toast.success("Friend added — they're in your CRM now.");
      setQ("");
      setResults([]);
      qc.invalidateQueries({ queryKey: ["friends"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: any) => toast.error(err?.data?.error ?? "Could not add friend"),
  });

  const remove = useMutation({
    mutationFn: (id: number) =>
      customFetch<{ ok: true }>(`/api/friends/${id}`, {
        method: "DELETE",
        responseType: "json",
      }),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["friends"] });
    },
  });

  const friendIds = new Set((friends.data ?? []).map((f) => f.friendUserId));

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Friends</h2>
        <p className="text-xs text-muted-foreground">
          Adding a friend confirms they're in your network and creates a contact in your CRM.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Find someone</Label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by username, full name, or social handle"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {searching ? <p className="text-xs text-muted-foreground">Searching…</p> : null}
          {!searching && q.trim().length >= 2 && results.length === 0 ? (
            <p className="text-xs text-muted-foreground">No matches.</p>
          ) : null}
          {results.length > 0 ? (
            <div className="border rounded-md divide-y">
              {results.map((u) => {
                const already = friendIds.has(u.id);
                return (
                  <div key={u.id} className="flex items-center justify-between p-3 gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {u.fullName ?? u.name ?? u.username ?? "Anonymous"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        @{u.username ?? "—"}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={already ? "outline" : "default"}
                      disabled={already || !u.username || add.isPending}
                      onClick={() => u.username && add.mutate(u.username)}
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      {already ? "Added" : "Add"}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
            Your friends
            <Badge variant="secondary">{friends.data?.length ?? 0}</Badge>
          </div>
          {friends.isLoading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : (friends.data ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">
              You haven't added any friends yet. Search above to find people on Network Brain.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {friends.data!.map((f) => (
                <div key={f.id} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {f.fullName ?? f.name ?? f.username ?? "Anonymous"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        @{f.username ?? "—"}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove.mutate(f.id)}
                      title="Remove friend"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <HandleRow icon={Send} label="Telegram" value={f.telegramUsername} />
                    <HandleRow icon={AtSign} label="X" value={f.xUsername} />
                    <HandleRow icon={Hash} label="Discord" value={f.discordUsername} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Profile() {
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => customFetch<Me>("/api/me", { responseType: "json" }),
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserCircle className="w-6 h-6" /> Profile & friends
        </h1>
        <p className="text-sm text-muted-foreground">
          Fill in your handles so other founders can find you, then add the people in your network.
        </p>
      </div>
      {me.data ? <ProfileForm me={me.data} /> : <p className="text-sm text-muted-foreground">Loading profile…</p>}
      <FriendsSection />
    </div>
  );
}
