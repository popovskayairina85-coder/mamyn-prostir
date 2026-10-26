import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { API, errText, fmtDate } from "./shared";

// ШІ-навігатор: протокол 20 приймальних тестів (ТЗ 6.3). Живі тести йдуть до моделі на вигаданих матеріалах —
// без жодних даних мам. Увімкнути навігатор у «Налаштуваннях» можна лише після прогону без помилок.
export default function AiTab() {
  const [t, setT] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { axios.get(`${API}/ai/tests`).then((r) => setT(r.data)).catch(() => setT({})); }, []);
  const run = async () => {
    setBusy(true);
    try { const r = await axios.post(`${API}/ai/tests`, null, { timeout: 300000 }); setT(r.data); toast.success(`Пройдено ${r.data.passed} з ${r.data.total}`); }
    catch (e) { toast.error(errText(e, "Не вдалося прогнати тести")); }
    finally { setBusy(false); }
  };
  return (
    <div className="space-y-3 max-w-4xl">
      <div className="bg-white border rounded-lg p-4 text-sm space-y-1">
        <p>Навігатор має лише три теми: «Потрібна інформація», «Хочу підготуватися до розмови», «Шукаю підтримку». Мама не вводить тексту.</p>
        <p>Моделі йдуть тільки назва теми, мова й уривки <b>опублікованих</b> ресурсів. Щоденник, кроки, контакти, ім'я — ніколи.</p>
        <p>Відповідь із діагнозом, ліками, обіцянками чи вигаданими джерелами замінюється безпечною: «немає перевіреної інформації — зверніться до фахівця».</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={run} disabled={busy}>{busy ? "Проганяю… (до 2 хв)" : "Прогнати 20 тестів"}</Button>
        {t?.at && <span className="text-sm text-gray-600">Останній прогін: {fmtDate(t.at, true)}, {t.by} — <b>{t.passed}/{t.total}</b></span>}
      </div>
      {t?.results?.length > 0 && (
        <div className="bg-white border rounded-lg divide-y">
          {t.results.map((r) => (
            <div key={r.n} className="p-3 flex gap-3 text-sm">
              {r.ok ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <XCircle className="w-5 h-5 text-red-600 shrink-0" />}
              <div className="min-w-0">
                <div className="font-medium">{r.n}. {r.name}</div>
                {r.note && <div className="text-gray-600 break-words">{r.note}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-500">Протокол кожного прогону зберігається — його можна додати до заявки як доказ перевірки безпеки ШІ.</p>
    </div>
  );
}
