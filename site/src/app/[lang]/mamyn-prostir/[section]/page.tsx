// Розділи «Мамин простір»: /mamyn-prostir/<розділ>. Особисті — без індексації; відкриті (ресурси, показники, умови) —
// для пошуку. Сам кабінет — клієнтський застосунок (дані мами не рендеряться на сервері сайту).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import MpApp from "@/components/mp/MpApp";
import type { Section } from "@/components/mp/ctx";
import { isLang, tr, type Lang } from "@/lib/i18n";
import { absoluteUrl } from "@/lib/site";

const TITLES: Record<Section, [string, string]> = {
  start: ["Вхід і реєстрація", "Sign in"], dashboard: ["Мій простір", "My space"], journal: ["Щоденник стану", "Mood diary"],
  exercises: ["Практичні вправи", "Exercises"], ai: ["Підказки ШІ", "AI tips"], specialist: ["Підтримка фахівця", "Specialist support"],
  steps: ["Мої кроки", "My steps"], resources: ["Ресурси для мами", "Resources for mums"], profile: ["Мій профіль", "My profile"],
  impact: ["Відкриті показники", "Open figures"], privacy: ["Умови й приватність", "Terms & privacy"],
};
const INDEXED = new Set(["resources", "impact", "privacy"]);

type P = { params: Promise<{ lang: string; section: string }> };

async function read(params: P["params"]) {
  const { lang: raw, section } = await params;
  const lang: Lang = isLang(raw) ? raw : "uk";
  return { lang, section: section as Section, ok: section in TITLES };
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { lang, section, ok } = await read(params);
  if (!ok) return {};
  const t = tr(lang);
  return {
    title: `${t(...TITLES[section])} · ${t("Мамин простір", "Mamyn prostir")}`,
    robots: INDEXED.has(section) ? undefined : { index: false, follow: false },
    alternates: INDEXED.has(section) ? { canonical: absoluteUrl(`/mamyn-prostir/${section}`, lang) } : undefined,
  };
}

export default async function MpSection({ params }: P) {
  const { lang, section, ok } = await read(params);
  if (!ok) notFound();
  return (
    <Suspense fallback={<div className="mp-main" aria-busy="true" />}>
      <MpApp lang={lang} section={section} />
    </Suspense>
  );
}
