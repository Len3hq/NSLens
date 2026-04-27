import { useState, useRef } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useListPosts, useCreatePost, getListPostsQueryKey, customFetch } from "@workspace/api-client-react";
import type { PostAttachment, Post, RequestUploadUrlResponse } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Megaphone, Send, Link as LinkIcon, X, Paperclip, Plus, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { relativeTime, fullDateTime } from "@/lib/relativeTime";

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


function AttachmentChip({ a, onRemove }: { a: DraftAttachment; onRemove: () => void }) {
  return (
    <div className="relative inline-flex items-center gap-2 rounded-md border bg-muted/40 p-2 pr-8 text-xs max-w-full">
      {a.type === "image" && (a.previewUrl || a.objectPath) ? (
        <img
          src={a.previewUrl ?? objectUrl(a.objectPath!)}
          className="h-12 w-12 object-cover rounded"
          alt=""
        />
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

  const images = attachments.filter((a) => a.type === "image");
  const links = attachments.filter((a) => a.type === "link");

  // Show up to 3 image thumbnails in a row, then link previews below.
  return (
    <div className="space-y-2 mt-1">
      {images.length > 0 && (
        <div className="flex gap-2">
          {images.slice(0, 3).map((a, i) => {
            const src = a.url ?? (a.objectPath ? objectUrl(a.objectPath) : null);
            const isLast = i === 2 && images.length > 3;
            return (
              <div
                key={i}
                className="relative h-24 w-24 rounded-lg overflow-hidden bg-muted shrink-0 border border-border"
              >
                {src && <img src={src} className="h-full w-full object-cover" alt="" />}
                {isLast && (
                  <div className="absolute inset-0 bg-black/60 grid place-items-center text-white text-sm font-semibold">
                    +{images.length - 3}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {links.slice(0, 1).map((a, i) => (
        <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2 overflow-hidden">
          {a.ogImage && (
            <img src={a.ogImage} className="h-10 w-10 rounded object-cover shrink-0" alt="" />
          )}
          {!a.ogImage && <LinkIcon className="w-4 h-4 shrink-0 text-muted-foreground" />}
          <div className="min-w-0">
            <div className="text-xs font-medium truncate">{a.ogTitle ?? a.url}</div>
            {a.ogDescription && (
              <div className="text-xs text-muted-foreground truncate">{a.ogDescription}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Hub() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [attachments, setAttachments] = useState<DraftAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
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
        setOpen(false);
        qc.invalidateQueries({ queryKey: getListPostsQueryKey() });
      },
      onError: () => toast.error("Could not post"),
    },
  });

  function addLink() {
    const url = linkInput.trim();
    if (!url || !/^https?:\/\//i.test(url)) {
      toast.error("Enter a full URL starting with http(s)://");
      return;
    }
    setAttachments((prev) => [...prev, { type: "link", url }]);
    setLinkInput("");
  }

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const { uploadURL, objectPath } = await customFetch<RequestUploadUrlResponse>(
        "/api/storage/uploads/request-url",
        {
          method: "POST",
          body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
        },
      );
      await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      const previewUrl = URL.createObjectURL(file);
      setAttachments((prev) => [...prev, { type: "image", objectPath, mimeType: file.type, previewUrl }]);
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const pendingLinkUrl = linkInput.trim();
  const pendingLinkValid = /^https?:\/\//i.test(pendingLinkUrl);

  const canPost =
    !create.isPending &&
    !uploading &&
    (content.trim().length > 0 || attachments.length > 0 || pendingLinkValid);

  function handlePost() {
    const finalAttachments: DraftAttachment[] = pendingLinkValid
      ? [...attachments, { type: "link", url: pendingLinkUrl }]
      : attachments;
    create.mutate({
      data: {
        content,
        attachments: finalAttachments.map(({ previewUrl: _p, ...rest }) => rest),
      },
    });
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="w-6 h-6" /> Founders Hub
          </h1>
          <p className="text-sm text-muted-foreground">
            Share text, photos, video, files, and links. We read your post and notify other
            founders when it matches someone in their network.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full shrink-0 hidden sm:inline-flex">
              <Plus className="w-4 h-4 mr-1.5" /> New post
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Megaphone className="w-5 h-5" /> Share with the Hub
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Textarea
                rows={5}
                placeholder="What are you building? What do you need?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                autoFocus
              />

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 flex-1 min-w-[180px]">
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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadImage(file);
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImageIcon className="w-4 h-4" />
                  )}
                </Button>
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
            </div>
            <DialogFooter className="sm:justify-between sm:items-center gap-2">
              <span className="text-xs text-muted-foreground order-last sm:order-first">
                Posts are public to your network.
              </span>
              <Button onClick={handlePost} disabled={!canPost}>
                <Send className="w-4 h-4 mr-2" /> Post
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lightweight composer-trigger card on mobile, also acts as an empty-feed CTA */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-left rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-card/80 transition-colors p-3 flex items-center gap-3"
      >
        <div className="w-9 h-9 rounded-full bg-secondary grid place-items-center text-muted-foreground shrink-0">
          <Plus className="w-4 h-4" />
        </div>
        <span className="text-sm text-muted-foreground flex-1 truncate">
          What are you building? What do you need?
        </span>
        <span className="hidden sm:inline-flex text-xs text-primary font-medium">Post</span>
      </button>

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
                        <div className="text-[11px] text-muted-foreground" title={fullDateTime(p.createdAt)}>
                          {relativeTime(p.createdAt)}
                        </div>
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
