import { useState } from "react";
import {
  useGetTelegramStatus,
  useCreateTelegramLinkCode,
  useUnlinkTelegram,
  getGetTelegramStatusQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, Copy, Check, Unlink } from "lucide-react";
import { toast } from "sonner";

export default function TelegramCard() {
  const qc = useQueryClient();
  const { data, isLoading } = useGetTelegramStatus();
  const [copied, setCopied] = useState(false);

  const link = useCreateTelegramLinkCode({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetTelegramStatusQueryKey() });
      },
    },
  });
  const unlink = useUnlinkTelegram({
    mutation: {
      onSuccess: () => {
        toast.success("Disconnected from Telegram.");
        qc.invalidateQueries({ queryKey: getGetTelegramStatusQueryKey() });
      },
    },
  });

  const code = link.data?.linkCode ?? data?.linkCode ?? null;
  const deepLink =
    link.data?.deepLink ??
    (data?.botUsername && code ? `https://t.me/${data.botUsername}?start=${code}` : null);
  const botUsername = data?.botUsername ?? link.data?.botUsername ?? null;

  async function copyCommand() {
    if (!code) return;
    const cmd = `/start ${code}`;
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Long-press to copy manually.");
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="w-4 h-4 shrink-0" /> Telegram
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Loading…</CardContent>
      </Card>
    );
  }

  if (!data?.botConfigured) return null;

  if (data.linked) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="w-4 h-4 shrink-0" /> Telegram
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Connected. You'll receive contact reminders and Founders Hub alerts in your chat with{" "}
            {botUsername ? (
              <a
                className="underline text-foreground"
                href={`https://t.me/${botUsername}`}
                target="_blank"
                rel="noreferrer"
              >
                @{botUsername}
              </a>
            ) : (
              "the bot"
            )}
            . Reply anytime to save notes, ask questions, or post to the Hub.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => unlink.mutate()}
            disabled={unlink.isPending}
          >
            <Unlink className="w-4 h-4 mr-2" />
            {unlink.isPending ? "Disconnecting…" : "Disconnect"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Send className="w-4 h-4 shrink-0" /> Connect Telegram
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {!code ? (
          <>
            <p className="text-muted-foreground">
              Receive contact reminders and Founders Hub alerts in Telegram. Chat with the bot to
              save notes, ask questions about your network, or post to the Hub.
            </p>
            <Button
              className="w-full sm:w-auto"
              onClick={() => link.mutate()}
              disabled={link.isPending}
            >
              <Send className="w-4 h-4 mr-2" />
              {link.isPending ? "Generating…" : "Connect Telegram"}
            </Button>
          </>
        ) : (
          <>
            <ol className="list-decimal pl-4 space-y-2 text-muted-foreground">
              <li>
                Open{" "}
                {botUsername ? (
                  <a
                    className="underline text-foreground"
                    href={deepLink ?? `https://t.me/${botUsername}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    @{botUsername} on Telegram
                  </a>
                ) : (
                  "the bot on Telegram"
                )}
                .
              </li>
              <li>
                Send this command to link your account:
                <div className="mt-1.5 flex items-center gap-2">
                  <code className="flex-1 min-w-0 truncate px-2 py-1 rounded bg-muted font-mono text-sm">/start {code}</code>
                  <Button size="sm" variant="ghost" className="shrink-0" onClick={copyCommand}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </li>
            </ol>
            <p className="text-xs text-muted-foreground">
              Code expires in 30 minutes. This card will update automatically once you're linked.
            </p>
            <div className="flex flex-wrap gap-2">
              {deepLink && (
                <a href={deepLink} target="_blank" rel="noreferrer">
                  <Button size="sm">Open Telegram</Button>
                </a>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => link.mutate()}
                disabled={link.isPending}
              >
                New code
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
