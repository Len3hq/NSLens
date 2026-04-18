import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListPosts, useCreatePost, getListPostsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Megaphone, Send } from "lucide-react";
import { toast } from "sonner";

export default function Hub() {
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const { data } = useListPosts();
  const posts = data ?? [];
  const create = useCreatePost({
    mutation: {
      onSuccess: () => {
        toast.success("Posted!");
        setContent("");
        qc.invalidateQueries({ queryKey: getListPostsQueryKey() });
      },
    },
  });

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="w-6 h-6" /> Founders Hub
        </h1>
        <p className="text-sm text-muted-foreground">
          Public posts. The system notifies other founders when your post matches someone in their network.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2">
          <Textarea
            rows={3}
            placeholder="What are you looking for? What are you building?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex justify-end">
            <Button onClick={() => create.mutate({ data: { content } })} disabled={!content.trim() || create.isPending}>
              <Send className="w-4 h-4 mr-2" /> Post
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No posts yet. Be the first.</p>
        ) : posts.map((p) => (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">{p.authorName}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(p.createdAt).toLocaleString()}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 text-sm whitespace-pre-wrap">{p.content}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
