import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { API, CHANNELS, REF_CATEGORIES, REF_STATUSES, errText, fmtDate } from "./shared";

// Звернення мам до фахівця: тема, контакт (з окремою згодою мами), зручний час, статус. Відповідь-примітку мама
// бачить у своєму кабінеті. Фахівцю видно лише адресовані йому звернення.
export default function Referrals({ manager }) {
  const [status, setStatus] = useState("new");
  const [rows, setRows] = useState(null);
  const [staff, setStaff] = useState([]);
  const [notes, setNotes] = useState({});
  const [tick, setTick] = useState(0);

  useEffect(() => {
    axios.get(`${API}/referrals`, { params: status ? { status } : {} }).then((r) => setRows(r.data))
      .catch((e) => { setRows([]); toast.error(errText(e, "Не вдалося завантажити звернення")); });
  }, [status, tick]);
  useEffect(() => { if (manager) axios.get(`${API}/settings`).then((r) => setStaff(r.data.staff || [])).catch(() => {}); }, [manager]);

  const patch = async (id, body, msg) => {
    try { await axios.patch(`${API}/referrals/${id}`, body); toast.success(msg); setTick((t) => t + 1); }
    catch (e) { toast.error(errText(e, "Не вдалося зберегти")); }
  };
  const staffName = (id) => staff.find((s) => s.id === id)?.name || (id ? "інший співробітник" : "не призначено");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {[["new", "Нові"], ["progress", "У роботі"], ["done", "Завершені"], ["", "Усі"]].map(([k, l]) => (
          <Button key={k || "all"} size="sm" variant={status === k ? "default" : "outline"} onClick={() => setStatus(k)}>{l}</Button>
        ))}
      </div>
      <p className="text-xs text-gray-500">Мамі обіцяно відповідь у строк із налаштувань. Це не екстрена служба: якщо в зверненні є загроза життю — діяти за правилами ескалації центру.</p>
      {!rows ? <div className="text-gray-400">Завантаження…</div> : !rows.length ? (
        <div className="bg-white border rounded-lg p-8 text-center text-gray-500">Звернень немає.</div>
      ) : rows.map((r) => (
        <div key={r.id} className="bg-white border rounded-lg p-4 space-y-2">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <b>№ {r.number}</b>
            <span>{REF_CATEGORIES[r.category] || r.category}</span>
            <span className="text-sm text-gray-500">{fmtDate(r.created_at, true)}</span>
            <span className="ml-auto text-sm text-gray-600">{REF_STATUSES.find(([k]) => k === r.status)?.[1]}</span>
          </div>
          <div className="text-sm grid sm:grid-cols-3 gap-2">
            <div><span className="text-gray-500">Ім'я / псевдонім:</span> {r.name || "—"}</div>
            <div><span className="text-gray-500">{CHANNELS[r.channel] || r.channel}:</span> <span className="select-all font-medium">{r.contact}</span></div>
            <div><span className="text-gray-500">Зручний час:</span> {r.preferred_time || "—"}</div>
          </div>
          {manager && (
            <div className="text-sm flex flex-wrap items-center gap-2">
              <span className="text-gray-500">Фахівець:</span>
              <select className="h-8 rounded-md border px-2 text-sm bg-white" value={r.assignee || ""} onChange={(e) => patch(r.id, { assignee: e.target.value }, "Передано")}>
                <option value="">— не призначено —</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {!staff.length && <span className="text-gray-500">{staffName(r.assignee)}</span>}
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs text-gray-500" htmlFor={`note-${r.id}`}>Коротка примітка для мами (вона побачить її в кабінеті): напр., «Зателефонуємо в четвер після 15:00»</label>
            <Textarea id={`note-${r.id}`} rows={2} maxLength={500} value={notes[r.id] ?? r.reply_note ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))} />
          </div>
          <div className="flex flex-wrap gap-2">
            {(notes[r.id] ?? r.reply_note ?? "") !== (r.reply_note ?? "") && (
              <Button size="sm" variant="outline" onClick={() => patch(r.id, { reply_note: notes[r.id] }, "Примітку збережено")}>Зберегти примітку</Button>
            )}
            {r.status !== "progress" && <Button size="sm" variant="outline" onClick={() => patch(r.id, { status: "progress" }, "У роботі")}>Узяти в роботу</Button>}
            {r.status !== "done" && <Button size="sm" onClick={() => patch(r.id, { status: "done" }, "Завершено")}>Завершити</Button>}
          </div>
        </div>
      ))}
    </div>
  );
}
