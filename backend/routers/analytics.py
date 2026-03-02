import json
from datetime import datetime, timedelta
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from database import get_connection

router = APIRouter()

NOW = datetime(2026, 3, 2, 12, 0, 0)

PAGE_LABELS = {
    "/": "Дашборд",
    "/stages": "Этапы",
    "/problems": "Под риском",
    "/managers": "Менеджеры",
    "/channels": "Каналы",
    "/analytics": "Аналитика",
}


class EventIn(BaseModel):
    event_name: str
    page: Optional[str] = None
    session_id: Optional[str] = None
    properties: Optional[dict] = {}


@router.post("/event")
def track_event(event: EventIn):
    conn = get_connection()
    conn.execute(
        "INSERT INTO analytics_events (event_name, page, session_id, properties, created_at) VALUES (?, ?, ?, ?, ?)",
        (
            event.event_name,
            event.page,
            event.session_id,
            json.dumps(event.properties or {}),
            NOW.strftime("%Y-%m-%d %H:%M:%S"),
        ),
    )
    conn.commit()
    conn.close()
    return {"ok": True}


@router.get("/summary")
def get_summary():
    conn = get_connection()

    def date_str(d: datetime) -> str:
        return d.strftime("%Y-%m-%d %H:%M:%S")

    today_start = date_str(NOW.replace(hour=0, minute=0, second=0))
    week_start = date_str(NOW - timedelta(days=7))
    month_start = date_str(NOW - timedelta(days=30))

    # --- Session counts ---
    def count_sessions(since: str) -> int:
        return conn.execute(
            "SELECT COUNT(DISTINCT session_id) FROM analytics_events WHERE event_name='session_start' AND created_at >= ?",
            (since,),
        ).fetchone()[0] or 0

    sessions_today = count_sessions(today_start)
    sessions_7d = count_sessions(week_start)
    sessions_30d = count_sessions(month_start)

    # --- Daily sessions for the last 30 days ---
    daily_rows = conn.execute(
        """
        SELECT substr(created_at, 1, 10) as day, COUNT(DISTINCT session_id) as cnt
        FROM analytics_events
        WHERE event_name = 'session_start' AND created_at >= ?
        GROUP BY day ORDER BY day
        """,
        (month_start,),
    ).fetchall()
    daily_sessions = [{"date": r["day"], "sessions": r["cnt"]} for r in daily_rows]

    # --- Page stats: views + avg time ---
    view_rows = conn.execute(
        """
        SELECT page, COUNT(*) as views
        FROM analytics_events
        WHERE event_name = 'page_view' AND created_at >= ? AND page IS NOT NULL
        GROUP BY page ORDER BY views DESC
        """,
        (month_start,),
    ).fetchall()

    time_rows = conn.execute(
        """
        SELECT page,
               ROUND(AVG(CAST(json_extract(properties, '$.time_spent_seconds') AS REAL)), 0) as avg_seconds,
               ROUND(MAX(CAST(json_extract(properties, '$.time_spent_seconds') AS REAL)), 0) as max_seconds
        FROM analytics_events
        WHERE event_name = 'page_leave' AND created_at >= ? AND page IS NOT NULL
        GROUP BY page
        """,
        (month_start,),
    ).fetchall()
    time_map = {r["page"]: {"avg": int(r["avg_seconds"] or 0), "max": int(r["max_seconds"] or 0)} for r in time_rows}

    page_stats = []
    for r in view_rows:
        page = r["page"]
        t = time_map.get(page, {"avg": 0, "max": 0})
        page_stats.append({
            "page": page,
            "label": PAGE_LABELS.get(page, page),
            "views": r["views"],
            "avg_time_seconds": t["avg"],
        })

    # --- Period filter usage ---
    period_rows = conn.execute(
        """
        SELECT json_extract(properties, '$.period') as period, COUNT(*) as cnt
        FROM analytics_events
        WHERE event_name = 'period_changed' AND created_at >= ?
        GROUP BY period
        """,
        (month_start,),
    ).fetchall()
    period_usage = {r["period"]: r["cnt"] for r in period_rows if r["period"]}

    # --- Filter usage on problem deals page ---
    filter_rows = conn.execute(
        """
        SELECT json_extract(properties, '$.filter') as filter_name, COUNT(*) as cnt
        FROM analytics_events
        WHERE event_name = 'filter_applied' AND created_at >= ?
        GROUP BY filter_name ORDER BY cnt DESC
        """,
        (month_start,),
    ).fetchall()
    filter_usage = [{"filter": r["filter_name"], "count": r["cnt"]} for r in filter_rows if r["filter_name"]]

    # --- Total page views and avg session duration ---
    total_views = sum(p["views"] for p in page_stats)

    avg_session_duration = conn.execute(
        """
        SELECT ROUND(AVG(session_seconds), 0) as avg_dur
        FROM (
            SELECT session_id,
                   SUM(CAST(json_extract(properties, '$.time_spent_seconds') AS REAL)) as session_seconds
            FROM analytics_events
            WHERE event_name = 'page_leave' AND created_at >= ?
            GROUP BY session_id
        )
        """,
        (month_start,),
    ).fetchone()["avg_dur"] or 0

    conn.close()

    return {
        "sessions_today": sessions_today,
        "sessions_7d": sessions_7d,
        "sessions_30d": sessions_30d,
        "total_page_views_30d": total_views,
        "avg_session_duration_seconds": int(avg_session_duration),
        "daily_sessions": daily_sessions,
        "page_stats": page_stats,
        "period_usage": period_usage,
        "filter_usage": filter_usage,
    }
