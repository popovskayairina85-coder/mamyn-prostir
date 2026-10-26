import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { API, errText } from "./shared";

function Field({ label, hint, children }) {
  return (
    <div>
      <div className="text-sm font-medium">{label}</div>
      <div className="mt-1">{children}</div>
      {hint && <div className="text-xs text-gray-500 mt-1">{hint}</div>}
    </div>
  );
}

function Toggle({ id, checked, onChange, label, hint }) {
  return (
    <label htmlFor={id} className="flex items-start gap-2 cursor-pointer">
      <input id={id} type="checkbox" className="mt-1 w-4 h-4 accent-violet-600" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span><span className="font-medium text-sm">{label}</span>{hint && <span className="block text-xs text-gray-500">{hint}</span>}</span>
    </label>
  );
}

// Налаштування платформи: хто отримує звернення, хто рецензент, перемикачі пілоту, адреса листів, кризовий блок.
export default function Settings() {
  const [s, setS] = useState(null);
  const [staff, setStaff] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    axios.get(`${API}/settings`).then((r) => { setS(r.data.settings); setStaff(r.data.staff || []); })
      .catch((e) => toast.error(errText(e, "Не вдалося завантажити налаштування")));
  }, []);
  if (!s) return <div className="text-gray-400">Завантаження…</div>;
  const set = (k, v) => setS((x) => ({ ...x, [k]: v }));
  const setLine = (i, k, v) => set("crisis_lines", s.crisis_lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)));

  const save = async () => {
    setBusy(true);
    try { const r = await axios.put(`${API}/settings`, { values: s }); setS(r.data); toast.success("Налаштування збережено"); }
    catch (e) { toast.error(errText(e, "Не вдалося зберегти")); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <fieldset className="bg-white border rounded-lg p-4 space-y-3">
        <legend className="px-1 font-semibold">Пілот</legend>
        <Toggle id="mp-reg" checked={s.registration_open} onChange={(v) => set("registration_open", v)} label="Відкрита реєстрація"
          hint="Будь-яка повнолітня мама може створити кабінет на сайті." />
        <Toggle id="mp-real" checked={s.real_data} onChange={(v) => set("real_data", v)} label="Дозволено справжні дані"
          hint="Вмикати лише після юридичної перевірки. Поки вимкнено — на сайті попередження «пілотна версія: не вносьте чутливих даних»." />
        <Toggle id="mp-ai" checked={s.ai_enabled} onChange={(v) => set("ai_enabled", v)} label="ШІ-навігатор"
          hint="Увімкнути можна лише після прогону 20 тестів без помилок (вкладка «ШІ-навігатор») і перевірки психологом." />
      </fieldset>

      <fieldset className="bg-white border rounded-lg p-4 grid sm:grid-cols-2 gap-3">
        <legend className="px-1 font-semibold">Люди</legend>
        <Field label="Фахівець, що отримує звернення" hint="Нові звернення приходять йому у вкладку «Звернення» (бачить лише свої).">
          <select className="h-9 w-full rounded-md border px-2 text-sm bg-white" value={s.specialist_user_id} onChange={(e) => set("specialist_user_id", e.target.value)}>
            <option value="">— не призначено —</option>
            {staff.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </Field>
        <Field label="Рецензент матеріалів" hint="Підставляється при позначці «Перевірено» у вкладці «Ресурси».">
          <Input value={s.reviewer_name} onChange={(e) => set("reviewer_name", e.target.value)} placeholder="ПІБ психолога" />
        </Field>
        <Field label="Строк відповіді на звернення, робочих днів" hint="Мама бачить його у формі звернення.">
          <Input type="number" min="1" max="60" value={s.sla_days} onChange={(e) => set("sla_days", e.target.value)} />
        </Field>
        <Field label="Поріг для публічної статистики, учасниць" hint="Сторінка /mamyn-prostir/impact показує числа лише від цього порогу.">
          <Input type="number" min="1" value={s.impact_threshold} onChange={(e) => set("impact_threshold", e.target.value)} />
        </Field>
      </fieldset>

      <fieldset className="bg-white border rounded-lg p-4 grid sm:grid-cols-2 gap-3">
        <legend className="px-1 font-semibold">Листи й дані</legend>
        <Field label="Адреса відправника листів" hint="Адреса центру, підтверджена в SendPulse. Нею йдуть листи «новий пароль».">
          <Input type="email" value={s.sender_email} onChange={(e) => set("sender_email", e.target.value)} placeholder="info@svitmozhlyvostei.com" />
        </Field>
        <Field label="Ім'я відправника">
          <Input value={s.sender_name} onChange={(e) => set("sender_name", e.target.value)} />
        </Field>
        <Field label="Оператор персональних даних" hint="Показується в умовах користування на сайті.">
          <Input value={s.operator} onChange={(e) => set("operator", e.target.value)} />
        </Field>
        <Field label="Пошта для запитів щодо даних" hint="Куди мами пишуть щодо своїх даних (доступ, видалення).">
          <Input type="email" value={s.privacy_email} onChange={(e) => set("privacy_email", e.target.value)} />
        </Field>
      </fieldset>

      <fieldset className="bg-white border rounded-lg p-4 space-y-2">
        <legend className="px-1 font-semibold">Кризовий блок</legend>
        <p className="text-xs text-gray-500">Статичний текст на сайті: куди звертатися за безпосередньої небезпеки. Сервіс не імітує цілодобовий супровід.</p>
        {s.crisis_lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[90px_1fr_1fr_32px] gap-2 items-center">
            <Input value={l.number} onChange={(e) => setLine(i, "number", e.target.value)} aria-label="Номер" />
            <Input value={l.uk} onChange={(e) => setLine(i, "uk", e.target.value)} aria-label="Опис українською" />
            <Input value={l.en} onChange={(e) => setLine(i, "en", e.target.value)} aria-label="Опис англійською" />
            <Button size="icon" variant="ghost" onClick={() => set("crisis_lines", s.crisis_lines.filter((_, j) => j !== i))} aria-label="Прибрати"><Trash2 className="w-4 h-4" /></Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => set("crisis_lines", [...s.crisis_lines, { number: "", uk: "", en: "" }])}><Plus className="w-4 h-4 mr-1" />Номер</Button>
      </fieldset>

      <div className="sticky bottom-0 bg-gray-50/90 py-3"><Button onClick={save} disabled={busy}>Зберегти налаштування</Button></div>
    </div>
  );
}
