import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Megaphone, Image as ImageIcon, Film, Link as LinkIcon, Paperclip } from "lucide-react";

type Attachment = {
  type: "image" | "video" | "link" | "file";
  objectPath?: string;
  url?: string;
  mimeType?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  aiDescription?: string;
};

type PublicPost = {
  id: number;
  authorName: string;
  content: string | null;
  attachments: Attachment[];
  createdAt: string;
};

const objectUrl = (objectPath: string) => `/api/storage${objectPath}`;

function AttachmentView({ a }: { a: Attachment }) {
  if (a.type === "image" && a.objectPath) {
    return (
      <img
        src={objectUrl(a.objectPath)}
        alt={a.aiDescription ?? ""}
        className="rounded-md max-h-[480px] w-full object-contain bg-muted"
      />
    );
  }
  if (a.type === "video" && a.objectPath) {
    return (
      <video
        src={objectUrl(a.objectPath)}
        controls
        className="rounded-md max-h-[480px] w-full bg-black"
      />
    );
  }
  if (a.type === "link" && a.url) {
    return (
      <a
        href={a.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-md border p-3 hover:bg-muted/40"
      >
        {a.ogImage ? (
          <img
            src={a.ogImage}
            alt=""
            className="rounded mb-2 max-h-48 object-cover w-full"
          />
        ) : null}
        <div className="text-sm font-medium flex items-center gap-2">
          <LinkIcon className="w-4 h-4" />
          {a.ogTitle ?? a.url}
        </div>
        {a.ogDescription ? (
          <div className="text-xs text-muted-foreground mt-1">{a.ogDescription}</div>
        ) : null}
        <div className="text-xs text-muted-foreground mt-1 truncate">{a.url}</div>
      </a>
    );
  }
  return (
    <a
      href={a.objectPath ? objectUrl(a.objectPath) : "#"}
      className="inline-flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs"
    >
      <Paperclip className="w-4 h-4" /> Download attachment
    </a>
  );
}

export default function PublicPost() {
  const [, params] = useRoute("/hub/p/:id");
  const id = params?.id;
  const [post, setPost] = useState<PublicPost | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let aborted = false;
    setError(null);
    setPost(null);
    fetch(`/api/hub/public/${encodeURIComponent(id)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "Post not found" : "Could not load post");
        return r.json();
      })
      .then((p) => {
        if (!aborted) setPost(p);
      })
      .catch((e) => {
        if (!aborted) setError(e.message ?? "Could not load post");
      });
    return () => {
      aborted = true;
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-2">
          <Megaphone className="w-5 h-5" />
          <span className="font-semibold">Founders Hub</span>
          <span className="text-xs text-muted-foreground ml-auto">NS Lens</span>
        </div>
      </header>
      <main className="max-w-2xl mx-auto p-6">
        {error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : !post ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">{post.authorName}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(post.createdAt).toLocaleString()}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 text-sm space-y-3">
              {post.content ? <div className="whitespace-pre-wrap">{post.content}</div> : null}
              {post.attachments?.length ? (
                <div className="space-y-2">
                  {post.attachments.map((a, i) => (
                    <AttachmentView key={i} a={a} />
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}
        <p className="text-xs text-muted-foreground mt-6">
          You're viewing a shared post.{" "}
          <a href="/app" className="underline">
            Open NS Lens
          </a>{" "}
          to reply or post your own.
        </p>
      </main>
    </div>
  );
}
