"use client";
// Кабінет «Мамин простір»: завантажує налаштування й обліковий запис, показує меню розділів і потрібний екран.
// Особисті розділи без входу показують вхід/реєстрацію (або демо без збереження).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, CalendarDays, Flower2, HandHeart, House, Sparkles, Target, UserRound } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { ApiError, api, isDemo, type Config, type Me } from "@/lib/mp";
import { MpCtx, PUBLIC, makeHelpers, type Ctx, type Section } from "./ctx";
import { ConsentGate, Start } from "./Auth";
import { Dashboard, Journal } from "./Home";
import { Ai, Exercises, Steps } from "./Tools";
import { Resources, Specialist } from "./Help";
import { Profile } from "./Account";
import { Impact, Privacy } from "./Public";

const NAV: [string, typeof House, string, string][] = [
  ["dashboard", House, "Головна", "Home"],
  ["journal", CalendarDays, "Щоденник стану", "Mood diary"],
  ["exercises", Flower2, "Практичні вправи", "Exercises"],
  ["ai", Sparkles, "Підказки ШІ", "AI tips"],
  ["specialist", HandHeart, "Підтримка фахівця", "Specialist support"],
  ["steps", Target, "Мої кроки", "My steps"],
  ["resources", BookOpen, "Ресурси для мами", "Resources for mums"],
  ["profile", UserRound, "Мій профіль", "My profile"],
];

export default function MpApp({ lang, section }: { lang: Lang; section: Section }) {
  const router = useRouter();
  const helpers = useMemo(() => makeHelpers(lang), [lang]);
  const { t } = helpers;
  const [cfg, setCfg] = useState<Config | null>(null);
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    api<Config>("GET", "/config").then(setCfg).catch((e) => setErr(e.message));
    api<Me>("GET", "/me").then(setMe).catch((e) => setMe(e instanceof ApiError && e.status === 401 ? null : null));
  }, []);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 4500);
  }, []);
  const go = useCallback((s: string) => router.push(helpers.href(s)), [router, helpers]);

  if (err) return <div className="mp-main"><div className="mp-panel"><p className="mp-err">{err}</p></div></div>;
  if (!cfg || me === undefined) return <div className="mp-main" aria-busy="true"><div className="mp-panel"><p className="mp-muted">{t("Завантаження…", "Loading…")}</p></div></div>;

  const demo = isDemo();
  const ctx: Ctx = { lang, cfg, me: me ?? null, demo, setMe, notify, go, ...helpers };
  const isPublic = (PUBLIC as readonly string[]).includes(section);
  const signedIn = !!me || demo;

  let body: React.ReactNode;
  if (section === "start") body = <Start />;
  else if (section === "impact") body = <Impact />;
  else if (section === "privacy") body = <Privacy />;
  else if (!signedIn && !isPublic) body = <Start reason={t("Щоб відкрити свій простір, увійдіть або створіть обліковий запис.", "Sign in or create an account to open your space.")} />;
  else if (me?.needs_privacy && !demo && !isPublic) body = <ConsentGate />;
  else body = ({ dashboard: <Dashboard />, journal: <Journal />, exercises: <Exercises />, ai: <Ai />, specialist: <Specialist />,
    steps: <Steps />, resources: <Resources />, profile: <Profile /> } as Record<string, React.ReactNode>)[section];

  const shell = signedIn && !["start", "impact", "privacy"].includes(section);
  return (
    <MpCtx.Provider value={ctx}>
      {!cfg.real_data && (
        <div className="mp-pilot" role="note">
          <b>{t("Пілотна версія.", "Pilot version.")}</b>{" "}
          {demo ? t("Демо без збереження: усе зникне після оновлення сторінки.", "Demo without saving: everything disappears when you reload the page.")
            : t("Не вносьте чутливих даних (діагнози, документи, адреси) — триває перевірка захисту даних.", "Please don't enter sensitive data (diagnoses, documents, addresses) — the data-protection review is in progress.")}
        </div>
      )}
      {shell ? (
        <div className="mp-shell">
          <nav className="mp-aside" aria-label={t("Розділи простору", "Sections")}>
            <div className="mp-aside-cap">{t("Особистий простір", "Personal space")}</div>
            {NAV.map(([key, Icon, uk, en]) => (
              <Link key={key} href={helpers.href(key)} className="mp-nav" aria-current={section === key ? "page" : undefined}>
                <Icon className="ic" size={20} aria-hidden="true" />{t(uk, en)}
              </Link>
            ))}
            <div className="mp-aside-help"><b>💜 {t("Ви не самі", "You are not alone")}</b>{t("Тут можна рухатися у власному темпі.", "You can move at your own pace here.")}</div>
          </nav>
          <main className="mp-main" id="main" tabIndex={-1}>{body}</main>
        </div>
      ) : (
        <main className="mp-main" id="main" tabIndex={-1}>{body}</main>
      )}
      {toast && <div className="mp-toast" role="status">{toast}</div>}
    </MpCtx.Provider>
  );
}
