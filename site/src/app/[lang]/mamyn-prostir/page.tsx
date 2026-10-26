// Лендінг «Мамин простір» — за погодженим макетом (23.10.2026): герой, шість можливостей, «як це працює», приватність.
import type { Metadata } from "next";
import { isLang, localize, tr, type Lang } from "@/lib/i18n";
import { absoluteUrl } from "@/lib/site";

const FEATURES: [string, string, string, string, string, string][] = [
  ["📒", "journal", "Щоденник стану", "Mood diary", "Помічайте зміни та власні потреби — один дотик на день.", "Notice changes and your own needs — one tap a day."],
  ["🪷", "exercises", "Практичні вправи", "Exercises", "Шість коротких вправ на 2–5 хвилин.", "Six short exercises of 2–5 minutes."],
  ["✨", "ai", "Підказки ШІ", "AI tips", "Навігація лише за перевіреними матеріалами.", "Navigation through verified materials only."],
  ["🤝", "specialist", "Підтримка фахівця", "Specialist support", "Звернення до людини, коли потрібна допомога.", "Reach a person when you need help."],
  ["🎯", "steps", "Мої кроки", "My steps", "Власні маленькі цілі без тиску й серій.", "Your own small goals, no pressure or streaks."],
  ["📚", "resources", "Ресурси для мами", "Resources for mums", "Матеріали після перевірки фахівцем.", "Materials reviewed by a specialist."],
];

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang: Lang = isLang(raw) ? raw : "uk";
  const t = tr(lang);
  return {
    title: t("Мамин простір — цифрова підтримка для мам", "Mamyn prostir — digital support for mums"),
    description: t("Безкоштовний особистий простір для мам дітей з інвалідністю чи особливостями розвитку: щоденник стану, короткі вправи, кроки, перевірені ресурси й звернення до фахівця.",
      "A free personal space for mothers of children with disabilities or developmental differences: mood diary, short exercises, steps, verified resources and a way to reach a specialist."),
    alternates: { canonical: absoluteUrl("/mamyn-prostir", lang), languages: { uk: absoluteUrl("/mamyn-prostir", "uk"), en: absoluteUrl("/mamyn-prostir", "en") } },
  };
}

export default async function MpLanding({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  const lang: Lang = isLang(raw) ? raw : "uk";
  const t = tr(lang);
  const mp = (s = "") => localize(`/mamyn-prostir${s}`, lang);
  return (
    <main id="main" tabIndex={-1}>
      <section className="mp-hero">
        <div className="mp-hero-copy">
          <div><span className="mp-eyebrow">{t("Простір для мам", "A space for mums")}</span></div>
          <h1>{t("Мамин", "Mamyn")} <span>{t("простір", "prostir")}</span><i aria-hidden="true">✳</i></h1>
          <p className="mp-hero-lead">{t("Цифрова підтримка для мам, які виховують дітей з інвалідністю чи особливостями розвитку.", "Digital support for mothers raising children with disabilities or developmental differences.")}</p>
          <div className="mp-bits">
            <span>💜 {t("Без оцінювання", "No judgement")}</span>
            <span>🌻 {t("Маленькі кроки", "Small steps")}</span>
            <span>🤝 {t("Поряд є підтримка", "Support is near")}</span>
          </div>
          <div className="mp-actions">
            <a className="mp-btn mp-btn--sun" href={mp("/start")}>{t("Створити мій простір", "Create my space")} →</a>
            <a className="mp-btn mp-btn--line" href={mp("/dashboard")}>{t("Увійти", "Sign in")}</a>
          </div>
          <p className="mp-muted" style={{ fontSize: ".9rem" }}>{t("Безкоштовно. Лише для повнолітніх. Дані дитини не потрібні.", "Free. Adults only. No information about your child is needed.")}</p>
        </div>
        <div className="mp-hero-art">
          {/* записка «Турбота про себе дає сили рухатися далі» — уже частина ілюстрації */}
          <img src="/mp/hero.webp" alt={t("Жінка в бузковому светрі усміхається за ноутбуком; поруч записка «Турбота про себе дає сили рухатися далі»", "A woman in a lilac sweater smiles at a laptop; a note beside her reads “Caring for yourself gives strength to keep going”")} width={578} height={381} />
        </div>
      </section>

      <section className="mp-section" id="mozhlyvosti">
        <div className="mp-wrap">
          <div className="mp-head-row">
            <div><span className="mp-eyebrow">{t("Корисні інструменти", "Useful tools")}</span><h2>{t("Що є в Маминому просторі?", "What's inside?")}</h2></div>
            <p>{t("Короткі практики, щоденні записи й можливість звернутися по підтримку — у зрозумілому особистому кабінеті.", "Short practices, daily notes and a way to ask for support — in a clear personal space.")}</p>
          </div>
          <div className="mp-features">
            {FEATURES.map(([ic, s, uk, en, duk, den]) => (
              <a key={s} className="mp-feature" href={mp(`/${s}`)}>
                <span className="ic" aria-hidden="true">{ic}</span><h3>{t(uk, en)}</h3><p>{t(duk, den)}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="mp-section" style={{ paddingTop: 0 }}>
        <div className="mp-wrap">
          <div className="mp-how">
            <div>
              <span className="mp-eyebrow">{t("Як це працює", "How it works")}</span>
              <h2>{t("Ваш ритм. Ваші потреби.", "Your rhythm. Your needs.")}</h2>
              <p>{t("Почніть з короткої щоденної відмітки. Оберіть посильну вправу або свій наступний крок. За потреби зв'яжіться з фахівцем — без опису діагнозу дитини.", "Start with a quick daily check-in. Choose a doable exercise or your next step. If you need to, reach a specialist — without describing your child's diagnosis.")}</p>
              <div className="mp-actions">
                <a className="mp-btn mp-btn--sun" href={mp("/start")}>{t("Почати", "Get started")} →</a>
                <a className="mp-btn mp-btn--line" href={mp("/start")}>{t("Подивитися демо", "See the demo")}</a>
              </div>
            </div>
            <div className="mp-how-card">
              <span className="mp-muted" style={{ fontSize: ".85rem" }}>{t("Сьогодні — один невеликий крок", "Today — one small step")}</span>
              <b style={{ fontSize: "1.2rem" }}>{t("Як ви почуваєтесь?", "How are you feeling?")}</b>
              <div className="moods" aria-hidden="true">🙂 😮‍💨 😟 😔 🌱 🤍</div>
              <span className="mp-muted" style={{ fontSize: ".9rem" }}>{t("Жодних оцінок, рейтингів або обов'язкових серій.", "No scores, ratings or mandatory streaks.")}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mp-section mp-privacy-band">
        <div className="mp-wrap">
          <h2>{t("Особистий простір із повагою до приватності", "A personal space that respects your privacy")}</h2>
          <p>{t("Щоденник і цілі бачите лише ви. Фахівець бачить тільки ваше звернення. Матеріали не використовуються для діагностики, дані дітей не потрібні.", "Only you see your diary and goals. A specialist sees only your request. Nothing is used for diagnosis, and no data about your child is needed.")}</p>
          <p><b>{t("Це не екстрена психологічна служба.", "This is not an emergency psychological service.")}</b> {t("За безпосередньої небезпеки телефонуйте 112 або на лінію Lifeline Ukraine 7333.", "In immediate danger, call 112 or Lifeline Ukraine on 7333.")}</p>
          <a href={mp("/privacy")}>{t("Умови й приватність", "Terms & privacy")}</a>
        </div>
      </section>
    </main>
  );
}
