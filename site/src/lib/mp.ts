// «Мамин простір» у браузері: запити до /api/mp (той самий домен, cookie сесії HttpOnly) і демо-режим без збереження.
// Демо (ТЗ F-12): ті самі екрани на вигаданих даних у пам'яті вкладки — нічого не йде на сервер.
"use client";

export type Bi = { uk: string; en: string };
export type Mood = { key: string; icon: string } & Bi;
export type Exercise = {
  slug: string; icon: string; minutes: number; kind: "choice" | "fields"; max?: number;
  to_step?: boolean; to_card?: boolean;
  uk: { title: string; short: string; question: string; hint: string; result: string };
  en: { title: string; short: string; question: string; hint: string; result: string };
  choices?: Bi[]; fields?: Bi[];
};
export type Config = {
  real_data: boolean; registration_open: boolean; ai_available: boolean; sla_days: number;
  crisis_lines: ({ number: string } & Bi)[]; operator: string; privacy_email: string;
  moods: Mood[]; exercises: Exercise[]; categories: ({ key: string } & Bi)[];
  referral_categories: ({ key: string } & Bi)[]; referral_statuses: ({ key: string } & Bi)[];
  ai_intents: ({ key: string } & Bi)[];
};
export type Me = { name: string; email: string; lang: string; created_at: string; needs_privacy: boolean; ai_consent: boolean };
export type Checkin = { day: string; mood: string; note?: string };
export type Step = { id: string; title: string; due_day?: string | null; status: "planned" | "done" | "cancelled"; created_at: string };
export type Card = { kind: string; items: string[] };
export type Referral = { id: string; number: number; category: string; channel: string; status: string; created_at: string; reply_note?: string };
export type Resource = { id: string; category: string; title: Bi; text: Bi; source?: string; author?: string; reviewer?: string;
  reviewed_at?: string; link?: string };
export type AiAnswer = { answer: string; sources: { id: string; title: string }[]; warning: string; safe: boolean };

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function real<X>(method: string, path: string, body?: unknown): Promise<X> {
  const r = await fetch(`/api/mp${path}`, {
    method, credentials: "same-origin", cache: "no-store",
    headers: { Accept: "application/json", ...(method !== "GET" ? { "Content-Type": "application/json", "X-MP": "1" } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const isJson = (r.headers.get("content-type") || "").includes("json");
  const data = isJson ? await r.json().catch(() => ({})) : null;
  if (!r.ok) {
    const d = data && typeof data.detail === "string" ? data.detail : r.status === 429 ? "Забагато запитів. Зачекайте трохи" : "Сервіс тимчасово недоступний. Спробуйте ще раз";
    throw new ApiError(r.status, d);
  }
  return data as X;
}

// ───────────── демо ─────────────
const demo = {
  on: false,
  me: { name: "Олена", email: "demo@example.com", lang: "uk", created_at: new Date().toISOString(), needs_privacy: false, ai_consent: true } as Me,
  checkins: [] as Checkin[], steps: [] as Step[], cards: [] as Card[], referrals: [] as Referral[], done: {} as Record<string, number>,
};
export const isDemo = () => demo.on;
export function startDemo() {
  demo.on = true;
  const d = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
  demo.checkins = [{ day: d(1), mood: "tired", note: "Довгий день у лікарні" }, { day: d(2), mood: "calm" }, { day: d(4), mood: "resource" }];
  demo.steps = [{ id: "s1", title: "Записати питання до логопеда", due_day: d(-2), status: "planned", created_at: d(1) },
    { id: "s2", title: "Попросити сестру забрати дитину в четвер", status: "done", created_at: d(3) }];
  demo.cards = []; demo.referrals = []; demo.done = { one_action: 1 };
}

async function fake<X>(method: string, path: string, body?: any): Promise<X> {
  const today = new Date().toISOString().slice(0, 10);
  await new Promise((r) => setTimeout(r, 120));
  if (path === "/me" && method === "PATCH") { demo.me = { ...demo.me, ...body }; return demo.me as X; }
  if (path === "/me") return demo.me as X;
  if (path === "/checkins" && method === "GET") return [...demo.checkins].sort((a, b) => (a.day < b.day ? 1 : -1)) as X;
  if (path === "/checkins") { const day = body.day || today; demo.checkins = [{ day, mood: body.mood, note: body.note }, ...demo.checkins.filter((c) => c.day !== day)]; return { ok: true } as X; }
  if (path === "/steps" && method === "GET") return demo.steps as X;
  if (path === "/steps") { const s: Step = { id: String(Date.now()), title: body.title, due_day: body.due_day || null, status: "planned", created_at: today }; demo.steps.unshift(s); return s as X; }
  if (path.startsWith("/steps/")) {
    const id = path.split("/")[2];
    if (method === "DELETE") demo.steps = demo.steps.filter((s) => s.id !== id);
    else demo.steps = demo.steps.map((s) => (s.id === id ? { ...s, ...body } : s));
    return { ok: true } as X;
  }
  if (path === "/cards" && method === "GET") return demo.cards as X;
  if (path.startsWith("/cards/")) { const kind = path.split("/")[2]; demo.cards = [...demo.cards.filter((c) => c.kind !== kind), ...(method === "DELETE" ? [] : [{ kind, items: body.items }])]; return { ok: true } as X; }
  if (path === "/exercises/done") return demo.done as X;
  if (path === "/exercise-sessions") { demo.done[body.slug] = (demo.done[body.slug] || 0) + 1; return { ok: true } as X; }
  if (path === "/referrals" && method === "GET") return demo.referrals as X;
  if (path === "/referrals") { demo.referrals.unshift({ id: String(Date.now()), number: demo.referrals.length + 1, category: body.category, channel: body.channel, status: "new", created_at: new Date().toISOString() }); return { ok: true, sla_days: 5 } as X; }
  if (path === "/consents") { if (body.ai !== undefined) demo.me = { ...demo.me, ai_consent: !!body.ai }; return demo.me as X; }
  if (path === "/ai/suggest") return { answer: "Це демонстрація: у демо модель не викликається. У справжньому кабінеті навігатор підбирає 1–3 перевірені матеріали за обраною темою.", sources: [], warning: "Демо — не відповідь моделі.", safe: true } as X;
  if (path === "/ai/feedback" || path === "/logout") return { ok: true } as X;
  if (path === "/me/delete") { startDemo(); return { ok: true } as X; }
  throw new ApiError(404, "Немає в демо");
}

export const api = <X>(method: string, path: string, body?: unknown): Promise<X> =>
  demo.on && !["/config", "/resources", "/impact"].includes(path) ? fake<X>(method, path, body) : real<X>(method, path, body);

export const endDemo = () => { demo.on = false; };
