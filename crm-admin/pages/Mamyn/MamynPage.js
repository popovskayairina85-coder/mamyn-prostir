import { useNavigate, useParams } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { useAccess } from "@/access";
import Overview from "./Overview";
import Referrals from "./Referrals";
import Users from "./Users";
import Resources from "./Resources";
import Settings from "./Settings";
import AiTab from "./AiTab";
import { SITE } from "./shared";

// «Мамин простір» (svitmozhlyvostei.com/mamyn-prostir): платформа самопідтримки для мам. Тут — лише те, що потрібно
// команді: звернення, ресурси з рецензуванням, налаштування й знеособлена статистика. Щоденників мам тут немає.
const TABS = [
  ["", "Огляд", "view"], ["users", "Учасниці", "update"], ["referrals", "Звернення", "referrals"], ["resources", "Ресурси", "update"],
  ["ai", "ШІ-навігатор", "update"], ["settings", "Налаштування", "update"],
];

export default function MamynPage() {
  const { tab = "" } = useParams();
  const navigate = useNavigate();
  const { can } = useAccess();
  const manager = can("mamyn.update");
  const allowed = (k) => manager || (k === "referrals" ? can("mamyn.referrals") : k === "view" ? can("mamyn.view") || can("mamyn.referrals") : false);
  const tabs = TABS.filter(([, , need]) => allowed(need));
  const current = tabs.some(([k]) => k === tab) ? tab : tabs[0]?.[0] ?? "";

  let body = null;
  if (current === "") body = <Overview go={(k) => navigate(`/mamyn/${k}`)} />;
  else if (current === "users") body = <Users />;
  else if (current === "referrals") body = <Referrals manager={manager} />;
  else if (current === "resources") body = <Resources />;
  else if (current === "ai") body = <AiTab />;
  else if (current === "settings") body = <Settings />;

  return (
    <div className="p-4 lg:p-6 w-full space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight mr-auto">Мамин простір</h1>
        <a href={SITE} target="_blank" rel="noreferrer" className="text-sm text-violet-700 inline-flex items-center gap-1">
          Відкрити на сайті <ExternalLink className="w-4 h-4" />
        </a>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-b" aria-label="Вкладки розділу">
        {tabs.map(([k, label]) => (
          <button key={k || "home"} type="button" onClick={() => navigate(k ? `/mamyn/${k}` : "/mamyn")}
            className={`whitespace-nowrap px-3 py-2 text-sm font-medium border-b-2 -mb-px ${current === k ? "border-violet-600 text-violet-700" : "border-transparent text-gray-600 hover:text-gray-900"}`}>
            {label}
          </button>
        ))}
      </nav>
      {body}
    </div>
  );
}
