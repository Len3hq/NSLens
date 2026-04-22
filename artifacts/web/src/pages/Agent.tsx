import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAgentMessage } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send } from "lucide-react";

type AgentTurn = { role: "user"; text: string } | { role: "assistant"; text: string; intent?: string };

export default function AgentPage() {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<AgentTurn[]>([]);
  const qc = useQueryClient();
  const agent = useAgentMessage({
    mutation: {
      onSuccess: (res) => {
        setTurns((t) => [...t, { role: "assistant", text: res.reply, intent: res.intent }]);
        qc.invalidateQueries();
      },
      onError: () =>
        setTurns((t) => [...t, { role: "assistant", text: "Something went wrong." }]),
    },
  });

  function send() {
    const text = input.trim();
    if (!text) return;
    localStorage.setItem("ns_agent_tried", "1");
    setTurns((t) => [...t, { role: "user", text }]);
    agent.mutate({ data: { message: text } });
    setInput("");
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6" /> Agent
        </h1>
        <p className="text-sm text-muted-foreground">
          One inbox to capture people, ask questions, or post to the hub. The agent figures out what you mean.
        </p>
      </div>

      <div className="space-y-3">
        {turns.length === 0 && (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground space-y-1">
              <div>Try messages like:</div>
              <ul className="list-disc list-inside">
                <li>"Just met Alice from Acme — she's building a dev-tools startup."</li>
                <li>"Who do I know in fintech?"</li>
                <li>"Post to hub: looking for a designer for a marketing site."</li>
              </ul>
            </CardContent>
          </Card>
        )}
        {turns.map((t, idx) => (
          <Card key={idx} className={t.role === "user" ? "ml-12 bg-primary/5" : "mr-12"}>
            <CardContent className="p-4 space-y-2">
              <div className="text-xs text-muted-foreground uppercase flex items-center gap-2">
                {t.role}
                {t.role === "assistant" && (t as any).intent && (
                  <Badge variant="outline">{(t as any).intent}</Badge>
                )}
              </div>
              <div className="text-sm whitespace-pre-wrap">{t.text}</div>
            </CardContent>
          </Card>
        ))}
        {agent.isPending && <div className="text-sm text-muted-foreground">Thinking...</div>}
      </div>

      <div className="flex gap-2">
        <Textarea
          rows={3}
          placeholder="Tell the agent..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !agent.isPending) send();
          }}
        />
        <Button onClick={send} disabled={agent.isPending || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
