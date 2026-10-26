"use client";
// Дрібні спільні частини: вибір стану, кризовий блок, заголовок сторінки.
import { useMp } from "./ctx";

export function PageHead({ eyebrow, title, lead }: { eyebrow: string; title: React.ReactNode; lead?: string }) {
  return (
    <div className="mp-page-head">
      <span className="mp-eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {lead && <p>{lead}</p>}
    </div>
  );
}

export function MoodPicker({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  const { cfg, pick, t } = useMp();
  return (
    <div className="mp-moods" role="group" aria-label={t("Як ви почуваєтесь", "How you feel")}>
      {cfg.moods.map((m) => (
        <button key={m.key} type="button" className="mp-mood" aria-pressed={value === m.key} onClick={() => onChange(m.key)}>
          <span className="ic" aria-hidden="true">{m.icon}</span>
          <small>{pick(m)}</small>
        </button>
      ))}
    </div>
  );
}

// Статичний, затверджений у CRM текст — без імітації цілодобового супроводу (ТЗ 6.2)
export function Crisis() {
  const { cfg, pick, t } = useMp();
  return (
    <div className="mp-crisis" role="note">
      <b>{t("Це не екстрена служба.", "This is not an emergency service.")}</b>
      <span>{t("Якщо є безпосередня загроза життю чи здоров'ю — зверніться до екстрених служб або довіреної людини:",
        "If there is an immediate threat to life or health, contact emergency services or someone you trust:")}</span>
      {cfg.crisis_lines.map((l) => (
        <span key={l.number}><b className="num">{l.number}</b>{pick(l)}</span>
      ))}
    </div>
  );
}
