import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Unlink } from "lucide-react";
import { FaDiscord } from "react-icons/fa";
import { toast } from "sonner";

type DiscordBotStatus = {
  linked: boolean;
  botConfigured: boolean;
  botClientId: string | null;
};

const QUERY_KEY = ["discord-bot-status"];

export default function DiscordBotCard() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => customFetch<DiscordBotStatus>("/api/me/discord-bot", { responseType: "json" }),
  });

  const disconnect = useMutation({
    mutationFn: () =>
      customFetch<{ ok: true }>("/api/me/discord-bot/disconnect", { method: "POST", responseType: "json" }),
    onSuccess: () => {
      toast.success("Disconnected from Discord bot.");
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  if (isLoading || !data?.botConfigured) return null;

  const deepLink = data.botClientId ? `https://discord.com/users/${data.botClientId}` : null;

  if (data.linked) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FaDiscord className="w-4 h-4 shrink-0" /> Discord
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Connected. You'll receive contact reminders and Founders Hub alerts in your Discord DMs.
            Reply to the bot anytime to save notes, ask questions, or post to the Hub.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => disconnect.mutate()}
            disabled={disconnect.isPending}
          >
            <Unlink className="w-4 h-4 mr-2" />
            {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FaDiscord className="w-4 h-4 shrink-0" /> Connect Discord
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Receive contact reminders and Founders Hub alerts in Discord. Chat with the bot to save
          notes, ask questions about your network, or post to the Hub.
        </p>
        <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
          <li>Open the NS Lens bot on Discord using the button below.</li>
          <li>Send it any message — that's all it takes to activate.</li>
        </ol>
        {deepLink ? (
          <a href={deepLink} target="_blank" rel="noreferrer" className="block">
            <Button className="w-full sm:w-auto">
              <FaDiscord className="w-4 h-4 mr-2" />
              Open NS Lens Bot
            </Button>
          </a>
        ) : (
          <p className="text-xs text-muted-foreground">Bot link unavailable — contact support.</p>
        )}
      </CardContent>
    </Card>
  );
}
