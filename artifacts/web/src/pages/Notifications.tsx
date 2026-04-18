import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListNotifications,
  useMarkNotificationRead,
  getListNotificationsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check } from "lucide-react";

export default function Notifications() {
  const qc = useQueryClient();
  const { data } = useListNotifications();
  const notifs = data ?? [];
  const markRead = useMarkNotificationRead({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() }),
    },
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Bell className="w-6 h-6" /> Notifications
      </h1>
      <div className="space-y-2">
        {notifs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notifications.</p>
        ) : notifs.map((n) => (
          <Card key={n.id} className={n.readAt ? "opacity-60" : ""}>
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{n.type}</Badge>
                  <div className="font-medium">{n.title}</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="text-sm whitespace-pre-wrap">{n.body}</div>
              <div className="flex items-center gap-2 pt-1">
                {n.contactId && (
                  <Link href={`/app/contacts/${n.contactId}`}>
                    <Button variant="link" size="sm" className="px-0">View contact</Button>
                  </Link>
                )}
                {!n.readAt && (
                  <Button size="sm" variant="ghost" onClick={() => markRead.mutate({ id: n.id })}>
                    <Check className="w-4 h-4 mr-1" /> Mark read
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
