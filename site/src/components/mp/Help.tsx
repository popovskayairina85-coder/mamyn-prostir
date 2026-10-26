"use client";
// «Підтримка фахівця» — мінімум полів, окрема згода на контакт, статус звернення; «Ресурси для мами» — лише
// опубліковане після перевірки рецензентом, з джерелом і датою перевірки (ТЗ 5.4, 5.6, F-07, F-09).
import { useEffect, useState } from "react";
import { api, type Referral, type Resource } from "@/lib/mp";
import { Crisis, PageHead } from "./parts";
import { fmtDay, useMp } from "./ctx";

const CHANNELS: [string, string, string, string, string][] = [
  ["email", "Пошта", "Email", "Ваша пошта", "Your email"],
  ["phone", "Телефон", "Phone", "+380…", "+380…"],
  ["telegram", "Telegram", "Telegram", "@нік або номер", "@username or number"],
  ["viber", "Viber", "Viber", "+380…", "+380…"],
];

export function Specialist() {
  const { t, cfg, pick, lang, notify, me } = useMp();
  const [list, setList] = useState<Referral[] | null>(null);
  const [f, setF] = useState({ category: "consultation", channel: "email", contact: me?.email || "", preferred_time: "", share_contact: false });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const reload = () => api<Referral[]>("GET", "/referrals").then(setList).catch(() => setList([]));
  useEffect(() => { reload(); }, []);
  const ch = CHANNELS.find((c) => c[0] === f.channel)!;
  const send = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      await api("POST", "/referrals", f);
      notify(t("Звернення надіслано. Його статус видно нижче.", "Request sent. You can see its status below."));
      setF((x) => ({ ...x, preferred_time: "", share_contact: false })); reload();
    } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHead eyebrow={t("Підтримка фахівця", "Specialist support")} title={t("Можна попросити про допомогу", "You can ask for help")}
        lead={t("Вкажіть лише тему й зручний спосіб зв'язку. Діагноз дитини повідомляти не потрібно, а ваш щоденник фахівець не бачить.", "Just choose a topic and how to reach you. You don't need to share your child's diagnosis, and the specialist never sees your diary.")} />
      <Crisis />
      <section className="mp-panel">
        <p className="mp-muted">{t(`Фахівець центру відповість протягом ${cfg.sla_days} робочих днів.`, `A specialist from the centre will reply within ${cfg.sla_days} working days.`)}</p>
        <form className="mp-form" onSubmit={send}>
          <label className="mp-field"><span>{t("Тема звернення", "Topic")}</span>
            <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
              {cfg.referral_categories.map((c) => <option key={c.key} value={c.key}>{pick(c)}</option>)}
            </select></label>
          <label className="mp-field"><span>{t("Як зручно зв'язатися?", "How should we contact you?")}</span>
            <select value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value, contact: "" })}>
              {CHANNELS.map((c) => <option key={c[0]} value={c[0]}>{t(c[1], c[2])}</option>)}
            </select></label>
          <label className="mp-field"><span>{t("Контакт", "Contact")}</span>
            <input type={f.channel === "email" ? "email" : "text"} required maxLength={150} autoComplete="off" value={f.contact}
              placeholder={t(ch[3], ch[4])} onChange={(e) => setF({ ...f, contact: e.target.value })} /></label>
          <label className="mp-field"><span>{t("Зручний час (необов'язково)", "Convenient time (optional)")}</span>
            <input type="text" maxLength={80} value={f.preferred_time} placeholder={t("Напр.: у будні після 15:00", "E.g.: weekdays after 3 pm")}
              onChange={(e) => setF({ ...f, preferred_time: e.target.value })} /></label>
          <label className="mp-check"><input type="checkbox" checked={f.share_contact} onChange={(e) => setF({ ...f, share_contact: e.target.checked })} />
            <span>{t("Даю окрему згоду, щоб фахівець центру використав цей контакт для відповіді на це звернення.", "I separately agree that a specialist from the centre may use this contact to reply to this request.")}</span></label>
          {err && <p className="mp-err" role="alert">{err}</p>}
          <div><button className="mp-btn mp-btn--sun" type="submit" disabled={busy || !f.share_contact || !f.contact.trim()}>{t("Надіслати звернення", "Send request")}</button></div>
        </form>
      </section>
      <section className="mp-panel">
        <h2>{t("Мої звернення", "My requests")}</h2>
        {!list ? <p className="mp-muted">…</p> : !list.length ? <p className="mp-muted">{t("Звернень ще немає.", "No requests yet.")}</p> : (
          <div className="mp-list">
            {list.map((r) => (
              <div key={r.id} className="mp-row">
                <div className="mp-row-main"><b>№ {r.number} · {pick(cfg.referral_categories.find((c) => c.key === r.category))}</b>
                  <small>{fmtDay(r.created_at, lang)}</small>
                  {r.reply_note && <span>{t("Фахівець: ", "Specialist: ")}{r.reply_note}</span>}</div>
                <span className={`mp-tag ${r.status === "done" ? "mp-tag--ok" : r.status === "progress" ? "mp-tag--sun" : ""}`}>{pick(cfg.referral_statuses.find((s) => s.key === r.status))}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export function Resources() {
  const { t, cfg, pick, lang } = useMp();
  const [rows, setRows] = useState<Resource[] | null>(null);
  const [cat, setCat] = useState("all");
  useEffect(() => { api<Resource[]>("GET", "/resources").then(setRows).catch(() => setRows([])); }, []);
  const shown = (rows || []).filter((r) => cat === "all" || r.category === cat);
  return (
    <>
      <PageHead eyebrow={t("Ресурси для мами", "Resources for mums")} title={t("Знання, які можна перевірити", "Knowledge you can check")}
        lead={t("Тут лише матеріали, які перевірив фахівець. У кожного — джерело й дата перевірки. Правила й контакти можуть змінюватися.", "Only materials reviewed by a specialist. Each shows its source and review date. Rules and contacts can change.")} />
      <div className="mp-filters" role="group" aria-label={t("Категорії", "Categories")}>
        <button className="mp-filter" aria-pressed={cat === "all"} onClick={() => setCat("all")}>{t("Усе", "All")}</button>
        {cfg.categories.map((c) => <button key={c.key} className="mp-filter" aria-pressed={cat === c.key} onClick={() => setCat(c.key)}>{pick(c)}</button>)}
      </div>
      {!rows ? <p className="mp-muted">…</p> : !shown.length ? (
        <section className="mp-panel"><h2>{t("Матеріали готуються", "Materials are being prepared")}</h2>
          <p className="mp-muted">{t("Редакційні матеріали з'являться після перевірки фахівцем. Ми не позначаємо неперевірене як перевірене.", "Editorial materials will appear after a specialist reviews them. We never label unreviewed content as reviewed.")}</p></section>
      ) : (
        <div className="mp-cards">
          {shown.map((r) => (
            <article key={r.id} className="mp-card">
              <span className="mp-tag">{pick(cfg.categories.find((c) => c.key === r.category))}</span>
              <h2>{pick(r.title)}</h2>
              <p>{pick(r.text)}</p>
              {r.link && <a href={r.link} target="_blank" rel="noopener noreferrer">{t("Першоджерело", "Original source")} ↗</a>}
              <small>{t("Джерело", "Source")}: {r.source || "—"}{r.reviewed_at ? ` · ${t("перевірила", "reviewed by")} ${r.reviewer}, ${fmtDay(r.reviewed_at, lang)}` : ""}</small>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
