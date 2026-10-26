"use client";
// Головна кабінету й «Щоденник стану». Підказки на головній — лише за обраним станом сьогодні (1–3 перевірені
// матеріали й одна вправа), без жодних висновків про людину, оцінок і серій (ТЗ 2.1, 5.1, 5.5).
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type Checkin, type Resource, type Step } from "@/lib/mp";
import { MoodPicker, PageHead } from "./parts";
import { fmtDay, kyivToday, useMp } from "./ctx";

const MOOD_CATEGORY: Record<string, string> = { tired: "routine", tense: "support", sad: "specialist", calm: "relationships", resource: "info", unsure: "support" };
const MOOD_EXERCISE: Record<string, string> = { tired: "hard_day", tense: "boundaries", sad: "support_map", calm: "resource_list", resource: "one_action", unsure: "one_action" };

function useToday() {
  const [list, setList] = useState<Checkin[] | null>(null);
  const reload = () => api<Checkin[]>("GET", "/checkins").then(setList).catch(() => setList([]));
  useEffect(() => { reload(); }, []);
  return { list, today: list?.find((c) => c.day === kyivToday()), reload };
}

export function Dashboard() {
  const { t, me, cfg, pick, href, notify, demo } = useMp();
  const { today, reload } = useToday();
  const [mood, setMood] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [res, setRes] = useState<Resource[]>([]);
  useEffect(() => { if (today) setMood(today.mood); }, [today]);
  useEffect(() => {
    api<Step[]>("GET", "/steps").then(setSteps).catch(() => {});
    api<Resource[]>("GET", "/resources").then(setRes).catch(() => {});
  }, []);
  const save = async () => {
    try { await api("PUT", "/checkins", { mood, note: today?.note || "" }); notify(t("Відмітку збережено", "Saved")); reload(); }
    catch (x) { notify((x as Error).message); }
  };
  const chosen = today?.mood || "";
  const suggested = chosen ? res.filter((r) => r.category === MOOD_CATEGORY[chosen]).slice(0, 3) : [];
  const ex = cfg.exercises.find((e) => e.slug === (MOOD_EXERCISE[chosen] || "one_action"))!;
  const planned = steps.filter((s) => s.status === "planned").length;
  const done = steps.filter((s) => s.status === "done").length;
  const name = me?.name || (demo ? "Олена" : "");

  return (
    <>
      {/* ім'я — не у звертанні: кличний відмінок довільного імені автоматично не утворити («Вітаємо, Олена» — помилка) */}
      <PageHead eyebrow={name ? `${t("Мій простір", "My space")} · ${name}` : t("Мій простір", "My space")} title={<>{t("Вітаємо!", "Welcome!")} <span aria-hidden="true">💛</span></>}
        lead={t("Можна почати з малого. Тут немає неправильних відповідей.", "You can start small. There are no wrong answers here.")} />
      <section className="mp-panel" aria-labelledby="mp-today">
        <div><h2 id="mp-today">{t("Як ви почуваєтесь сьогодні?", "How are you feeling today?")}</h2>
          <p className="mp-muted">{t("Оберіть стан, який найближче описує ваш день. Це не тест і не оцінка.", "Choose what best describes your day. It's not a test or a score.")}</p></div>
        <MoodPicker value={mood} onChange={setMood} />
        <div className="mp-actions">
          <button className="mp-btn mp-btn--sun" disabled={!mood || mood === today?.mood} onClick={save}>{today ? t("Оновити відмітку", "Update") : t("Зберегти відмітку", "Save")}</button>
          <Link href={href("journal")} className="mp-link">{t("Додати нотатку в щоденнику", "Add a note in the diary")}</Link>
        </div>
      </section>
      {chosen && (
        <section className="mp-panel" aria-labelledby="mp-for-you">
          <h2 id="mp-for-you">{t("Може знадобитися сьогодні", "Might help today")}</h2>
          <div className="mp-cards">
            {suggested.map((r) => (
              <article key={r.id} className="mp-card"><span className="mp-tag">{pick(cfg.categories.find((c) => c.key === r.category))}</span>
                <h3>{pick(r.title)}</h3><p>{pick(r.text)}</p></article>
            ))}
            <article className="mp-card mp-mini--sun"><span className="mp-tag mp-tag--sun">{t("Вправа", "Exercise")} · {ex.minutes} {t("хв", "min")}</span>
              <h3>{ex.icon} {pick({ uk: ex.uk.title, en: ex.en.title })}</h3><p>{pick({ uk: ex.uk.short, en: ex.en.short })}</p>
              <Link className="mp-link" href={`${href("exercises")}?e=${ex.slug}`}>{t("Почати", "Start")} →</Link></article>
          </div>
          {!suggested.length && <p className="mp-muted">{t("Перевірені матеріали на цю тему ще готуються.", "Verified materials on this topic are still being prepared.")}</p>}
        </section>
      )}
      <div className="mp-grid3">
        <div className="mp-mini mp-mini--sun"><span className="ic" aria-hidden="true">🌱</span><b>{t("Ваші кроки", "Your steps")}</b>
          <p>{t(`${done} виконано · ${planned} заплановано`, `${done} done · ${planned} planned`)}</p><Link className="mp-link" href={href("steps")}>{t("Переглянути", "View")} →</Link></div>
        <div className="mp-mini mp-mini--lilac"><span className="ic" aria-hidden="true">🪷</span><b>{t("Практика для себе", "Practice for yourself")}</b>
          <p>{t("Шість коротких вправ у власному темпі.", "Six short exercises at your own pace.")}</p><Link className="mp-link" href={href("exercises")}>{t("Обрати вправу", "Choose")} →</Link></div>
        <div className="mp-mini"><span className="ic" aria-hidden="true">🤝</span><b>{t("Підтримка поруч", "Support nearby")}</b>
          <p>{t("Можна попросити про консультацію без опису діагнозу дитини.", "You can ask for a consultation without describing your child's diagnosis.")}</p><Link className="mp-link" href={href("specialist")}>{t("Звернутися", "Get in touch")} →</Link></div>
      </div>
      <div className="mp-quote">💜 {t("Ваші потреби мають значення. Навіть якщо сьогодні є сили лише на одну невелику дію.", "Your needs matter. Even if today you only have energy for one small thing.")}</div>
    </>
  );
}

