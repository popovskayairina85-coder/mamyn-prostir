import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { API, EVENT_LABELS, errText, fmtDate } from "./shared";

function Tile({ label, value, hint, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick}
      className={`text-left bg-white border rounded-lg p-4 ${onClick ? "hover:border-violet-400" : ""}`}>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold tabular-nums mt-1">{value}</div>
      {hint && <div className="text-xs text-gray-500 mt-1">{hint}</div>}
    </Tag>
  );
}

function Flag({ on, label, onText, offText }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`inline-block w-2.5 h-2.5 rounded-full ${on ? "bg-emerald-500" : "bg-gray-300"}`} />
      <span className="font-medium">{label}:</span> <span className="text-gray-600">{on ? onText : offText}</span>
    </div>
  );
}

// Огляд: лише знеособлені числа — скільки людей, дій, звернень. Без імен і записів.
export default function Overview({ go }) {
  const [d, setD] = useState(null);
  useEffect(() => { axios.get(`${API}/overview`).then((r) => setD(r.data)).catch((e) => toast.error(errText(e, "Не вдалося завантажити огляд"))); }, []);
  if (!d) return <div className="text-gray-400">Завантаження…</div>;
  const t = d.totals || {};
  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg p-4 space-y-1.5">
        <Flag on={d.settings.registration_open} label="Реєстрація" onText="відкрита" offText="закрита" />
        <Flag on={d.settings.real_data} label="Справжні дані" onText="дозволено" offText="пілот — на сайті попередження не вносити чутливого" />
        <Flag on={d.settings.ai_enabled} label="ШІ-навігатор" onText="увімкнено" offText="вимкнено (вмикається після 20 тестів без помилок)" />
        <div className="text-xs text-gray-500 pt-1">Змінити — вкладка «Налаштування».</div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label="Учасниць" value={d.users} hint={`активні за 7 днів: ${d.active_7d}`} onClick={() => go("users")} />
        <Tile label="Нові звернення" value={d.referrals.new || 0} hint={`у роботі: ${d.referrals.progress || 0}, завершено: ${d.referrals.done || 0}`} onClick={() => go("referrals")} />
        <Tile label="Ресурси опубліковано" value={d.resources.published || 0} hint={`перевірено: ${d.resources.reviewed || 0}, чернеток: ${d.resources.draft || 0}`} onClick={() => go("resources")} />
        <Tile label="Тести ШІ" value={d.ai_tests ? `${d.ai_tests.passed}/${d.ai_tests.total}` : "—"} hint={d.ai_tests ? `останній прогін ${fmtDate(d.ai_tests.at, true)}` : "ще не проганялись"} onClick={() => go("ai")} />
      </div>
      <div className="bg-white border rounded-lg p-4">
        <div className="font-semibold mb-2">Дії за весь час (знеособлено)</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-1 text-sm">
          {Object.entries(EVENT_LABELS).map(([k, label]) => (
            <div key={k} className="flex justify-between gap-2 border-b py-1"><span className="text-gray-600">{label}</span><b className="tabular-nums">{t[k] || 0}</b></div>
          ))}
        </div>
        <div className="text-xs text-gray-500 mt-2">Згода на ШІ: {d.ai_consent}. Сигнали про відповіді ШІ: «некорисно» — {d.ai_feedback.useless}, «небезпечно» — {d.ai_feedback.unsafe}.</div>
      </div>
    </div>
  );
}
