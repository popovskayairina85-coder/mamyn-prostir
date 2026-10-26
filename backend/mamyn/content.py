"""Зміст «Мамин простір», що не редагується в CRM: стани щоденника, вправи, категорії, теми ШІ.

Усі тексти — оригінальні для продукту (ТЗ, розділ 5), не з Recovery Roadmap / uCare. Дві мови: uk — основна, en — переклад.
Ресурси (10 редакційних чернеток) засіваються в базу один раз і далі живуть у CRM: публікує лише рецензент.
"""

# Щоденник стану: нейтральні категорії, без «добре/погано» (ТЗ 5.1)
MOODS = [
    {"key": "calm", "icon": "🙂", "uk": "Спокійно", "en": "Calm"},
    {"key": "tired", "icon": "😮‍💨", "uk": "Втомлено", "en": "Tired"},
    {"key": "tense", "icon": "😟", "uk": "Напружено", "en": "Tense"},
    {"key": "sad", "icon": "😔", "uk": "Сумно", "en": "Sad"},
    {"key": "resource", "icon": "🌱", "uk": "Маю ресурс", "en": "I have energy"},
    {"key": "unsure", "icon": "🤍", "uk": "Важко відповісти", "en": "Hard to say"},
]
MOOD_KEYS = {m["key"] for m in MOODS}

CATEGORIES = [
    {"key": "support", "uk": "Підтримка", "en": "Support"},
    {"key": "routine", "uk": "На щодень", "en": "Everyday"},
    {"key": "specialist", "uk": "Фахівці", "en": "Specialists"},
    {"key": "info", "uk": "Довідка", "en": "Reference"},
    {"key": "relationships", "uk": "Стосунки", "en": "Relationships"},
]
CATEGORY_KEYS = {c["key"] for c in CATEGORIES}

# Звернення до фахівця: лише загальна категорія, без діагнозу (ТЗ 5.4)
REFERRAL_CATEGORIES = [
    {"key": "consultation", "uk": "Хочу консультацію", "en": "I'd like a consultation"},
    {"key": "information", "uk": "Потрібна інформація", "en": "I need information"},
    {"key": "support", "uk": "Шукаю підтримку", "en": "I'm looking for support"},
]
REFERRAL_CATEGORY_KEYS = {c["key"] for c in REFERRAL_CATEGORIES}
CHANNELS = {"email", "phone", "telegram", "viber"}
REFERRAL_STATUSES = [
    {"key": "new", "uk": "Отримано", "en": "Received"},
    {"key": "progress", "uk": "У роботі", "en": "In progress"},
    {"key": "done", "uk": "Завершено", "en": "Completed"},
]
REFERRAL_STATUS_KEYS = {s["key"] for s in REFERRAL_STATUSES}

# ШІ-навігатор: лише три закриті сценарії, без вільного тексту (ТЗ 5.3)
AI_INTENTS = {
    "information": {"uk": "Потрібна інформація", "en": "I need information",
                    "ask": "Підкажи перевірені інформаційні матеріали на щодень і довідку."},
    "prepare": {"uk": "Хочу підготуватися до розмови", "en": "I want to prepare for a conversation",
                "ask": "Допоможи підготуватися до розмови з фахівцем або близькими."},
    "support": {"uk": "Шукаю підтримку", "en": "I'm looking for support",
                "ask": "Підкажи, де і як шукати підтримку."},
}

# Кризовий блок за замовчуванням — змінюється в Налаштуваннях CRM (ТЗ 6.2: статичний, затверджений текст)
CRISIS_LINES = [
    {"number": "112", "uk": "Єдиний номер екстрених служб", "en": "Emergency services"},
    {"number": "7333", "uk": "Lifeline Ukraine — лінія психологічної підтримки", "en": "Lifeline Ukraine — emotional support line"},
]

