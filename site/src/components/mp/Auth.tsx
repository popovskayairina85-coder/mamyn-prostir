"use client";
// Вхід, реєстрація, відновлення пароля й повторна згода з оновленими умовами.
// Згоди окремі (ТЗ F-03): повноліття, умови користування — обов'язкові; ШІ — необов'язкова, вмикається й вимикається в профілі.
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { api, startDemo, type Me } from "@/lib/mp";
import { PageHead } from "./parts";
import { useMp } from "./ctx";

type Mode = "login" | "register" | "forgot" | "reset";

export function Start({ reason }: { reason?: string }) {
  const { t, cfg, href, go, setMe, notify, lang } = useMp();
  const params = useSearchParams();
  const resetToken = params.get("reset") || "";
  const [mode, setMode] = useState<Mode>(resetToken ? "reset" : cfg.registration_open ? "register" : "login");
  const [f, setF] = useState({ name: "", email: "", password: "", adult: false, privacy: false, ai: false });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (mode === "register") {
        setMe(await api<Me>("POST", "/register", { ...f, lang }));
        notify(t("Ваш простір готовий", "Your space is ready"));
        go("dashboard");
      } else if (mode === "login") {
        setMe(await api<Me>("POST", "/login", { email: f.email, password: f.password }));
        go("dashboard");
      } else if (mode === "forgot") {
        await api("POST", "/password/forgot", { email: f.email, lang });
        setSent(true);
      } else {
        await api("POST", "/password/reset", { token: resetToken, password: f.password });
        notify(t("Пароль змінено", "Password changed"));
        window.location.href = href("dashboard");
      }
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const demo = () => { startDemo(); go("dashboard"); };

  return (
    <div className="mp-auth">
      <div className="mp-panel">
        <PageHead eyebrow={t("Перший крок", "First step")} title={mode === "reset" ? t("Новий пароль", "New password") : t("Ласкаво просимо", "Welcome")}
          lead={reason || t("Особистий простір для мам: короткі відмітки, вправи, кроки й звернення до фахівця.", "A personal space for mums: quick check-ins, exercises, steps and a way to reach a specialist.")} />
        {(mode === "login" || mode === "register") && (
          <div className="mp-tabs" role="group" aria-label={t("Вхід або реєстрація", "Sign in or register")}>
            {cfg.registration_open && <button type="button" aria-pressed={mode === "register"} onClick={() => setMode("register")}>{t("Створити простір", "Create space")}</button>}
            <button type="button" aria-pressed={mode === "login"} onClick={() => setMode("login")}>{t("Увійти", "Sign in")}</button>
          </div>
        )}
        {sent ? (
          <p>{t("Якщо обліковий запис з цією поштою є, ми надіслали лист із посиланням. Воно діє годину.", "If an account with this email exists, we've sent a link. It is valid for one hour.")}</p>
        ) : (
          <form className="mp-form" onSubmit={submit} noValidate>
            {mode === "register" && (
              <label className="mp-field"><span>{t("Як до вас звертатися", "What should we call you")}</span>
                <input id="mp-name" type="text" maxLength={60} autoComplete="nickname" value={f.name} onChange={(e) => set("name", e.target.value)} />
                <small>{t("Можна псевдонім. Справжнє ім'я не потрібне.", "A nickname is fine. Your real name is not needed.")}</small>
              </label>
            )}
            {mode !== "reset" && (
              <label className="mp-field"><span>{t("Пошта", "Email")}</span>
                <input id="mp-email" type="email" required autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
              </label>
            )}
            {mode !== "forgot" && (
              <label className="mp-field"><span>{t("Пароль", "Password")}</span>
                <input id="mp-password" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={f.password} onChange={(e) => set("password", e.target.value)} />
                {mode !== "login" && <small>{t("Щонайменше 8 символів.", "At least 8 characters.")}</small>}
              </label>
            )}
            {mode === "register" && (
              <div className="mp-form" style={{ gap: 12 }}>
                <label className="mp-check"><input id="mp-adult" type="checkbox" checked={f.adult} onChange={(e) => set("adult", e.target.checked)} />
                  <span>{t("Мені виповнилося 18 років.", "I am 18 or older.")}</span></label>
                <label className="mp-check"><input id="mp-privacy" type="checkbox" checked={f.privacy} onChange={(e) => set("privacy", e.target.checked)} />
                  <span>{t("Я ознайомилася з ", "I have read the ")}<Link href={href("privacy")} target="_blank">{t("умовами користування й обробки даних", "terms of use and data processing")}</Link>{t(" і погоджуюся на зберігання моїх записів для роботи сервісу.", " and agree to my entries being stored for the service to work.")}</span></label>
                <label className="mp-check"><input id="mp-ai" type="checkbox" checked={f.ai} onChange={(e) => set("ai", e.target.checked)} />
                  <span>{t("Необов'язково: дозволяю передавати обрану мною загальну тему й уривки перевірених матеріалів ШІ-сервісу — без нотаток, контактів і персональних даних.",
                    "Optional: I allow the general topic I choose and excerpts of verified materials to be sent to an AI service — without notes, contacts or personal data.")}</span></label>
              </div>
            )}
            {err && <p className="mp-err" role="alert">{err}</p>}
            <div className="mp-actions">
              <button className="mp-btn mp-btn--sun" type="submit" disabled={busy || (mode === "register" && (!f.adult || !f.privacy))}>
                {mode === "register" ? t("Створити мій простір", "Create my space") : mode === "login" ? t("Увійти", "Sign in")
                  : mode === "forgot" ? t("Надіслати посилання", "Send link") : t("Зберегти пароль", "Save password")}
              </button>
              {mode === "login" && <button type="button" className="mp-link" onClick={() => setMode("forgot")}>{t("Забули пароль?", "Forgot password?")}</button>}
              {mode === "forgot" && <button type="button" className="mp-link" onClick={() => setMode("login")}>{t("Назад до входу", "Back to sign in")}</button>}
            </div>
          </form>
        )}
      </div>
      <div className="mp-panel" style={{ marginTop: 16 }}>
        <h2>{t("Спершу подивитися?", "Want to look first?")}</h2>
        <p className="mp-muted">{t("Демоверсія на вигаданих даних: нічого не зберігається й нікуди не надсилається.", "A demo with made-up data: nothing is saved or sent anywhere.")}</p>
        <div className="mp-actions"><button type="button" className="mp-btn mp-btn--line" onClick={demo}>{t("Відкрити демоверсію", "Open the demo")}</button></div>
      </div>
    </div>
  );
}

export function ConsentGate() {
  const { t, href, setMe } = useMp();
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");
  const accept = async () => {
    try { setMe(await api<Me>("POST", "/consents", { privacy: true })); } catch (x) { setErr((x as Error).message); }
  };
  return (
    <div className="mp-auth"><div className="mp-panel">
      <PageHead eyebrow={t("Оновлення", "Update")} title={t("Ми оновили умови", "We've updated the terms")}
        lead={t("Перш ніж продовжити, перегляньте умови користування й обробки даних.", "Before you continue, please review the terms of use and data processing.")} />
      <label className="mp-check"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
        <span>{t("Я ознайомилася з ", "I have read the ")}<Link href={href("privacy")} target="_blank">{t("оновленими умовами", "updated terms")}</Link>{t(" і погоджуюся.", " and agree.")}</span></label>
      {err && <p className="mp-err" role="alert">{err}</p>}
      <div className="mp-actions"><button className="mp-btn mp-btn--sun" disabled={!ok} onClick={accept}>{t("Продовжити", "Continue")}</button></div>
    </div></div>
  );
}
