"use client";
// Спільне для екранів «Мамин простір»: мова, налаштування з сервера, обліковий запис, сповіщення, адреси розділів.
import { createContext, useContext } from "react";
import { localize, tr, type Lang, type T } from "@/lib/i18n";
import type { Bi, Config, Me } from "@/lib/mp";

export const SECTIONS = ["dashboard", "journal", "exercises", "ai", "specialist", "steps", "resources", "profile"] as const;
export const PUBLIC = ["start", "resources", "impact", "privacy"] as const;
export type Section = (typeof SECTIONS)[number] | "start" | "impact" | "privacy";

export type Ctx = {
  lang: Lang; t: T; cfg: Config; me: Me | null; demo: boolean;
  setMe: (m: Me | null) => void; notify: (msg: string) => void; href: (s: string) => string; go: (s: string) => void;
  pick: (b?: Partial<Bi> | null) => string;
};

export const MpCtx = createContext<Ctx | null>(null);
export const useMp = () => {
  const c = useContext(MpCtx);
  if (!c) throw new Error("MpCtx");
  return c;
};

export const makeHelpers = (lang: Lang) => ({
  t: tr(lang),
  href: (s: string) => localize(`/mamyn-prostir${s ? `/${s}` : ""}`, lang),
  pick: (b?: Partial<Bi> | null) => (b ? (lang === "en" ? b.en || b.uk : b.uk) || "" : ""),
});

export const fmtDay = (iso: string | null | undefined, lang: Lang) => {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? iso + "T12:00:00" : iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(lang === "en" ? "en-GB" : "uk-UA", { day: "numeric", month: "long", timeZone: "Europe/Kyiv" });
};

export const kyivToday = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Kyiv" }).format(new Date());
