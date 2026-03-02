import sqlite3
import random
from datetime import datetime, timedelta
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "clari.db")

STAGES = ["Заявка", "Контакт", "Показ", "Бронь", "Ипотека", "Сделка"]

MANAGERS = [
    {"id": 1, "name": "Алексей Петров"},
    {"id": 2, "name": "Мария Иванова"},
    {"id": 3, "name": "Дмитрий Козлов"},
    {"id": 4, "name": "Елена Новикова"},
    {"id": 5, "name": "Сергей Смирнов"},
    {"id": 6, "name": "Анна Соколова"},
]

CHANNELS = ["Циан", "Авито", "Контекст", "Соцсети", "Рефералы"]

CLIENT_NAMES = [
    "Иван Соколов", "Ольга Белова", "Михаил Кузнецов", "Татьяна Морозова",
    "Андрей Волков", "Светлана Попова", "Николай Лебедев", "Екатерина Козлова",
    "Виктор Новиков", "Наталья Морозова", "Алексей Петренко", "Юлия Соловьева",
    "Игорь Виноградов", "Марина Жукова", "Павел Зайцев", "Ирина Сидорова",
    "Дмитрий Семенов", "Анна Егорова", "Сергей Павлов", "Людмила Степанова",
    "Александр Козлов", "Валентина Лебедева", "Роман Новиков", "Ксения Орлова",
    "Максим Федоров", "Наталья Захарова", "Станислав Борисов", "Елена Тихонова",
    "Вячеслав Малинин", "Оксана Мельникова", "Илья Барабанов", "Кристина Сорокина",
    "Леонид Гусев", "Вероника Кириллова", "Антон Меркулов", "Полина Зубкова",
    "Денис Агафонов", "Маргарита Власова", "Евгений Силин", "Надежда Быкова",
    "Тимур Ильин", "Галина Зотова", "Артем Нестеров", "Валерия Гончарова",
    "Борис Никитин", "Алина Сафонова", "Георгий Белкин", "Дарья Орехова",
    "Константин Фролов", "Инна Тарасова", "Владимир Козин", "Ольга Панина",
    "Руслан Туманов", "Светлана Кошелева", "Федор Зимин", "Вера Орлова",
    "Петр Рыбаков", "Зоя Куликова", "Кирилл Савин", "Раиса Голубева",
    "Эдуард Ершов", "Нина Власова", "Геннадий Макаров", "Людмила Крылова",
    "Антонина Рогова", "Феликс Гришин", "Нелли Касьянова", "Валерий Мишин",
    "Тамара Сергеева", "Олег Поляков", "Алевтина Комарова", "Юрий Фомин",
    "Зинаида Никифорова", "Вадим Белоусов", "Клара Тимошенко", "Аркадий Лапин",
    "Фаина Горбунова", "Евгений Гришин", "Надежда Туманова", "Петр Архипов",
]

# Manager performance multiplier (affects stage conversion rates)
MGR_PERFORMANCE = {
    1: 1.45,  # Алексей — звезда
    2: 1.20,  # Мария — хорошая
    3: 1.00,  # Дмитрий — средний
    4: 1.00,  # Елена — средняя
    5: 0.58,  # Сергей — слабый, много потерь
    6: 0.72,  # Анна — ниже среднего
}

# Base conversion probabilities between stages
BASE_CONV = [0.70, 0.58, 0.46, 0.72, 0.84]


PAGES = ["/", "/stages", "/problems", "/managers", "/channels"]

# Realistic avg time (seconds) users spend on each page
PAGE_AVG_TIME = {
    "/": 95,
    "/stages": 130,
    "/problems": 180,
    "/managers": 110,
    "/channels": 90,
}

# Relative probability that a user visits each page in a session
PAGE_WEIGHTS = [0.98, 0.70, 0.85, 0.60, 0.45]

PERIOD_CHOICES = ["month", "quarter", "all"]
PERIOD_WEIGHTS = [0.65, 0.25, 0.10]


def seed_analytics():
    """Generate 30 days of realistic product analytics data."""
    rng = random.Random(99)  # separate seed so deal seed is unaffected
    now = datetime(2026, 3, 2, 12, 0, 0)
    events = []

    # Simulate 2–7 sessions per day over last 30 days
    for day_offset in range(29, -1, -1):
        day = now - timedelta(days=day_offset)
        # Fewer sessions on weekends
        is_weekend = day.weekday() >= 5
        n_sessions = rng.randint(1, 3) if is_weekend else rng.randint(2, 7)

        for _ in range(n_sessions):
            sid = f"s{rng.randint(100000, 999999)}"
            session_start = day.replace(
                hour=rng.randint(8, 20),
                minute=rng.randint(0, 59),
                second=rng.randint(0, 59),
            )

            # session_start event
            events.append((
                "session_start", "/", sid, "{}",
                session_start.strftime("%Y-%m-%d %H:%M:%S"),
            ))

            cursor_time = session_start
            visited = set()

            # User visits 1–5 pages per session (always starts at dashboard)
            n_pages = rng.randint(1, 5)
            page_sequence = ["/"]
            for _ in range(n_pages - 1):
                remaining = [p for p in PAGES if p not in visited or p == "/"]
                if not remaining:
                    break
                weights = [PAGE_WEIGHTS[PAGES.index(p)] for p in remaining]
                next_page = rng.choices(remaining, weights=weights)[0]
                page_sequence.append(next_page)

            for page in page_sequence:
                visited.add(page)
                avg = PAGE_AVG_TIME.get(page, 90)
                time_spent = max(5, int(rng.gauss(avg, avg * 0.35)))

                # page_view
                events.append((
                    "page_view", page, sid, "{}",
                    cursor_time.strftime("%Y-%m-%d %H:%M:%S"),
                ))

                # page_leave with time_spent
                import json as _json
                leave_time = cursor_time + timedelta(seconds=time_spent)
                events.append((
                    "page_leave", page, sid,
                    _json.dumps({"time_spent_seconds": time_spent}),
                    leave_time.strftime("%Y-%m-%d %H:%M:%S"),
                ))

                # Feature events while on page
                if page == "/" and rng.random() < 0.55:
                    period = rng.choices(PERIOD_CHOICES, weights=PERIOD_WEIGHTS)[0]
                    events.append((
                        "period_changed", page, sid,
                        _json.dumps({"period": period}),
                        (cursor_time + timedelta(seconds=rng.randint(10, 40))).strftime("%Y-%m-%d %H:%M:%S"),
                    ))

                if page == "/problems" and rng.random() < 0.70:
                    filters = ["manager", "stage", "channel", "min_days"]
                    f = rng.choice(filters)
                    events.append((
                        "filter_applied", page, sid,
                        _json.dumps({"filter": f}),
                        (cursor_time + timedelta(seconds=rng.randint(15, 60))).strftime("%Y-%m-%d %H:%M:%S"),
                    ))

                cursor_time = leave_time + timedelta(seconds=rng.randint(1, 5))

    return events


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_period_dates(period: str):
    now = datetime(2026, 3, 2, 12, 0, 0)
    if period == "month":
        start = datetime(2026, 3, 1)
    elif period == "quarter":
        start = datetime(2026, 1, 1)
    else:  # all
        start = datetime(2025, 1, 1)
    return start, now


