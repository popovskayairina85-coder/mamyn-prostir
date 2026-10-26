// «Мамин простір» — власна шапка з оригінальним логотипом центру й підвал (рішення Ірини 26.10). Без аналітики.
import { headers } from "next/headers";
import { isLang, localize, tr, type Lang } from "@/lib/i18n";
import "@/styles/mp.css";

export default async function MpLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  const lang: Lang = isLang(raw) ? raw : "uk";
  const t = tr(lang);
  const path = ((await headers()).get("x-bare-path") || "/mamyn-prostir").split("?")[0];
  const other: Lang = lang === "uk" ? "en" : "uk";
  const mp = (s = "") => localize(`/mamyn-prostir${s}`, lang);
  return (
    <div className="mp">
      <header className="mp-top">
        <div className="mp-wrap mp-top-in">
          <a className="mp-brand" href={mp()}>
            {/* оригінальний файл логотипа без змін (ТЗ, розділ 9.1) */}
            <img src="/mp/logo.png" alt={t("Світ можливостей — інклюзивний центр", "Svit mozhlyvostei — inclusive centre")} width={92} height={52} />
            <span><b>{t("Мамин простір", "Mamyn prostir")}</b><small>{t("Цифрова підтримка для мам", "Digital support for mums")}</small></span>
          </a>
          <nav className="mp-toplinks" aria-label={t("Навігація", "Navigation")}>
            <a className="mp-hide-sm" href={localize("/", lang)}>{t("Сайт центру", "Centre website")}</a>
            <a className="mp-hide-sm" href={`${mp()}#mozhlyvosti`}>{t("Можливості", "Features")}</a>
            <a className="mp-hide-sm" href={mp("/privacy")}>{t("Приватність", "Privacy")}</a>
            <a href={localize(path, other)} hrefLang={other} lang={other}>{other === "en" ? "EN" : "UA"}</a>
            <a className="mp-chip-link" href={mp("/dashboard")}>{t("Мій простір", "My space")}</a>
          </nav>
        </div>
      </header>
      {children}
      <footer className="mp-foot">
        <div className="mp-wrap">
          <span>© {new Date().getFullYear()} {t("Інклюзивний центр «Світ можливостей»", "Inclusive centre “Svit mozhlyvostei”")} · {t("Мамин простір — пілотна версія", "Mamyn prostir — pilot version")}</span>
          <span><a href={mp("/privacy")}>{t("Умови й приватність", "Terms & privacy")}</a> · <a href={mp("/resources")}>{t("Ресурси", "Resources")}</a> · <a href={mp("/impact")}>{t("Відкриті показники", "Open figures")}</a></span>
        </div>
      </footer>
    </div>
  );
}
