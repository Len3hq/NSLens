import { useState } from "react";
import { Link } from "wouter";
import { useChatMemory } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageCircle } from "lucide-react";

type Msg = {
  role: "user" | "assistant";
  text: string;
  sources?: { kind: string; contactId: number; contactName: string; snippet: string }[];
};

export default function Chat() {
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const chat = useChatMemory({
    mutation: {
      onSuccess: (res) => {
        setMsgs((m) => [...m, { role: "assistant", text: res.answer, sources: res.sources }]);
      },
      onError: () => {
        setMsgs((m) => [...m, { role: "assistant", text: "Something went wrong." }]);
      },
    },
  });

  function send() {
    const text = input.trim();
    if (!text) return;
    setMsgs((m) => [...m, { role: "user", text }]);
    chat.mutate({ data: { message: text } });
    setInput("");
  }

  return (
    <div className="p-6 max-w-3xl mx-auto h-[calc(100vh-1rem)] flex flex-col">
      <div className="mb-3">
        <h1 className="text-2xl font-bold flex items-center gap-2"><MessageCircle className="w-6 h-6" />Memory Chat</h1>
        <p className="text-sm text-muted-foreground">Ask anything about people in your network.</p>
      </div>
      <div className="flex-1 overflow-auto space-y-3 pr-2">
        {msgs.length === 0 && (
          <div className="text-sm text-muted-foreground border rounded p-4">
            Try: <em>"Who do I know working on developer tools?"</em> or <em>"Tell me about Alice."</em>
          </div>
        )}
        {msgs.map((m, idx) => (
          <Card key={idx} className={m.role === "user" ? "ml-12 bg-primary/5" : "mr-12"}>
            <CardContent className="p-4 space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">{m.role}</div>
              <div className="text-sm whitespace-pre-wrap">{m.text}</div>
              {m.sources && m.sources.length > 0 && (
                <div className="pt-2 border-t mt-2 space-y-1">
                  <div className="text-xs text-muted-foreground">Sources</div>
                  {m.sources.map((s, i) => (
                    <Link key={i} href={`/app/contacts/${s.contactId}`}>
                      <div className="text-xs hover:underline cursor-pointer">
                        <span className="font-medium">{s.contactName}</span>
                        <span className="text-muted-foreground"> — {s.snippet}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {chat.isPending && <div className="text-sm text-muted-foreground">Thinking...</div>}
      </div>
      <div className="mt-3 flex gap-2">
        <Input
          placeholder="Ask your network..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !chat.isPending && send()}
        />
        <Button onClick={send} disabled={chat.isPending || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
