import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListPosts, useCreatePost, getListPostsQueryKey, customFetch } from "@workspace/api-client-react";
import type { PostAttachment, Post } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Megaphone, Send, Image as ImageIcon, Film, Link as LinkIcon, X, Paperclip } from "lucide-react";
import { toast } from "sonner";

type DraftAttachment = PostAttachment & { previewUrl?: string };

const objectUrl = (objectPath: string) => `/api/storage${objectPath}`;

async function uploadFile(file: File): Promise<{ objectPath: string }> {
  // customFetch attaches the Clerk bearer token registered in App.tsx.
  const { uploadURL, objectPath } = await customFetch<{ uploadURL: string; objectPath: string }>(
    "/api/storage/uploads/request-url",
    {
      method: "POST",
      body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      responseType: "json",
    },
  );
  // The presigned upload URL is for a public object-store endpoint; no auth header.
  const put = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!put.ok) throw new Error("upload failed");
  return { objectPath };
}

function AttachmentChip({ a, onRemove }: { a: DraftAttachment; onRemove: () => void }) {
  return (
    <div className="relative inline-flex items-center gap-2 rounded-md border bg-muted/40 p-2 pr-8 text-xs max-w-full">
      {a.type === "image" && (a.previewUrl || a.objectPath) ? (
        <img
          src={a.previewUrl ?? objectUrl(a.objectPath!)}
          className="h-12 w-12 object-cover rounded"
          alt=""
        />
      ) : a.type === "video" ? (
        <Film className="w-5 h-5" />
      ) : a.type === "link" ? (
        <LinkIcon className="w-5 h-5" />
      ) : (
        <Paperclip className="w-5 h-5" />
      )}
      <span className="truncate max-w-[14rem]">
        {a.type === "link" ? a.url : a.objectPath?.split("/").pop()}
      </span>
      <button
        onClick={onRemove}
        className="absolute right-1 top-1 rounded-full p-0.5 hover:bg-muted"
        aria-label="Remove attachment"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

function PostAttachmentView({ a }: { a: PostAttachment }) {
  if (a.type === "image" && a.objectPath) {
    return (
      <img
        src={objectUrl(a.objectPath)}
        alt={a.aiDescription ?? a.caption ?? ""}
        className="rounded-lg max-h-96 object-cover w-full bg-muted"
      />
    );
  }
  if (a.type === "video" && a.objectPath) {
    return (
      <video
        controls
        src={objectUrl(a.objectPath)}
        className="rounded-lg max-h-96 w-full bg-black"
      />
    );
  }
  if (a.type === "link" && a.url) {
    return (
      <a
        href={a.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-lg border p-3 hover:bg-muted/40"
      >
        {a.ogImage ? (
          <img src={a.ogImage} className="rounded mb-2 max-h-48 w-full object-cover" alt="" />
        ) : null}
        <div className="font-medium text-sm">{a.ogTitle ?? a.url}</div>
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

export default function Hub() {
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [attachments, setAttachments] = useState<DraftAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data } = useListPosts({ query: { refetchInterval: 15_000 } as never });
  const posts = (data ?? []) as Post[];

  const create = useCreatePost({
    mutation: {
      onSuccess: () => {
        toast.success("Posted!");
        setContent("");
        setLinkInput("");
        setAttachments([]);
        qc.invalidateQueries({ queryKey: getListPostsQueryKey() });
      },
      onError: () => toast.error("Could not post"),
    },
  });

  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setIsUploading(true);
    try {
      for (const f of files) {
        const previewUrl = f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined;
        const type: PostAttachment["type"] = f.type.startsWith("image/")
          ? "image"
          : f.type.startsWith("video/")
            ? "video"
            : "file";
        const { objectPath } = await uploadFile(f);
        setAttachments((prev) => [...prev, { type, objectPath, mimeType: f.type, previewUrl }]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  function addLink() {
    const url = linkInput.trim();
    if (!url || !/^https?:\/\//i.test(url)) {
      toast.error("Enter a full URL starting with http(s)://");
      return;
    }
    setAttachments((prev) => [...prev, { type: "link", url }]);
    setLinkInput("");
  }

  const canPost =
    !create.isPending && !isUploading && (content.trim().length > 0 || attachments.length > 0);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="w-6 h-6" /> Founders Hub
        </h1>
        <p className="text-sm text-muted-foreground">
          Share text, photos, video, files, and links. The system reads your post (including
          images and link previews) and notifies other founders when it matches someone in their
          network.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Textarea
            rows={3}
            placeholder="What are you building? What do you need?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              hidden
              multiple
              accept="image/*,video/*,application/pdf"
              onChange={onPickFiles}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <ImageIcon className="w-4 h-4 mr-1" /> Photo / video / file
            </Button>
            <div className="flex items-center gap-1 flex-1 min-w-[200px]">
              <Input
                placeholder="Paste a link…"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addLink();
                  }
                }}
              />
              <Button type="button" size="sm" variant="outline" onClick={addLink}>
                <LinkIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((a, i) => (
                <AttachmentChip
                  key={i}
                  a={a}
                  onRemove={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {isUploading ? "Uploading…" : ""}
            </span>
            <Button
              onClick={() =>
                create.mutate({
                  data: {
                    content,
                    attachments: attachments.map(({ previewUrl: _p, ...rest }) => rest),
                  },
                })
              }
              disabled={!canPost}
            >
              <Send className="w-4 h-4 mr-2" /> Post
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No posts yet. Be the first.</p>
        ) : (
          posts.map((p) => (
            <Card key={p.id} id={`post-${p.id}`} className="scroll-mt-20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{p.authorName}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(p.createdAt).toLocaleString()}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 text-sm space-y-2">
                {p.content ? <div className="whitespace-pre-wrap">{p.content}</div> : null}
                {p.attachments?.length ? (
                  <div className="space-y-2">
                    {p.attachments.map((a, i) => (
                      <PostAttachmentView key={i} a={a} />
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
