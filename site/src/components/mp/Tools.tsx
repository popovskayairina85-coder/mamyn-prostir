"use client";
// Вправи, «Мої кроки», ШІ-навігатор. У вправах зберігається лише факт завершення; обране можна за бажанням
// перенести в кроки чи в приватну картку. Кроки — без штрафів, серій і порівнянь (ТЗ 5.5).
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, Copy, Trash2, X } from "lucide-react";
import { api, type AiAnswer, type Card, type Exercise, type Step } from "@/lib/mp";
import { PageHead } from "./parts";
import { fmtDay, useMp } from "./ctx";

const CARD_KINDS = ["support_map", "resource_list", "hard_day"];

export function Exercises() {
  const { t, cfg, pick, href, lang } = useMp();
  const params = useSearchParams();
  const slug = params.get("e");
  const [done, setDone] = useState<Record<string, number>>({});
  const reload = () => api<Record<string, number>>("GET", "/exercises/done").then(setDone).catch(() => {});
  useEffect(() => { reload(); }, []);
  const ex = cfg.exercises.find((e) => e.slug === slug);
  if (ex) return <Runner ex={ex} onDone={reload} />;
  return (
    <>
      <PageHead eyebrow={t("Практичні вправи", "Exercises")} title={t("Малі інструменти для себе", "Small tools for yourself")}
        lead={t("Кожна вправа — 2–5 хвилин. Ваші відповіді не зберігаються на сервері, якщо ви самі не перенесете їх у кроки чи картку.", "Each exercise takes 2–5 minutes. Your answers are not stored on the server unless you choose to move them to steps or a card.")} />
      <div className="mp-cards">
        {cfg.exercises.map((e) => {
          const L = e[lang];
          return (
            <article key={e.slug} className="mp-card">
              <span style={{ fontSize: "1.8rem" }} aria-hidden="true">{e.icon}</span>
              <h2>{L.title}</h2><p>{L.short}</p>
              <small>{e.minutes} {t("хв", "min")}{done[e.slug] ? ` · ${t("завершено", "completed")} ${done[e.slug]}×` : ""}</small>
              <div><Link className="mp-btn mp-btn--sun mp-btn--sm" href={`${href("exercises")}?e=${e.slug}`}>{t("Почати", "Start")} →</Link></div>
            </article>
          );
        })}
      </div>
      <p className="mp-muted" style={{ fontSize: ".9rem" }}>{pick({ uk: "Вправи — оригінальні матеріали «Маминого простору». Вони не замінюють консультації фахівця.", en: "The exercises are original “Mamyn prostir” materials. They do not replace a consultation with a specialist." })}</p>
    </>
  );
}

