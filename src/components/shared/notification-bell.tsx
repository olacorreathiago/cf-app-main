"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { markAllReadAction, markReadAction, upsertPrefAction, fetchNotificationsAction } from "@/lib/notifications/actions";
import type { Notification, NotificationPreference } from "@/lib/notifications/queries";
import type { NotificationType } from "@/lib/notifications/send";

const TYPE_LABELS: Record<NotificationType, string> = {
  class_cancelled: "Aulas canceladas",
  waitlist_promoted: "Lista de espera",
  new_post: "Publicações da box",
  athlete_removed: "Removido de uma aula",
  class_starting: "Aulas a começar",
  new_drop_in: "Novos drop-ins",
};

const HAS_EMAIL: Record<NotificationType, boolean> = {
  class_cancelled: true,
  waitlist_promoted: true,
  new_post: false,
  athlete_removed: true,
  class_starting: false,
  new_drop_in: false,
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora mesmo";
  if (mins < 60) return `há ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `há ${days}d`;
}

function BellIcon({ unread }: { unread: number }) {
  return (
    <span className="relative flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors duration-150 hover:bg-bg-subtle hover:text-text-primary">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M8 2a5 5 0 015 5v2.5l1 1.5H2l1-1.5V7a5 5 0 015-5zM6.5 13a1.5 1.5 0 003 0"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinejoin="round"
        />
      </svg>
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-0.5 text-[10px] font-bold text-accent-fg ring-2 ring-bg-base">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </span>
  );
}

function GearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 10a2 2 0 100-4 2 2 0 000 4z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M13.3 8c0-.3 0-.6-.1-.9l1.4-1.1-1.4-2.4-1.7.7c-.5-.4-1-.7-1.6-.9L9.6 2h-3l-.3 1.4c-.6.2-1.1.5-1.6.9l-1.7-.7L1.4 6l1.4 1.1c0 .3-.1.6-.1.9s0 .6.1.9L1.4 10l1.4 2.4 1.7-.7c.5.4 1 .7 1.6.9L6.4 14h3l.3-1.4c.6-.2 1.1-.5 1.6-.9l1.7.7 1.4-2.4-1.4-1.1c.1-.3.1-.6.1-.9z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? "bg-accent" : "bg-border"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

interface Props {
  boxId: string;
  slug?: string;
  initialUnread: number;
  initialNotifications: Notification[];
  initialPrefs: NotificationPreference[];
}

export function NotificationBell({
  boxId,
  slug,
  initialUnread,
  initialNotifications,
  initialPrefs,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"notifications" | "preferences">("notifications");
  const [notifications, setNotifications] = useState(initialNotifications);
  const [prefs, setPrefs] = useState(initialPrefs);
  const [unread, setUnread] = useState(initialUnread);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setView("notifications");
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function handleOpen() {
    setOpen((o) => {
      if (o) { setView("notifications"); return false; }
      return true;
    });
    // Fetch fresh data every time the dropdown opens
    const result = await fetchNotificationsAction(boxId);
    setNotifications(result.notifications);
    setUnread(result.unread);
  }

  function handleMarkAll() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
    setUnread(0);
    startTransition(() => markAllReadAction(boxId));
  }

  function handleMarkOne(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    setUnread((prev) => Math.max(0, prev - 1));
    startTransition(() => markReadAction(id));
  }

  function handleNotificationClick(n: Notification) {
    if (!n.read_at) handleMarkOne(n.id);
    setOpen(false);
    setView("notifications");
    const postId = n.data?.post_id;
    const classId = n.data?.class_id;
    if (n.type === "class_starting" && classId && slug) {
      router.push(`/box/${slug}/today?open=${classId}`);
    } else if (postId) {
      router.push(`/athlete/feed/${postId}`);
    } else if (classId) {
      router.push("/athlete/classes");
    }
  }

  function handlePrefToggle(type: NotificationType, channel: "in_app" | "email", value: boolean) {
    setPrefs((prev) =>
      prev.map((p) => (p.type === type ? { ...p, [channel]: value } : p))
    );
    startTransition(() => upsertPrefAction(boxId, type, channel, value));
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        title="Notificações"
        aria-label="Notificações"
        className="focus:outline-none"
      >
        <BellIcon unread={unread} />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-border bg-bg-base shadow-lg">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-sm font-semibold text-text-primary">
              {view === "notifications" ? "Notificações" : "Preferências"}
            </span>
            <div className="flex items-center gap-2">
              {view === "notifications" && unread > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="text-xs text-text-tertiary hover:text-text-primary"
                >
                  Marcar todas como lidas
                </button>
              )}
              <button
                onClick={() => setView(view === "notifications" ? "preferences" : "notifications")}
                className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                  view === "preferences"
                    ? "text-accent"
                    : "text-text-tertiary hover:text-text-primary"
                }`}
                title={view === "notifications" ? "Preferências" : "Notificações"}
              >
                {view === "notifications" ? <GearIcon /> : (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 8h10M3 4h10M3 12h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Notifications view */}
          {view === "notifications" && (
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-text-tertiary">
                  Sem notificações
                </p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-bg-subtle ${
                      !n.read_at ? "bg-accent/5" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-sm leading-snug ${!n.read_at ? "font-semibold text-text-primary" : "font-medium text-text-secondary"}`}>
                        {n.title}
                      </span>
                      {!n.read_at && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                      )}
                    </div>
                    {n.body && (
                      <span className="text-xs text-text-tertiary line-clamp-2">{n.body}</span>
                    )}
                    <span className="text-[11px] text-text-tertiary">{relativeTime(n.created_at)}</span>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Preferences view */}
          {view === "preferences" && (
            <div className="divide-y divide-border">
              {prefs.map((p) => (
                <div key={p.type} className="px-4 py-3">
                  <p className="mb-2 text-xs font-semibold text-text-primary">
                    {TYPE_LABELS[p.type as NotificationType]}
                  </p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary">Notificação in-app</span>
                      <Toggle
                        checked={p.in_app}
                        onChange={(v) => handlePrefToggle(p.type as NotificationType, "in_app", v)}
                      />
                    </div>
                    {HAS_EMAIL[p.type as NotificationType] && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-secondary">Email</span>
                        <Toggle
                          checked={p.email}
                          onChange={(v) => handlePrefToggle(p.type as NotificationType, "email", v)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