def _clamp(dt: datetime, floor: datetime) -> datetime:
    return dt if dt >= floor else floor


def seed_deals():
    random.seed(42)
    now = datetime(2026, 3, 2, 12, 0, 0)
    deals = []

    for i in range(430):
        mgr = random.choice(MANAGERS)
        channel = random.choices(CHANNELS, weights=[30, 25, 20, 15, 10])[0]

        days_ago = random.randint(0, 180)
        created_at = now - timedelta(days=days_ago)

        # Amount: 3M–25M ₽, округлено до 500k
        amount = random.randint(6, 50) * 500_000
        is_important = amount >= 12_000_000

        # Simulate stage progression
        perf = MGR_PERFORMANCE[mgr["id"]]
        max_stage = 0
        for idx in range(5):
            conv = min(0.95, BASE_CONV[idx] * perf)
            if random.random() < conv:
                max_stage = idx + 1
            else:
                break

        final_stage = STAGES[max_stage]

        # Determine status
        if max_stage == 5:
            status = "won"
        elif random.random() < 0.52:
            status = "lost"
        else:
            status = "active"

        # Compute dates
        if status == "won":
            stage_changed_days = random.randint(0, min(30, days_ago))
            last_act_days = random.randint(0, max(0, stage_changed_days))
            has_next_step = False
        elif status == "lost":
            stage_changed_days = random.randint(1, max(2, min(60, days_ago)))
            last_act_days = stage_changed_days
            has_next_step = False
        else:  # active
            stage_changed_days = random.randint(0, min(45, days_ago))
            # 38% active deals are stale (no activity > 7 days) — the "problem" deals
            if random.random() < 0.38:
                last_act_days = random.randint(8, 55)
            else:
                last_act_days = random.randint(0, 6)
            has_next_step = random.random() > 0.40  # 60% have next step

        last_activity_at = _clamp(now - timedelta(days=last_act_days), created_at)
        last_stage_changed_at = _clamp(
            now - timedelta(days=stage_changed_days), created_at
        )

        deals.append(
            (
                CLIENT_NAMES[i % len(CLIENT_NAMES)],
                amount,
                final_stage,
                status,
                mgr["id"],
                mgr["name"],
                channel,
                created_at.strftime("%Y-%m-%d %H:%M:%S"),
                last_activity_at.strftime("%Y-%m-%d %H:%M:%S"),
                last_stage_changed_at.strftime("%Y-%m-%d %H:%M:%S"),
                1 if has_next_step else 0,
                1 if is_important else 0,
            )
        )

    return deals


def init_db():
    if os.path.exists(DB_PATH):
        return

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS deals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_name TEXT NOT NULL,
            amount INTEGER NOT NULL,
            stage TEXT NOT NULL,
            status TEXT NOT NULL,
            manager_id INTEGER NOT NULL,
            manager_name TEXT NOT NULL,
            channel TEXT NOT NULL,
            created_at TEXT NOT NULL,
            last_activity_at TEXT NOT NULL,
            last_stage_changed_at TEXT NOT NULL,
            has_next_step INTEGER NOT NULL DEFAULT 0,
            is_important INTEGER NOT NULL DEFAULT 0
        )
    """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS analytics_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_name TEXT NOT NULL,
            page TEXT,
            session_id TEXT,
            properties TEXT DEFAULT '{}',
            created_at TEXT NOT NULL
        )
    """
    )

    deals = seed_deals()
    cur.executemany(
        """
        INSERT INTO deals
            (client_name, amount, stage, status, manager_id, manager_name,
             channel, created_at, last_activity_at, last_stage_changed_at,
             has_next_step, is_important)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """,
        deals,
    )

    analytics = seed_analytics()
    cur.executemany(
        "INSERT INTO analytics_events (event_name, page, session_id, properties, created_at) VALUES (?, ?, ?, ?, ?)",
        analytics,
    )

    conn.commit()
    conn.close()
    print(f"[Клари] База инициализирована: {len(deals)} сделок, {len(analytics)} событий аналитики")
