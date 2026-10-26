import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { API, errText, fmtDate } from "./shared";

// Учасниці «Маминого простору»: хто зареєстрований, коли заходила, які згоди. Щоденників і записів тут немає —
// лише облік кабінетів. Кожен перегляд пишеться в журнал. Видалення — лише за запитом самої мами, з підставою.
export default function Users() {
  const [q, setQ] = useState("");
  const [data, setData] = useState(null);
  const [del, setDel] = useState(null);
  const [reason, setReason] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => axios.get(`${API}/users`, { params: { q: q.trim() } }).then((r) => setData(r.data))
      .catch((e) => { setData({ items: [], total: 0 }); toast.error(errText(e, "Не вдалося завантажити учасниць")); }), 250);
    return () => clearTimeout(t);
  }, [q, tick]);

  const remove = async () => {
    try {
      await axios.post(`${API}/users/${del.id}/delete`, { confirm: "DELETE", reason });
      toast.success("Кабінет і всі записи видалено"); setDel(null); setReason(""); setTick((x) => x + 1);
    } catch (e) { toast.error(errText(e, "Не вдалося видалити")); }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
          <Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Пошук за поштою чи ім'ям" />
        </div>
        {data && <span className="text-sm text-gray-500">Усього: {data.total}</span>}
      </div>
      <p className="text-xs text-gray-500">Тут лише облік кабінетів. Що мама пише в щоденнику, кроках і картках, не бачить ніхто з команди. Перегляд списку фіксується в журналі.</p>
      <div className="bg-white border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr><th className="p-2">Ім'я / псевдонім</th><th className="p-2">Пошта</th><th className="p-2">Мова</th><th className="p-2">Зареєстрована</th>
              <th className="p-2">Останній вхід</th><th className="p-2">Згода на ШІ</th><th className="p-2 text-right">Звернень</th><th className="p-2" /></tr>
          </thead>
          <tbody>
            {!data ? <tr><td className="p-4 text-gray-400" colSpan={8}>Завантаження…</td></tr>
              : !data.items.length ? <tr><td className="p-6 text-center text-gray-500" colSpan={8}>Нікого не знайдено.</td></tr>
              : data.items.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-2">{u.name || "—"}</td>
                  <td className="p-2 select-all">{u.email}</td>
                  <td className="p-2 uppercase">{u.lang}</td>
                  <td className="p-2 whitespace-nowrap">{fmtDate(u.created_at, true)}</td>
                  <td className="p-2 whitespace-nowrap">{fmtDate(u.last_login, true)}</td>
                  <td className="p-2">{u.ai_consent ? "так" : "ні"}</td>
                  <td className="p-2 text-right tabular-nums">{u.referrals}</td>
                  <td className="p-2 text-right"><Button size="sm" variant="ghost" className="text-red-600" onClick={() => { setDel(u); setReason(""); }}>Видалити</Button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {del && (
        <div className="bg-white border border-red-200 rounded-lg p-4 space-y-2">
          <div className="font-semibold">Видалити кабінет {del.email}?</div>
          <p className="text-sm text-gray-600">Лише за запитом самої мами. Зітреться все: відмітки, кроки, картки, вправи, звернення, згоди. Повернути не можна.</p>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Підстава, напр.: «лист мами від 26.10»" />
          <div className="flex gap-2">
            <Button variant="destructive" onClick={remove} disabled={reason.trim().length < 5}>Видалити назавжди</Button>
            <Button variant="outline" onClick={() => setDel(null)}>Скасувати</Button>
          </div>
        </div>
      )}
    </div>
  );
}
