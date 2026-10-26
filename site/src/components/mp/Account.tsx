"use client";
// «Мій профіль»: ім'я, згода на ШІ (можна відкликати), вивантаження й повне видалення даних, вихід (ТЗ F-03, F-11).
import Link from "next/link";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { api, endDemo, type Me } from "@/lib/mp";
import { PageHead } from "./parts";
import { useMp } from "./ctx";

export function Profile() {
  const { t, me, setMe, notify, demo, href, cfg, go } = useMp();
  const [name, setName] = useState(me?.name || "");
  const [confirm, setConfirm] = useState("");
  const [asking, setAsking] = useState(false);

  const saveName = async () => {
    try { setMe(await api<Me>("PATCH", "/me", { name })); notify(t("Збережено", "Saved")); } catch (x) { notify((x as Error).message); }
  };
  const setAi = async (on: boolean) => {
    try { setMe(await api<Me>("POST", "/consents", { ai: on })); notify(on ? t("Згоду на ШІ надано", "AI consent given") : t("Згоду на ШІ відкликано", "AI consent withdrawn")); }
    catch (x) { notify((x as Error).message); }
  };
  const download = async () => {
    try {
      let blob: Blob;
      if (demo) blob = new Blob([JSON.stringify({ demo: true, note: "Демо — вигадані дані" }, null, 2)], { type: "application/json" });
      else {
        const r = await fetch("/api/mp/export", { credentials: "same-origin", cache: "no-store" });
        if (!r.ok) throw new Error(t("Не вдалося підготувати файл", "Couldn't prepare the file"));
        blob = await r.blob();
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "mamyn-prostir-my-data.json"; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (x) { notify((x as Error).message); }
  };
  const erase = async () => {
    try {
      await api("POST", "/me/delete", { confirm: "DELETE" });
      if (demo) { notify(t("Демо-дані очищено", "Demo data cleared")); setAsking(false); return; }
      setMe(null); notify(t("Ваш простір і всі записи видалено", "Your space and all entries have been deleted")); go("");
    } catch (x) { notify((x as Error).message); }
  };
  const logout = async () => {
    if (demo) { endDemo(); window.location.href = href(""); return; }
    await api("POST", "/logout").catch(() => {});
    setMe(null); window.location.href = href("");
  };

  return (
    <>
      <PageHead eyebrow={t("Мій профіль", "My profile")} title={t("Приватність і мої дані", "Privacy and my data")}
        lead={t("Ви керуєте своїми записами: можете змінити згоди, завантажити копію або видалити все.", "You control your entries: change consents, download a copy or delete everything.")} />
      <section className="mp-panel">
        <h2>{t("Як до вас звертатися", "Your name")}</h2>
        <div className="mp-actions">
          <input type="text" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} style={{ maxWidth: 320 }} aria-label={t("Ім'я або псевдонім", "Name or nickname")} />
          <button className="mp-btn mp-btn--line mp-btn--sm" onClick={saveName} disabled={name === (me?.name || "")}>{t("Зберегти", "Save")}</button>
        </div>
        <p className="mp-muted">{t("Пошта для входу: ", "Sign-in email: ")}{me?.email}</p>
      </section>
      <section className="mp-panel">
        <h2>{t("Згода на ШІ-навігатор", "AI navigator consent")}</h2>
        <p>{me?.ai_consent ? t("Згоду надано. ШІ отримує лише обрану тему й уривки перевірених матеріалів — без нотаток, контактів і персональних даних.", "Consent given. The AI only receives the chosen topic and excerpts of verified materials — no notes, contacts or personal data.")
          : t("Згоду не надано. Навігатор недоступний, решта простору працює як завжди.", "No consent. The navigator is unavailable; everything else works as usual.")}</p>
        <div className="mp-actions">
          {me?.ai_consent ? <button className="mp-btn mp-btn--line mp-btn--sm" onClick={() => setAi(false)}>{t("Відкликати згоду", "Withdraw consent")}</button>
            : <button className="mp-btn mp-btn--line mp-btn--sm" onClick={() => setAi(true)}>{t("Надати згоду", "Give consent")}</button>}
        </div>
      </section>
      <section className="mp-panel">
        <h2>{t("Мої дані", "My data")}</h2>
        <p>{t("Копія всіх ваших записів у форматі JSON: відмітки, кроки, картки, вправи, звернення, згоди.", "A JSON copy of all your entries: check-ins, steps, cards, exercises, requests, consents.")}</p>
        <div className="mp-actions"><button className="mp-btn mp-btn--line mp-btn--sm" onClick={download}>{t("Завантажити мої дані", "Download my data")}</button></div>
        <hr style={{ border: 0, borderTop: "1px solid var(--mp-line)", width: "100%" }} />
        <p>{t("Видалення стирає обліковий запис і всі записи простору одразу. У зашифрованих резервних копіях вони зникають поступово: зі щоденних — за 14 днів, зі щомісячних — за рік.", "Deletion erases your account and all entries immediately. In encrypted backups they disappear gradually: from daily copies within 14 days, from monthly copies within a year.")}</p>
        {!asking ? <div><button className="mp-btn mp-btn--danger mp-btn--sm" onClick={() => setAsking(true)}>{t("Видалити мій простір", "Delete my space")}</button></div> : (
          <div className="mp-form">
            <label className="mp-field"><span>{t("Щоб підтвердити, введіть слово ВИДАЛИТИ", "To confirm, type DELETE")}</span>
              <input type="text" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" style={{ maxWidth: 280 }} /></label>
            <div className="mp-actions">
              <button className="mp-btn mp-btn--danger mp-btn--sm" disabled={!["ВИДАЛИТИ", "DELETE"].includes(confirm.trim().toUpperCase())} onClick={erase}>{t("Видалити назавжди", "Delete forever")}</button>
              <button className="mp-link" onClick={() => { setAsking(false); setConfirm(""); }}>{t("Скасувати", "Cancel")}</button>
            </div>
          </div>
        )}
        {cfg.privacy_email && <p className="mp-muted">{t("Питання щодо даних: ", "Questions about your data: ")}<span style={{ userSelect: "all" }}>{cfg.privacy_email}</span></p>}
        <p><Link href={href("privacy")}>{t("Умови користування й обробки даних", "Terms of use and data processing")}</Link></p>
      </section>
      <div><button className="mp-btn mp-btn--line" onClick={logout}><LogOut size={18} aria-hidden="true" />{demo ? t("Вийти з демо", "Leave demo") : t("Вийти", "Sign out")}</button></div>
    </>
  );
}