function Runner({ ex, onDone }: { ex: Exercise; onDone: () => void }) {
  const { t, lang, href, notify, pick } = useMp();
  const router = useRouter();
  const L = ex[lang];
  const [picked, setPicked] = useState<number[]>([]);
  const [fields, setFields] = useState<string[]>((ex.fields || []).map(() => ""));
  const [finished, setFinished] = useState(false);
  const [card, setCard] = useState<Card | null>(null);
  const isCard = CARD_KINDS.includes(ex.slug);
  useEffect(() => { if (isCard) api<Card[]>("GET", "/cards").then((c) => setCard(c.find((x) => x.kind === ex.slug) || null)).catch(() => {}); }, [ex.slug, isCard]);

  const toggle = (i: number) => setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : ex.max === 1 ? [i] : p.length >= (ex.max || 9) ? p : [...p, i]));
  const ready = ex.kind === "choice" ? picked.length > 0 : fields.some((f) => f.trim());
  const labels = picked.map((i) => pick(ex.choices![i]));
  const text = ex.kind === "fields" ? (ex.fields || []).map((f, i) => `${pick(f)}\n${fields[i] || "—"}`).join("\n\n") : labels.join("\n");

  const finish = async () => {
    try { await api("POST", "/exercise-sessions", { slug: ex.slug }); setFinished(true); onDone(); notify(t("Вправу завершено", "Exercise completed")); }
    catch (x) { notify((x as Error).message); }
  };
  const toStep = async () => {
    try { await api("POST", "/steps", { title: labels[0] }); notify(t("Додано в «Мої кроки»", "Added to “My steps”")); }
    catch (x) { notify((x as Error).message); }
  };
  const saveCard = async () => {
    try { await api("PUT", `/cards/${ex.slug}`, { items: labels }); setCard({ kind: ex.slug, items: labels }); notify(t("Картку збережено — її бачите лише ви", "Card saved — only you can see it")); }
    catch (x) { notify((x as Error).message); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); notify(t("Скопійовано", "Copied")); } catch { notify(t("Не вдалося скопіювати — виділіть текст вручну", "Couldn't copy — select the text manually")); }
  };

  return (
    <>
      <div className="mp-page-head">
        <button className="mp-link" onClick={() => router.push(href("exercises"))}>← {t("До всіх вправ", "All exercises")}</button>
        <h1>{ex.icon} {L.title}</h1><p>{L.short}</p>
      </div>
      <section className="mp-panel">
        <h2>{L.question}</h2>
        <p className="mp-muted">{L.hint}</p>
        {ex.kind === "choice" ? (
          <div className="mp-choices">
            {ex.choices!.map((c, i) => (
              <button key={i} type="button" className="mp-choice" aria-pressed={picked.includes(i)} onClick={() => toggle(i)}>
                <span className="box" aria-hidden="true">{picked.includes(i) ? "✓" : ""}</span>{pick(c)}
              </button>
            ))}
          </div>
        ) : (
          <div className="mp-form">
            {ex.fields!.map((f, i) => (
              <label key={i} className="mp-field"><span>{pick(f)}</span>
                <textarea rows={2} maxLength={400} value={fields[i]} onChange={(e) => setFields((x) => x.map((y, j) => (j === i ? e.target.value : y)))} /></label>
            ))}
          </div>
        )}
        {ready && (
          <div className="mp-result" aria-live="polite">
            <b>💛 {t("Підказка", "A thought")}</b><p>{L.result}</p>
            <div className="mp-actions">
              {!finished && <button className="mp-btn mp-btn--sun mp-btn--sm" onClick={finish}>{t("Завершити вправу", "Finish")}</button>}
              {ex.to_step && picked.length === 1 && <button className="mp-btn mp-btn--line mp-btn--sm" onClick={toStep}>{t("Перенести в «Мої кроки»", "Move to “My steps”")}</button>}
              {isCard && <button className="mp-btn mp-btn--line mp-btn--sm" onClick={saveCard}>{t("Зберегти як мою картку", "Save as my card")}</button>}
              {ex.kind === "fields" && <button className="mp-btn mp-btn--line mp-btn--sm" onClick={copy}><Copy size={16} aria-hidden="true" />{t("Скопіювати", "Copy")}</button>}
            </div>
          </div>
        )}
        {finished && <p className="mp-muted">{t("Готово. Повернутися до вправи можна будь-коли.", "Done. You can come back to this exercise any time.")}</p>}
      </section>
      {card && card.items.length > 0 && (
        <section className="mp-panel">
          <h2>{t("Моя картка", "My card")}</h2>
          <ul style={{ margin: 0, paddingLeft: 20 }}>{card.items.map((x) => <li key={x}>{x}</li>)}</ul>
          <div><button className="mp-link" onClick={async () => { await api("DELETE", `/cards/${ex.slug}`); setCard(null); }}>{t("Видалити картку", "Delete card")}</button></div>
        </section>
      )}
    </>
  );
}

