"use client";
// Відкриті сторінки: зведені показники (лише від порогу учасниць) і умови користування пілоту.
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/mp";
import { Crisis, PageHead } from "./parts";
import { fmtDay, useMp } from "./ctx";

type Impact = { hidden: boolean; threshold?: number; participants?: number; totals?: Record<string, number>; since?: string; updated_at?: string };

export function Impact() {
  const { t, lang } = useMp();
  const [d, setD] = useState<Impact | null>(null);
  useEffect(() => { api<Impact>("GET", "/impact").then(setD).catch(() => setD({ hidden: true, threshold: 10 })); }, []);
  const LABELS: [string, string, string][] = [
    ["checkin", "Відміток стану", "Mood check-ins"], ["exercise_done", "Завершених вправ", "Exercises completed"],
    ["step_created", "Запланованих кроків", "Steps planned"], ["step_done", "Виконаних кроків", "Steps done"],
    ["referral", "Звернень до фахівця", "Requests to a specialist"], ["ai_suggest", "Запитів до навігатора", "Navigator requests"],
  ];
  return (
    <>
      <PageHead eyebrow={t("Відкриті показники", "Open figures")} title={t("Як працює «Мамин простір»", "How “Mamyn prostir” is used")}
        lead={t("Лише зведені числа без імен, адрес і змісту записів. Показуємо їх, коли учасниць достатньо, щоб нікого не можна було впізнати.", "Only aggregated numbers — no names, addresses or entry contents. We show them once there are enough participants that nobody can be identified.")} />
      {!d ? <p className="mp-muted">…</p> : d.hidden ? (
        <section className="mp-panel"><p>{t(`Показники з'являться, коли в просторі буде щонайменше ${d.threshold} учасниць.`, `Figures will appear once there are at least ${d.threshold} participants.`)}</p></section>
      ) : (
        <>
          <div className="mp-stats">
            <div className="mp-stat"><b>{d.participants}</b>{t("учасниць", "participants")}</div>
            {LABELS.map(([k, uk, en]) => <div key={k} className="mp-stat"><b>{d.totals?.[k] ?? 0}</b>{t(uk, en)}</div>)}
          </div>
          <p className="mp-muted">{t("Від запуску пілоту", "Since the pilot launched")} ({fmtDay(d.since, lang)}). {t("Оновлено", "Updated")}: {fmtDay(d.updated_at, lang)}.</p>
        </>
      )}
    </>
  );
}

export function Privacy() {
  const { t, cfg, href } = useMp();
  const email = cfg.privacy_email;
  return (
    <>
      <PageHead eyebrow={t("Умови", "Terms")} title={t("Умови користування й обробки даних (пілот)", "Terms of use and data processing (pilot)")}
        lead={t("Коротко й по суті. Повний юридичний текст затверджується перед завершенням пілоту.", "Short and to the point. The full legal text is being approved before the pilot ends.")} />
      <section className="mp-panel">
        <h2>{t("Хто ми", "Who we are")}</h2>
        <p>{t(`«Мамин простір» — сервіс самопідтримки для повнолітніх мам і жінок, які доглядають дітей з інвалідністю чи особливостями розвитку. Оператор даних — ${cfg.operator}, інклюзивний центр «Світ можливостей».`,
          `“Mamyn prostir” is a self-support service for adult mothers and women caring for children with disabilities or developmental differences. Data controller: ${cfg.operator}, inclusive centre “Svit mozhlyvostei”.`)}</p>
        <h2>{t("Що ми зберігаємо", "What we store")}</h2>
        <ul>
          <li>{t("Пошту й пароль (у вигляді стійкого хешу) — для входу; ім'я або псевдонім — за бажанням.", "Email and password (as a strong hash) to sign in; a name or nickname if you wish.")}</li>
          <li>{t("Ваші відмітки стану, нотатки, кроки, картки й факти завершення вправ — лише для вас.", "Your check-ins, notes, steps, cards and completed exercises — for you only.")}</li>
          <li>{t("Звернення до фахівця: тему, спосіб і контакт для зв'язку, зручний час — лише з вашою окремою згодою.", "Requests to a specialist: topic, contact method and details, convenient time — only with your separate consent.")}</li>
          <li>{t("Згоди: яку саме, коли й якої версії тексту.", "Consents: which one, when and for which version of the text.")}</li>
        </ul>
        <h2>{t("Чого ми не збираємо й не робимо", "What we don't collect or do")}</h2>
        <ul>
          <li>{t("Не питаємо діагноз дитини, документи, адресу.", "We don't ask for your child's diagnosis, documents or address.")}</li>
          <li>{t("Не ставимо діагнозів і не оцінюємо стан. Відмітки — лише для вас.", "We don't diagnose or score your state. Check-ins are just for you.")}</li>
          <li>{t("Фахівець бачить лише ваше звернення — не щоденник, не кроки.", "A specialist only sees your request — not your diary or steps.")}</li>
          <li>{t("ШІ отримує лише обрану тему й уривки перевірених матеріалів, і лише з окремою згодою. Ваші записи не використовуються для навчання ШІ.", "AI only receives the chosen topic and excerpts of verified materials, and only with a separate consent. Your entries are never used to train AI.")}</li>
          <li>{t("Без реклами й сторонніх лічильників на сторінках простору. Публічна статистика — лише зведені числа від 10 учасниць.", "No ads or third-party trackers in the space. Public figures are aggregated, from 10 participants only.")}</li>
        </ul>
        <h2>{t("Де зберігаються дані", "Where data is stored")}</h2>
        <p>{t("На захищеному сервері в ЄС (Німеччина, Нюрнберг), з'єднання шифроване (HTTPS). Резервні копії бази зашифровані ключем, якого немає на сервері, і зберігаються на Google Диску центру: щоденні — 14 днів, перша копія кожного місяця — рік.",
          "On a secured server in the EU (Nuremberg, Germany); connections are encrypted (HTTPS). Database backups are encrypted with a key that is not kept on the server and stored on the centre's Google Drive: daily copies for 14 days, the first copy of each month for a year.")}</p>
        <h2>{t("Ваші права", "Your rights")}</h2>
        <p>{t("Ви можете будь-коли завантажити копію своїх даних або повністю видалити простір у ", "You can download a copy of your data or delete your space at any time in ")}<Link href={href("profile")}>{t("«Моєму профілі»", "“My profile”")}</Link>{t(", а також відкликати згоду на ШІ.", ", and withdraw AI consent.")}
          {email ? <> {t("Питання щодо даних: ", "Questions about your data: ")}<span style={{ userSelect: "all" }}>{email}</span>.</> : null}</p>
        <h2>{t("Межі сервісу", "Limits of the service")}</h2>
        <p>{t("Сервіс не замінює психологічної чи медичної допомоги й не є екстреною службою.", "The service does not replace psychological or medical care and is not an emergency service.")}</p>
        <Crisis />
      </section>
    </>
  );
}