# Шість вправ (ТЗ 5.2). Відповіді у вправах не зберігаються; фіксується лише факт завершення.
# kind: choice — вибір варіантів; fields — короткі поля, результат копіюється локально;
# to_step — обране можна перенести в «Мої кроки».
EXERCISES = [
    {
        "slug": "support_map", "icon": "🤝", "minutes": 3,
        "uk": {"title": "Карта підтримки", "short": "Знайдіть 1–3 людини чи місця, куди можна звернутися по практичну допомогу.",
               "question": "Хто міг би допомогти саме з практичними справами?",
               "hint": "Оберіть до трьох. Це ваша приватна картка — вона лишиться лише у вас.",
               "result": "Почніть з одного короткого й конкретного прохання. Не потрібно розповідати більше, ніж вам комфортно."},
        "en": {"title": "Support map", "short": "Find 1–3 people or places you could turn to for practical help.",
               "question": "Who could help with practical things?",
               "hint": "Pick up to three. This card is private — it stays with you.",
               "result": "Start with one short, concrete request. You don't have to share more than feels comfortable."},
        "kind": "choice", "max": 3, "to_card": True,
        "choices": [
            {"uk": "Близька людина чи родичка", "en": "A close person or relative"},
            {"uk": "Подруга, сусідка, знайома", "en": "A friend, neighbour or acquaintance"},
            {"uk": "Інша мама з досвідом", "en": "Another mother with experience"},
            {"uk": "Фахівець центру", "en": "A specialist at the centre"},
            {"uk": "Соціальна служба громади", "en": "The community social service"},
            {"uk": "Громадська організація", "en": "A non-profit organisation"},
        ],
    },
    {
        "slug": "one_action", "icon": "🌻", "minutes": 2,
        "uk": {"title": "Одна посильна дія", "short": "Оберіть один реалістичний крок на найближчі 24 години.",
               "question": "Що з цього зараз посильно?",
               "hint": "Одна дія — цього достатньо. Її можна перенести в «Мої кроки».",
               "result": "Одна невелика дія — достатній результат на сьогодні. План можна змінити будь-коли."},
        "en": {"title": "One doable action", "short": "Choose one realistic step for the next 24 hours.",
               "question": "Which of these feels doable right now?",
               "hint": "One action is enough. You can move it to “My steps”.",
               "result": "One small action is enough for today. You can change the plan at any time."},
        "kind": "choice", "max": 1, "to_step": True,
        "choices": [
            {"uk": "Записати одне запитання до фахівця", "en": "Write down one question for a specialist"},
            {"uk": "Попросити про одну конкретну допомогу", "en": "Ask for one specific kind of help"},
            {"uk": "Виділити 10 хвилин тиші для себе", "en": "Set aside 10 quiet minutes for myself"},
            {"uk": "Відкласти одну необов'язкову справу", "en": "Postpone one non-essential task"},
            {"uk": "Вийти на коротку прогулянку", "en": "Go for a short walk"},
        ],
    },
    {
        "slug": "boundaries", "icon": "💜", "minutes": 3,
        "uk": {"title": "Мої межі сьогодні", "short": "Готові фрази, щоб попросити про допомогу чи відмовити без пояснень.",
               "question": "Яку фразу хотілося б спробувати?",
               "hint": "Можна обрати кілька. Їх видно лише вам.",
               "result": "Ваші межі мають значення. Ви можете обирати власні слова й не пояснювати подробиць."},
        "en": {"title": "My limits today", "short": "Ready phrases to ask for help or say no without explaining.",
               "question": "Which phrase would you like to try?",
               "hint": "You can pick several. Only you see them.",
               "result": "Your limits matter. You can choose your own words and skip the details."},
        "kind": "choice", "max": 3,
        "choices": [
            {"uk": "«Сьогодні я не можу це взяти».", "en": "“I can't take this on today.”"},
            {"uk": "«Мені потрібно трохи часу, щоб відповісти».", "en": "“I need a little time before I answer.”"},
            {"uk": "«Чи можеш допомогти мені з однією справою цього тижня?»", "en": "“Could you help me with one thing this week?”"},
            {"uk": "«Я не готова зараз це обговорювати».", "en": "“I'm not ready to talk about this now.”"},
            {"uk": "«Дякую, але цього разу — ні».", "en": "“Thank you, but not this time.”"},
        ],
    },
    {
        "slug": "specialist_talk", "icon": "📝", "minutes": 5,
        "uk": {"title": "Розмова з фахівцем", "short": "Підготуйте три питання перед консультацією.",
               "question": "Що важливо запитати?",
               "hint": "Записи не зберігаються на сервері — скопіюйте їх собі.",
               "result": "Готово. Скопіюйте питання й візьміть на консультацію — так розмова буде спокійнішою."},
        "en": {"title": "Talking to a specialist", "short": "Prepare three questions before a consultation.",
               "question": "What is important to ask?",
               "hint": "Your notes are not saved on the server — copy them for yourself.",
               "result": "Done. Copy your questions and take them to the consultation — it makes the talk calmer."},
        "kind": "fields",
        "fields": [
            {"uk": "Що зараз турбує найбільше?", "en": "What worries me most right now?"},
            {"uk": "Чого я чекаю від консультації?", "en": "What do I hope to get from the consultation?"},
            {"uk": "Яке питання боюся забути?", "en": "Which question am I afraid to forget?"},
        ],
    },
    {
        "slug": "resource_list", "icon": "🧺", "minutes": 3,
        "uk": {"title": "Що додає ресурсу", "short": "Ваш короткий список дій, що повертають сили й не потребують великих витрат.",
               "question": "Що з цього вам підходить?",
               "hint": "Оберіть кілька. Повернутися до списку можна будь-коли.",
               "result": "Тримайте цей список під рукою. У важкий день достатньо одного пункту."},
        "en": {"title": "What gives me energy", "short": "Your short list of things that restore energy without big costs.",
               "question": "Which of these suit you?",
               "hint": "Pick several. You can come back to the list at any time.",
               "result": "Keep this list handy. On a hard day, one item is enough."},
        "kind": "choice", "max": 6,
        "choices": [
            {"uk": "Чай чи кава в тиші", "en": "Tea or coffee in silence"},
            {"uk": "Улюблена музика", "en": "Favourite music"},
            {"uk": "Коротка розмова з подругою", "en": "A short chat with a friend"},
            {"uk": "Душ без поспіху", "en": "An unhurried shower"},
            {"uk": "15 хвилин сну вдень", "en": "A 15-minute nap"},
            {"uk": "Прогулянка надворі", "en": "A walk outside"},
            {"uk": "Хобі на кілька хвилин", "en": "A hobby for a few minutes"},
        ],
    },
    {
        "slug": "hard_day", "icon": "🧭", "minutes": 4,
        "uk": {"title": "План непередбаченого дня", "short": "Мінімум необхідного на день, коли немає часу й сил.",
               "question": "Що в такий день справді обов'язкове?",
               "hint": "Решту можна відкласти без докорів. Це не мотивація, а запасний план.",
               "result": "Ваш мінімум готовий. У важкий день цього достатньо — решта почекає."},
        "en": {"title": "Plan for an unexpected day", "short": "The bare minimum for a day with no time or energy.",
               "question": "What is truly essential on a day like that?",
               "hint": "Everything else can wait, without guilt. This is a backup plan, not motivation.",
               "result": "Your minimum is ready. On a hard day this is enough — the rest can wait."},
        "kind": "choice", "max": 5,
        "choices": [
            {"uk": "Їжа для дитини й для себе", "en": "Food for my child and me"},
            {"uk": "Ліки та процедури за графіком", "en": "Scheduled medication and routines"},
            {"uk": "Сон і відпочинок", "en": "Sleep and rest"},
            {"uk": "Одна важлива зустріч чи дзвінок", "en": "One important appointment or call"},
            {"uk": "Попросити когось про підміну", "en": "Ask someone to cover for me"},
            {"uk": "Скасувати необов'язкове", "en": "Cancel what isn't essential"},
        ],
    },
]
EXERCISE_SLUGS = {e["slug"] for e in EXERCISES}