export function Steps() {
  const { t, lang, notify } = useMp();
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const reload = () => api<Step[]>("GET", "/steps").then(setSteps).catch(() => setSteps([]));
  useEffect(() => { reload(); }, []);
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api("POST", "/steps", { title, due_day: due || null }); setTitle(""); setDue(""); notify(t("Крок додано", "Step added")); reload(); }
    catch (x) { notify((x as Error).message); }
  };
  const patch = async (id: string, body: object, msg: string) => {
    try { await api("PATCH", `/steps/${id}`, body); notify(msg); reload(); } catch (x) { notify((x as Error).message); }
  };
  const remove = async (id: string) => {
    try { await api("DELETE", `/steps/${id}`); setConfirm(null); notify(t("Крок видалено", "Step deleted")); reload(); } catch (x) { notify((x as Error).message); }
  };
  const statusText = (s: Step["status"]) => (s === "done" ? t("Виконано", "Done") : s === "cancelled" ? t("Скасовано", "Cancelled") : t("Заплановано", "Planned"));
  return (
    <>
      <PageHead eyebrow={t("Мої кроки", "My steps")} title={t("Маленькі плани — без тиску", "Small plans, no pressure")}
        lead={t("Кроки можна змінювати, переносити й скасовувати. Жодних серій і порівнянь з іншими.", "Steps can be changed, moved or cancelled. No streaks and no comparisons.")} />
      <section className="mp-panel">
        <h2>{t("Новий крок", "New step")}</h2>
        <form className="mp-form" onSubmit={add}>
          <label className="mp-field"><span>{t("Що ви хочете зробити?", "What would you like to do?")}</span>
            <input type="text" required minLength={3} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={t("Напр.: записати запитання до фахівця", "E.g.: write down a question for the specialist")} /></label>
          <label className="mp-field" style={{ maxWidth: 260 }}><span>{t("Орієнтовна дата (необов'язково)", "Rough date (optional)")}</span>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></label>
          <div><button className="mp-btn mp-btn--sun" type="submit" disabled={title.trim().length < 3}>{t("Додати крок", "Add step")}</button></div>
        </form>
      </section>
      <section className="mp-panel">
        <h2>{t("Мої записи", "My list")}</h2>
        {!steps ? <p className="mp-muted">…</p> : !steps.length ? <p className="mp-muted">{t("Власних кроків ще немає.", "No steps yet.")}</p> : (
          <div className="mp-list">
            {steps.map((s) => (
              <div key={s.id} className="mp-row">
                <div className="mp-row-main"><b className={s.status !== "planned" ? "mp-done" : ""}>{s.title}</b>
                  <small>{s.due_day ? `${fmtDay(s.due_day, lang)} · ` : ""}{statusText(s.status)}</small></div>
                {confirm === s.id ? (
                  <span className="mp-actions"><span>{t("Видалити?", "Delete?")}</span>
                    <button className="mp-icon-btn" onClick={() => remove(s.id)}>{t("Так", "Yes")}</button>
                    <button className="mp-icon-btn" onClick={() => setConfirm(null)}>{t("Ні", "No")}</button></span>
                ) : (
                  <span className="mp-actions">
                    {s.status === "planned" && <button className="mp-icon-btn" title={t("Виконано", "Done")} aria-label={t("Позначити виконаним", "Mark as done")} onClick={() => patch(s.id, { status: "done" }, t("Чудово!", "Well done!"))}><Check size={18} /></button>}
                    {s.status === "planned" && <button className="mp-icon-btn" title={t("Скасувати", "Cancel")} aria-label={t("Скасувати крок", "Cancel step")} onClick={() => patch(s.id, { status: "cancelled" }, t("Скасовано — це теж нормально", "Cancelled — that's fine too"))}><X size={18} /></button>}
                    {s.status !== "planned" && <button className="mp-icon-btn" onClick={() => patch(s.id, { status: "planned" }, t("Повернуто в план", "Back in plan"))}>{t("Повернути", "Restore")}</button>}
                    <button className="mp-icon-btn" title={t("Видалити", "Delete")} aria-label={t("Видалити крок", "Delete step")} onClick={() => setConfirm(s.id)}><Trash2 size={18} /></button>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export function Ai() {
  const { t, cfg, pick, me, demo, href, notify, lang } = useMp();
  const [busy, setBusy] = useState("");
  const [ans, setAns] = useState<AiAnswer | null>(null);
  const [intent, setIntent] = useState("");
  const [err, setErr] = useState("");
  const consent = demo || !!me?.ai_consent;
  const available = demo || cfg.ai_available;
  const ask = async (k: string) => {
    setBusy(k); setErr(""); setIntent(k);
    try { setAns(await api<AiAnswer>("POST", "/ai/suggest", { intent: k, lang })); } catch (x) { setErr((x as Error).message); setAns(null); } finally { setBusy(""); }
  };
  const feedback = async (kind: string) => {
    try { await api("POST", "/ai/feedback", { kind, intent }); notify(t("Дякуємо, сигнал передано команді", "Thank you, the team has been notified")); } catch { /* сигнал не критичний */ }
  };
  return (
    <>
      <PageHead eyebrow={t("Навігація з ШІ", "AI navigation")} title={t("Підказки за перевіреними матеріалами", "Tips from verified materials")}
        lead={t("ШІ не замінює психолога, не ставить діагнозів і не бачить ваш щоденник. Він лише підбирає перевірені матеріали за темою.", "AI does not replace a psychologist, does not diagnose and never sees your diary. It only picks verified materials for a topic.")} />
      <section className="mp-panel">
        {!available && <p className="mp-warn">{t("Навігатор ще не ввімкнено — його перевіряють фахівці. Поки що скористайтеся розділом «Ресурси для мами».", "The navigator is not switched on yet — specialists are reviewing it. For now, please use “Resources for mums”.")}</p>}
        {available && !consent && <p className="mp-warn">{t("Для навігатора потрібна окрема згода. Її можна дати в розділі ", "The navigator needs a separate consent. You can give it in ")}<Link href={href("profile")}>{t("«Мій профіль»", "“My profile”")}</Link>.</p>}
        <h2>{t("Що ви зараз шукаєте?", "What are you looking for?")}</h2>
        <div className="mp-actions">
          {cfg.ai_intents.map((i) => (
            <button key={i.key} className="mp-btn mp-btn--line" disabled={!available || !consent || !!busy} onClick={() => ask(i.key)}>
              {busy === i.key ? t("Шукаю…", "Searching…") : pick(i)}
            </button>
          ))}
        </div>
        {err && <p className="mp-err" role="alert">{err}</p>}
        {ans && (
          <div className="mp-result" aria-live="polite">
            <b>{t("Відповідь навігатора", "Navigator's answer")}</b>
            <p>{ans.answer}</p>
            {ans.sources.length > 0 && <p><b>{t("Матеріали:", "Materials:")}</b> {ans.sources.map((s) => s.title).join(" · ")} — <Link href={href("resources")}>{t("відкрити ресурси", "open resources")}</Link></p>}
            <small className="mp-muted">{ans.warning}</small>
            <div className="mp-actions">
              <button className="mp-link" onClick={() => feedback("useless")}>{t("Відповідь некорисна", "Not helpful")}</button>
              <button className="mp-link" onClick={() => feedback("unsafe")}>{t("Відповідь небезпечна", "Unsafe answer")}</button>
            </div>
          </div>
        )}
        <div><Link className="mp-link" href={href("resources")}>{t("Переглянути матеріали без ШІ", "Browse materials without AI")} →</Link></div>
      </section>
    </>
  );
}
