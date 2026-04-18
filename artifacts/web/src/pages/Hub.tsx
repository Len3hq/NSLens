import { useRef, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useListPosts, useCreatePost, getListPostsQueryKey, customFetch } from "@workspace/api-client-react";
import type { PostAttachment, Post } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Megaphone, Send, Image as ImageIcon, Film, Link as LinkIcon, X, Paperclip } from "lucide-react";
import { toast } from "sonner";

type DraftAttachment = PostAttachment & { previewUrl?: string };

const objectUrl = (objectPath: string) => `/api/storage${objectPath}`;
const POST_PREVIEW_CHARS = 220;

function authorHandle(p: { authorUsername?: string | null; authorName?: string | null }) {
  return p.authorUsername ? `@${p.authorUsername}` : (p.authorName || "Anonymous");
}
function authorInitial(p: { authorUsername?: string | null; authorName?: string | null }) {
  const src = p.authorUsername || p.authorName || "?";
  return src.replace(/^@/, "").charAt(0).toUpperCase();
}
function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

async function uploadFile(file: File): Promise<{ objectPath: string }> {
  const { uploadURL, objectPath } = await customFetch<{ uploadURL: string; objectPath: string }>(
    "/api/storage/uploads/request-url",
    {
      method: "POST",
      body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      responseType: "json",
    },
  );
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

// Compact preview thumbnail strip for the feed view (so cards stay short).
function AttachmentPreviewStrip({ attachments }: { attachments: PostAttachment[] }) {
  if (!attachments?.length) return null;
  const first = attachments[0];
  const more = attachments.length - 1;
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-muted shrink-0 border border-border">
        {first.type === "image" && first.objectPath ? (
          <img src={objectUrl(first.objectPath)} className="h-full w-full object-cover" alt="" />
        ) : first.type === "link" && first.ogImage ? (
          <img src={first.ogImage} className="h-full w-full object-cover" alt="" />
        ) : (
          <div className="h-full w-full grid place-items-center text-muted-foreground">
            {first.type === "video" ? (
              <Film className="w-6 h-6" />
            ) : first.type === "link" ? (
              <LinkIcon className="w-6 h-6" />
            ) : (
              <Paperclip className="w-6 h-6" />
            )}
          </div>
        )}
        {more > 0 && (
          <div className="absolute inset-0 bg-black/60 grid place-items-center text-white text-sm font-semibold">
            +{more}
          </div>
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        {first.type === "link" && first.ogTitle ? first.ogTitle : null}
      </div>
    </div>
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
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
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
          posts.map((p) => {
            const text = p.content ?? "";
            const isLong = text.length > POST_PREVIEW_CHARS;
            const preview = isLong ? text.slice(0, POST_PREVIEW_CHARS).trimEnd() + "…" : text;
            const handle = authorHandle(p);
            return (
              <Link key={p.id} href={`/hub/p/${p.id}`}>
                <Card
                  id={`post-${p.id}`}
                  className="scroll-mt-20 cursor-pointer transition-colors hover:border-primary/40 hover:bg-card"
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-cyan-400 text-primary-foreground grid place-items-center text-sm font-semibold shrink-0">
                        {authorInitial(p)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-[14px] truncate">{handle}</div>
                        <div className="text-[11px] text-muted-foreground">{relativeTime(p.createdAt)}</div>
                      </div>
                    </div>

                    {text ? (
                      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {preview}
                        {isLong && (
                          <span className="ml-1 text-primary font-medium">Read more</span>
                        )}
                      </div>
                    ) : null}

                    {p.attachments?.length ? (
                      <AttachmentPreviewStrip attachments={p.attachments} />
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
