// «Мамин простір» у CRM: спільне для вкладок розділу.
export const API = "/mp-admin";
export const SITE = "https://svitmozhlyvostei.com/mamyn-prostir";

export const errText = (e, fallback = "Помилка") => {
  const d = e?.response?.data?.detail;
  return typeof d === "string" ? d : fallback;
};

export const fmtDate = (iso, withTime = false) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString("uk-UA", { timeZone: "Europe/Kyiv", day: "2-digit", month: "2-digit", year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) });
};

export const REF_CATEGORIES = { consultation: "Хоче консультацію", information: "Потрібна інформація", support: "Шукає підтримку" };
export const CHANNELS = { email: "Пошта", phone: "Телефон", telegram: "Telegram", viber: "Viber" };
export const REF_STATUSES = [["new", "Отримано"], ["progress", "У роботі"], ["done", "Завершено"]];
export const RES_STATUSES = { draft: ["Чернетка", "bg-gray-100 text-gray-700"], reviewed: ["Перевірено", "bg-sky-100 text-sky-800"],
  published: ["Опубліковано", "bg-emerald-100 text-emerald-800"] };
export const CATEGORIES = [["support", "Підтримка"], ["routine", "На щодень"], ["specialist", "Фахівці"], ["info", "Довідка"], ["relationships", "Стосунки"]];

export const EVENT_LABELS = {
  signup: "Реєстрації", login: "Входи", checkin: "Відмітки стану", exercise_done: "Завершені вправи",
  step_created: "Створені кроки", step_done: "Виконані кроки", referral: "Звернення", ai_suggest: "Запити до ШІ",
  ai_useless: "ШІ: «некорисно»", ai_unsafe: "ШІ: «небезпечно»", account_deleted: "Видалені кабінети",
};
