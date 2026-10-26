import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { API, CATEGORIES, RES_STATUSES, errText, fmtDate } from "./shared";

const EMPTY = { category: "support", title: { uk: "", en: "" }, text: { uk: "", en: "" }, source: "Редакція «Мамин простір»", author: "", link: "", order: 0 };

// Ресурси для мам: чернетка → перевірено рецензентом → опубліковано. Будь-яка зміна тексту повертає матеріал у
// чернетку — на сайті й у ШІ-навігаторі лише те, що справді перевірив рецензент (ТЗ F-07).
export default function Resources() {
  const [rows, setRows] = useState(null);
  const [edit, setEdit] = useState(null);
  const [reviewer, setReviewer] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => { axios.get(`${API}/resources`).then((r) => setRows(r.data)).catch((e) => toast.error(errText(e, "Не вдалося завантажити ресурси"))); }, [tick]);
  useEffect(() => { axios.get(`${API}/settings`).then((r) => setReviewer(r.data.settings.reviewer_name || "")).catch(() => {}); }, []);

  const act = async (r, action) => {
    try { await axios.post(`${API}/resources/${r.id}/status`, { action, reviewer }); setTick((t) => t + 1); toast.success("Готово"); }
    catch (e) { toast.error(errText(e, "Не вдалося")); }
  };
  const remove = async (r) => {
    try { await axios.delete(`${API}/resources/${r.id}`); setTick((t) => t + 1); toast.success("Видалено"); }
    catch (e) { toast.error(errText(e, "Не вдалося видалити")); }
  };
  const save = async () => {
    try {
      if (edit.id) await axios.put(`${API}/resources/${edit.id}`, edit);
      else await axios.post(`${API}/resources`, edit);
      toast.success(edit.id ? "Збережено — матеріал знову чернетка, потрібна перевірка" : "Додано як чернетку");
      setEdit(null); setTick((t) => t + 1);
    } catch (e) { toast.error(errText(e, "Не вдалося зберегти")); }
  };
  const setBi = (field, lang, v) => setEdit((x) => ({ ...x, [field]: { ...x[field], [lang]: v } }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <label className="text-sm" htmlFor="mp-reviewer">Рецензент для позначки «Перевірено»</label>
          <Input id="mp-reviewer" className="mt-1" value={reviewer} onChange={(e) => setReviewer(e.target.value)} placeholder="ПІБ психолога, що перевірив текст" />
          <div className="text-xs text-gray-500 mt-1">Ставиться на матеріал разом із датою перевірки; видно мамам на сайті.</div>
        </div>
        <Button onClick={() => setEdit({ ...EMPTY })}><Plus className="w-4 h-4 mr-1" />Матеріал</Button>
      </div>
      {!rows ? <div className="text-gray-400">Завантаження…</div> : rows.map((r) => {
        const [label, cls] = RES_STATUSES[r.status] || [r.status, ""];
        return (
          <div key={r.id} className="bg-white border rounded-lg p-4 space-y-1.5">
            <div className="flex flex-wrap items-baseline gap-2">
              <b className="mr-auto">{r.title?.uk}</b>
              <span className={`text-xs rounded px-1.5 py-0.5 ${cls}`}>{label}</span>
            </div>
            <div className="text-sm text-gray-700">{r.text?.uk}</div>
            <div className="text-xs text-gray-500">
              {CATEGORIES.find(([k]) => k === r.category)?.[1]} · джерело: {r.source || "—"}
              {r.reviewed_at && <> · перевірила: {r.reviewer}, {fmtDate(r.reviewed_at)}</>}
              {!r.title?.en && <> · <span className="text-amber-700">немає англійської</span></>}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => setEdit({ ...EMPTY, ...r })}>Редагувати</Button>
              {r.status === "draft" && <Button size="sm" variant="outline" onClick={() => act(r, "review")} disabled={!reviewer.trim()}>Позначити «Перевірено»</Button>}
              {r.status === "reviewed" && <Button size="sm" onClick={() => act(r, "publish")}>Опублікувати</Button>}
              {r.status === "published" && <Button size="sm" variant="outline" onClick={() => act(r, "unpublish")}>Зняти з публікації</Button>}
              {r.status !== "published" && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(r)}>Видалити</Button>}
            </div>
          </div>
        );
      })}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{edit?.id ? "Матеріал" : "Новий матеріал"}</DialogTitle>
            <DialogDescription>Короткий, зрозумілий текст без діагнозів і порад щодо лікування. Після збереження матеріал — чернетка до перевірки.</DialogDescription>
          </DialogHeader>
          {edit && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm" htmlFor="res-cat">Категорія</label>
                <select id="res-cat" className="mt-1 h-9 w-full rounded-md border px-2 text-sm bg-white" value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>
                  {CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm" htmlFor="res-order">Порядок у списку</label>
                <Input id="res-order" className="mt-1" type="number" value={edit.order} onChange={(e) => setEdit({ ...edit, order: Number(e.target.value) || 0 })} />
              </div>
              {["uk", "en"].map((l) => (
                <div key={l} className="space-y-2">
                  <div className="text-sm font-semibold">{l === "uk" ? "Українською" : "English (необов'язково, але бажано)"}</div>
                  <Input placeholder="Назва" value={edit.title[l] || ""} onChange={(e) => setBi("title", l, e.target.value)} />
                  <Textarea rows={6} placeholder="Текст" value={edit.text[l] || ""} onChange={(e) => setBi("text", l, e.target.value)} />
                </div>
              ))}
              <div>
                <label className="text-sm" htmlFor="res-src">Джерело</label>
                <Input id="res-src" className="mt-1" value={edit.source} onChange={(e) => setEdit({ ...edit, source: e.target.value })} />
              </div>
              <div>
                <label className="text-sm" htmlFor="res-author">Автор</label>
                <Input id="res-author" className="mt-1" value={edit.author} onChange={(e) => setEdit({ ...edit, author: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm" htmlFor="res-link">Посилання на першоджерело (необов'язково, лише https://)</label>
                <Input id="res-link" className="mt-1" value={edit.link} onChange={(e) => setEdit({ ...edit, link: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Скасувати</Button>
            <Button onClick={save}>Зберегти</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
