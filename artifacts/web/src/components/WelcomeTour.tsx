import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Users,
  MessageCircle,
  Sparkles,
  Megaphone,
  CalendarClock,
  Network,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

const STORAGE_KEY = "ns_tour_seen";

const STEPS = [
  {
    icon: Network,
    color: "text-primary",
    bg: "bg-primary/10",
    title: "Welcome to NS Lens",
    body: "Your personal network brain for Network School members. Capture everyone you meet, query your network with AI, and stay connected automatically.",
  },
  {
    icon: Users,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    title: "Capture contacts 3 ways",
    body: "Paste meeting notes or a transcript — AI extracts the person and their details. Upload a screenshot or business card. Or fill in the form manually. All three live on the People page.",
  },
  {
    icon: MessageCircle,
    color: "text-green-500",
    bg: "bg-green-500/10",
    title: "Ask your network anything",
    body: 'Open Memory and type natural questions: "Who do I know building in AI?" or "Tell me about Alice." It searches across all your contacts and every interaction you\'ve logged.',
  },
  {
    icon: Sparkles,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    title: "One inbox for everything",
    body: 'The Agent understands plain English. "Just met Bob from Acme, he builds dev tools" adds a contact. "Remind me to follow up with Sarah next Tuesday" sets a follow-up. No forms needed.',
  },
  {
    icon: Megaphone,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    title: "Share with the network",
    body: "The Founders Hub is a shared feed between NS members. Post what you're building or what you need. AI reads every post and notifies founders when it matches someone in their network.",
  },
  {
    icon: CalendarClock,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    title: "Never lose touch",
    body: "Set follow-ups on any contact and subscribe to your iCal feed so they show up in Google Calendar. NS Lens also alerts you automatically when you haven't been in touch for a while.",
  },
];

export function WelcomeTour() {
  const [open, setOpen] = useState(
    () => localStorage.getItem(STORAGE_KEY) !== "1",
  );
  const [step, setStep] = useState(0);

  function close() {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  }

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else close();
  }

  function back() {
    setStep((s) => s - 1);
  }

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
        {/* Header illustration area */}
        <div className={`flex items-center justify-center py-10 ${current.bg}`}>
          <div className={`w-20 h-20 rounded-2xl ${current.bg} border border-border/30 flex items-center justify-center shadow-sm`}>
            <Icon className={`w-10 h-10 ${current.color}`} />
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pt-5 pb-6 space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">{current.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{current.body}</p>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 py-1">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`rounded-full transition-all ${
                  i === step
                    ? "w-5 h-2 bg-primary"
                    : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={close} className="text-muted-foreground">
              Skip
            </Button>
            <div className="flex gap-2">
              {step > 0 && (
                <Button variant="outline" size="sm" onClick={back}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              )}
              <Button size="sm" onClick={next}>
                {isLast ? "Get started" : (
                  <>Next <ArrowRight className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TourTrigger() {
  return (
    <button
      onClick={() => {
        localStorage.removeItem(STORAGE_KEY);
        window.location.reload();
      }}
      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
    >
      Show tour
    </button>
  );
}