export function Journal() {
  const { t, cfg, pick, lang, notify } = useMp();
  const { list, reload } = useToday();
  const days = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Kyiv" }).format(new Date(Date.now() - i * 864e5)));
  const [day, setDay] = useState(days[0]);
  const entry = list?.find((c) => c.day === day);
  const [mood, setMood] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => { setMood(entry?.mood || ""); setNote(entry?.note || ""); }, [entry, day]);
  const save = async () => {
    try { await api("PUT", "/checkins", { mood, note, day }); notify(t("Збережено", "Saved")); reload(); }
    catch (x) { notify((x as Error).message); }
  };
  return (
    <>
      <PageHead eyebrow={t("Щоденник стану", "Mood diary")} title={t("Як минув ваш день?", "How was your day?")}
        lead={t("Короткий запис лише для вас. Це не медичний тест і не діагностика. Нотатки не бачать ні фахівці, ні ШІ.", "A short note just for you. It's not a medical test or a diagnosis. Specialists and AI never see your notes.")} />
      <section className="mp-panel">
        <label className="mp-field" style={{ maxWidth: 280 }}><span>{t("День", "Day")}</span>
          <select value={day} onChange={(e) => setDay(e.target.value)}>
            {days.map((d, i) => <option key={d} value={d}>{i === 0 ? t("Сьогодні", "Today") : fmtDay(d, lang)}</option>)}
          </select></label>
        <MoodPicker value={mood} onChange={setMood} />
        <label className="mp-field"><span>{t("Нотатка (необов'язково, до 500 символів)", "Note (optional, up to 500 characters)")}</span>
          <textarea id="mp-note" maxLength={500} rows={3} value={note} placeholder={t("Що мені сьогодні потрібно?", "What do I need today?")} onChange={(e) => setNote(e.target.value)} />
          <small>{note.length}/500</small></label>
        <div className="mp-actions"><button className="mp-btn mp-btn--sun" disabled={!mood} onClick={save}>{t("Зберегти", "Save")}</button></div>
      </section>
      <section className="mp-panel">
        <h2>{t("Попередні записи", "Earlier entries")}</h2>
        {!list ? <p className="mp-muted">…</p> : !list.length ? <p className="mp-muted">{t("Записів ще немає. Власний темп — достатньо.", "No entries yet. Your own pace is enough.")}</p> : (
          <div className="mp-list">
            {list.map((c) => {
              const m = cfg.moods.find((x) => x.key === c.mood);
              return (
                <div key={c.day} className="mp-row">
                  <b style={{ minWidth: 110 }}>{fmtDay(c.day, lang)}</b>
                  <span>{m?.icon} {pick(m)}</span>
                  {c.note && <span className="mp-muted" style={{ flexBasis: "100%" }}>{c.note}</span>}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