# 10 редакційних чернеток (з пакета ТЗ, 23.10.2026) — у базу як «чернетка», публікує лише рецензент
SEED_RESOURCES = [
    ("support", "Як попросити про допомогу", "Пригадайте одну конкретну справу, яку можна делегувати. Сформулюйте прохання просто: «Чи можеш допомогти мені з … цього тижня?»",
     "How to ask for help", "Think of one specific task you could hand over. Keep the request simple: “Could you help me with … this week?”"),
    ("specialist", "Підготовка до першої розмови з психологом", "Перед розмовою можна записати, що саме зараз найбільше турбує, чого очікуєте від консультації та які запитання важливі для вас.",
     "Preparing for a first talk with a psychologist", "Before the talk, write down what worries you most, what you expect from the consultation and which questions matter to you."),
    ("routine", "Мій час у складний день", "Коли день перевантажений, оберіть одну посильну дію для себе. Дозволено змінювати плани без докорів.",
     "My time on a hard day", "When the day is overloaded, choose one doable action for yourself. It's fine to change plans without guilt."),
    ("support", "Особисті межі без виправдань", "Допустимо відмовлятися від додаткового навантаження. Спробуйте нейтральну фразу: «Сьогодні не можу це взяти».",
     "Personal limits without excuses", "It's okay to turn down extra load. Try a neutral phrase: “I can't take this on today.”"),
    ("relationships", "План розмови з близькими", "Оберіть один конкретний запит, поясніть, яка допомога буде корисною, та домовтеся про наступний крок.",
     "Planning a talk with loved ones", "Pick one specific request, explain what help would be useful and agree on the next step."),
    ("specialist", "Де шукати фахову підтримку", "За тривалого погіршення самопочуття зверніться до сімейного лікаря або фахівця з психічного здоров'я. Цей сервіс не замінює консультації.",
     "Where to find professional support", "If you feel worse for a long time, see your family doctor or a mental health professional. This service does not replace a consultation."),
    ("info", "Що робити, коли відповідь невідома", "Не потрібно вирішувати все відразу. Запишіть запитання та оберіть надійне джерело або спеціаліста для уточнення.",
     "When you don't know the answer", "You don't have to solve everything at once. Write the question down and choose a reliable source or specialist to check with."),
    ("routine", "Особисті пріоритети на тиждень", "Оберіть не більше двох посильних завдань, які дійсно відповідають вашим потребам, а не очікуванням інших.",
     "Personal priorities for the week", "Choose no more than two doable tasks that truly meet your needs rather than other people's expectations."),
    ("info", "Права і доступ до послуг", "Запитуйте у надавача послуг умови, підстави та порядок звернення. Правила можуть змінюватися; перевіряйте їх у компетентного органу.",
     "Rights and access to services", "Ask the service provider about conditions, grounds and how to apply. Rules can change; check them with the competent authority."),
    ("specialist", "Як сформулювати звернення", "У запиті вкажіть, яка інформація потрібна, як з вами зв'язатися та чи зручно отримати відповідь письмово.",
     "How to word a request", "In your request, say what information you need, how to contact you and whether a written answer suits you."),
]
