from fastapi import APIRouter, Query
from database import get_connection
from typing import Optional
from datetime import datetime

router = APIRouter()

NOW = datetime(2026, 3, 2, 12, 0, 0)


def row_to_deal(r):
    last_act = datetime.strptime(r["last_activity_at"], "%Y-%m-%d %H:%M:%S")
    days_stale = (NOW - last_act).days
    reasons = []
    if days_stale >= 7:
        reasons.append(f"Нет активности {days_stale} дн.")
    if not r["has_next_step"]:
        reasons.append("Нет next step")
    if r["is_important"]:
        reasons.append("Важный клиент")
    if r["amount"] >= 10_000_000:
        reasons.append("Крупная сделка")

    return {
        "id": r["id"],
        "client_name": r["client_name"],
        "stage": r["stage"],
        "amount": r["amount"],
        "status": r["status"],
        "manager_name": r["manager_name"],
        "manager_id": r["manager_id"],
        "channel": r["channel"],
        "last_activity_at": r["last_activity_at"],
        "days_stale": days_stale,
        "has_next_step": bool(r["has_next_step"]),
        "is_important": bool(r["is_important"]),
        "risk_reasons": reasons,
    }


@router.get("/problems")
def get_problem_deals(
    min_days_stale: int = Query(7),
    manager_id: Optional[int] = Query(None),
    stage: Optional[str] = Query(None),
    channel: Optional[str] = Query(None),
    sort_by: str = Query("amount"),  # amount | last_activity
):
    conn = get_connection()

    conditions = ["status = 'active'"]
    params = []

    # Problem = stale OR no next step OR important
    problem_cond = f"(julianday('2026-03-02') - julianday(last_activity_at) >= {min_days_stale} OR has_next_step = 0)"
    conditions.append(f"({problem_cond})")

    if manager_id is not None:
        conditions.append("manager_id = ?")
        params.append(manager_id)
    if stage:
        conditions.append("stage = ?")
        params.append(stage)
    if channel:
        conditions.append("channel = ?")
        params.append(channel)

    where = " AND ".join(conditions)
    order = "amount DESC" if sort_by == "amount" else "last_activity_at ASC"

    rows = conn.execute(
        f"SELECT * FROM deals WHERE {where} ORDER BY {order}",
        params,
    ).fetchall()

    deals = [row_to_deal(r) for r in rows]
    total_amount = sum(d["amount"] for d in deals)
    conn.close()

    return {
        "deals": deals,
        "total_count": len(deals),
        "total_amount": total_amount,
    }


@router.get("")
def get_deals(
    status: Optional[str] = Query(None),
    stage: Optional[str] = Query(None),
    manager_id: Optional[int] = Query(None),
    channel: Optional[str] = Query(None),
    sort_by: str = Query("amount"),
):
    conn = get_connection()

    conditions = []
    params = []

    if status:
        conditions.append("status = ?")
        params.append(status)
    if stage:
        conditions.append("stage = ?")
        params.append(stage)
    if manager_id is not None:
        conditions.append("manager_id = ?")
        params.append(manager_id)
    if channel:
        conditions.append("channel = ?")
        params.append(channel)

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    order = "amount DESC" if sort_by == "amount" else "last_activity_at ASC"

    rows = conn.execute(
        f"SELECT * FROM deals {where} ORDER BY {order} LIMIT 200",
        params,
    ).fetchall()

    deals = [row_to_deal(r) for r in rows]
    conn.close()
    return {"deals": deals, "total_count": len(deals)}


@router.get("/managers")
def get_managers_stats(period: str = Query("month")):
    from database import get_period_dates

    conn = get_connection()
    start, end = get_period_dates(period)
    s = start.strftime("%Y-%m-%d %H:%M:%S")
    e = end.strftime("%Y-%m-%d %H:%M:%S")

    rows = conn.execute(
        """
        SELECT
            manager_id,
            manager_name,
            COUNT(*) as total_deals,
            SUM(CASE WHEN status='won' THEN 1 ELSE 0 END) as won_count,
            SUM(CASE WHEN status='won' THEN amount ELSE 0 END) as won_amount,
            SUM(CASE WHEN status='lost' THEN 1 ELSE 0 END) as lost_count,
            SUM(CASE WHEN status='lost' THEN amount ELSE 0 END) as lost_amount,
            SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active_count,
            SUM(CASE WHEN status='active' THEN amount ELSE 0 END) as active_amount,
            ROUND(
                100.0 * SUM(CASE WHEN status='won' THEN 1 ELSE 0 END) /
                NULLIF(COUNT(*), 0), 1
            ) as conversion_pct,
            ROUND(
                AVG(
                    CASE WHEN status='active'
                    THEN julianday('2026-03-02') - julianday(last_activity_at)
                    END
                ), 1
            ) as avg_stale_days
        FROM deals
        WHERE created_at BETWEEN ? AND ?
        GROUP BY manager_id, manager_name
        ORDER BY won_amount DESC
        """,
        (s, e),
    ).fetchall()

    conn.close()
    return {
        "managers": [
            {
                "manager_id": r["manager_id"],
                "manager_name": r["manager_name"],
                "total_deals": r["total_deals"],
                "won_count": r["won_count"],
                "won_amount": r["won_amount"] or 0,
                "lost_count": r["lost_count"],
                "lost_amount": r["lost_amount"] or 0,
                "active_count": r["active_count"],
                "active_amount": r["active_amount"] or 0,
                "conversion_pct": r["conversion_pct"] or 0,
                "avg_stale_days": r["avg_stale_days"] or 0,
            }
            for r in rows
        ],
        "period": period,
    }


@router.get("/channels")
def get_channels_stats(period: str = Query("month")):
    from database import get_period_dates

    conn = get_connection()
    start, end = get_period_dates(period)
    s = start.strftime("%Y-%m-%d %H:%M:%S")
    e = end.strftime("%Y-%m-%d %H:%M:%S")

    rows = conn.execute(
        """
        SELECT
            channel,
            COUNT(*) as total_leads,
            SUM(CASE WHEN status='won' THEN 1 ELSE 0 END) as won_count,
            SUM(CASE WHEN status='won' THEN amount ELSE 0 END) as won_amount,
            SUM(CASE WHEN status='lost' THEN 1 ELSE 0 END) as lost_count,
            SUM(CASE WHEN status='lost' THEN amount ELSE 0 END) as lost_amount,
            ROUND(
                100.0 * SUM(CASE WHEN status='won' THEN 1 ELSE 0 END) /
                NULLIF(COUNT(*), 0), 1
            ) as conversion_pct,
            ROUND(
                AVG(CASE WHEN status='won' THEN amount END), 0
            ) as avg_deal_amount
        FROM deals
        WHERE created_at BETWEEN ? AND ?
        GROUP BY channel
        ORDER BY won_amount DESC
        """,
        (s, e),
    ).fetchall()

    conn.close()
    return {
        "channels": [
            {
                "channel": r["channel"],
                "total_leads": r["total_leads"],
                "won_count": r["won_count"],
                "won_amount": r["won_amount"] or 0,
                "lost_count": r["lost_count"],
                "lost_amount": r["lost_amount"] or 0,
                "conversion_pct": r["conversion_pct"] or 0,
                "avg_deal_amount": r["avg_deal_amount"] or 0,
            }
            for r in rows
        ],
        "period": period,
    }
