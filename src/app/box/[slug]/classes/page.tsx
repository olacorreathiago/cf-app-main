import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { format, startOfWeek, addDays, endOfWeek, addWeeks, subWeeks } from "date-fns";
import { pt } from "date-fns/locale";
import { ClassesClient, type DayData } from "./classes-client";
import type { ClassInstance, ClassTemplate, Wod } from "@/types";
import type { ClassSlot } from "./slot-card";

export const metadata: Metadata = { title: "Aulas" };

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ week?: string }>;
}

export default async function ClassesPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { week } = await searchParams;

  const supabase = await supabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: box } = await supabase
    .from("boxes")
    .select("id, name")
    .eq("slug", slug)
    .single();

  if (!box) redirect("/athlete");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("box_id", box.id)
    .in("role", ["owner", "partner", "manager", "coach"])
    .maybeSingle();

  if (!membership) redirect("/athlete");

  // Week window
  const weekStart = week
    ? new Date(`${week}T00:00:00`)
    : startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  const prevWeek = format(subWeeks(weekStart, 1), "yyyy-MM-dd");
  const nextWeek = format(addWeeks(weekStart, 1), "yyyy-MM-dd");
  const weekLabel = format(weekStart, "'Semana de' d 'de' MMMM", { locale: pt });

  // Fetch active templates + existing instances for the week + coaches + owner in parallel
  const [
    { data: templates },
    { data: instances },
    { data: coachMemberships },
    { data: ownerMembership },
    { data: publishedWods },
  ] = await Promise.all([
    supabase
      .from("class_templates")
      .select("*")
      .eq("box_id", box.id)
      .eq("active", true)
      .order("start_time"),
    supabase
      .from("classes")
      .select("*")
      .eq("box_id", box.id)
      .gte("starts_at", weekStart.toISOString())
      .lte("starts_at", weekEnd.toISOString())
      .order("starts_at"),
    supabase
      .from("memberships")
      .select("profiles(id, full_name, nickname)")
      .eq("box_id", box.id)
      .in("role", ["owner", "partner", "manager", "coach"])
      .eq("status", "active"),
    supabase
      .from("memberships")
      .select("user_id")
      .eq("box_id", box.id)
      .eq("role", "owner")
      .maybeSingle(),
    supabase
      .from("wods")
      .select("id, title, type, category, benchmark_slug, description, scheduled_for, published_at, time_cap_minutes, movements, scaling_notes, created_by, box_id, created_at")
      .eq("box_id", box.id)
      .not("published_at", "is", null)
      .order("scheduled_for", { ascending: false, nullsFirst: false }),
  ]);

  const coaches = (coachMemberships ?? [])
    .flatMap((m) => (Array.isArray(m.profiles) ? m.profiles : [m.profiles]))
    .filter((p): p is { id: string; full_name: string | null; nickname: string | null } =>
      p !== null && typeof p === "object" && "id" in p
    );

  // Owner's profile id — used to pre-select coach in publish/special drawers
  const ownerProfileId = ownerMembership?.user_id ?? null;

  // Fetch booking counts for all instances in the week
  const allInstanceIds = (instances ?? []).map((i) => i.id);
  const countMap: Record<string, number> = {};
  if (allInstanceIds.length > 0) {
    const [{ data: countRows }, { data: trialRows }, { data: dropInRows }] = await Promise.all([
      supabase.rpc("get_class_booking_counts", { p_class_ids: allInstanceIds }),
      supabaseAdmin
        .from("trials")
        .select("class_id")
        .in("class_id", allInstanceIds)
        .not("status", "in", '("lost","converted")'),
      supabaseAdmin
        .from("drop_ins")
        .select("class_id")
        .in("class_id", allInstanceIds)
        .neq("status", "cancelled"),
    ]);
    for (const row of countRows ?? []) {
      countMap[row.class_id] = row.confirmed_count ?? 0;
    }
    for (const row of trialRows ?? []) {
      if (row.class_id) countMap[row.class_id] = (countMap[row.class_id] ?? 0) + 1;
    }
    for (const row of dropInRows ?? []) {
      if (row.class_id) countMap[row.class_id] = (countMap[row.class_id] ?? 0) + 1;
    }
  }

  // Build a map: "templateId|date" → instance
  const instanceMap = new Map<string, ClassInstance>();
  for (const inst of instances ?? []) {
    if (inst.template_id) {
      const date = format(new Date(inst.starts_at), "yyyy-MM-dd");
      instanceMap.set(`${inst.template_id}|${date}`, inst as ClassInstance);
    }
  }

  // Special classes (no template) for the week
  const specialClasses = (instances ?? []).filter((i) => i.is_special) as ClassInstance[];

  // Build day × modality structure
  type ModalityGroup = {
    name: string;
    wodIds: string[];
    slots: ClassSlot[];
    templates: Pick<ClassTemplate, "id" | "name" | "start_time" | "duration_minutes" | "capacity">[];
  };

  const days: Omit<DayData, "dayLabel">[] = [];

  for (let i = 0; i < 7; i++) {
    const dayDate = addDays(weekStart, i);
    const dateStr = format(dayDate, "yyyy-MM-dd");
    const weekday = dayDate.getDay(); // 0=Sun, 1=Mon…

    // Templates active on this weekday
    const dayTemplates = (templates ?? []).filter(
      (t) => t.weekday === weekday
    ) as ClassTemplate[];

    // Group by modality name
    const groupMap = new Map<string, ModalityGroup>();

    for (const tpl of dayTemplates) {
      const startsAt = `${dateStr}T${tpl.start_time}`;
      const instance = instanceMap.get(`${tpl.id}|${dateStr}`) ?? null;

      const slot: ClassSlot = {
        templateId: tpl.id,
        templateData: {
          id: tpl.id,
          name: tpl.name,
          duration_minutes: tpl.duration_minutes,
          capacity: tpl.capacity,
        },
        startsAt,
        startTime: tpl.start_time.slice(0, 5),
        durationMinutes: tpl.duration_minutes,
        defaultCapacity: tpl.capacity,
        instance,
        confirmedCount: instance ? (countMap[instance.id] ?? 0) : 0,
      };

      if (!groupMap.has(tpl.name)) {
        groupMap.set(tpl.name, {
          name: tpl.name,
          wodIds: [],
          slots: [],
          templates: [],
        });
      }

      const group = groupMap.get(tpl.name)!;
      group.slots.push(slot);
      group.templates.push({
        id: tpl.id,
        name: tpl.name,
        start_time: tpl.start_time,
        duration_minutes: tpl.duration_minutes,
        capacity: tpl.capacity,
      });

      // Merge wod_ids from all instances (first non-empty array wins for display)
      if (instance?.wod_ids?.length && !group.wodIds.length) {
        group.wodIds = instance.wod_ids;
      }
    }

    days.push({
      date: dateStr,
      groups: Array.from(groupMap.values()),
      specials: specialClasses
        .filter((s) => format(new Date(s.starts_at), "yyyy-MM-dd") === dateStr)
        .map((cls) => ({ cls, confirmedCount: countMap[cls.id] ?? 0 })),
    });
  }

  const hasAnyTemplates = (templates ?? []).length > 0;

  // Enrich days with pre-formatted labels (avoids importing date-fns in client)
  const clientDays: DayData[] = days.map((day) => ({
    ...day,
    dayLabel: format(new Date(`${day.date}T12:00:00`), "EEEE, d 'de' MMMM", { locale: pt }),
  }));

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-7">
      <ClassesClient
        days={clientDays}
        boxId={box.id}
        slug={slug}
        coaches={coaches}
        ownerProfileId={ownerProfileId}
        publishedWods={(publishedWods ?? []) as Wod[]}
        hasAnyTemplates={hasAnyTemplates}
        weekLabel={weekLabel}
        prevWeek={prevWeek}
        nextWeek={nextWeek}
      />
    </main>
  );
}
