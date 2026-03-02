from fastapi import APIRouter, Query
from database import get_connection, get_period_dates, STAGES

router = APIRouter()

PLANS = {
    "month": 120_000_000,
    "quarter": 350_000_000,
    "all": 700_000_000,
}


@router.get("")
def get_dashboard(period: str = Query("month")):
    conn = get_connection()
    start, end = get_period_dates(period)
    s = start.strftime("%Y-%m-%d %H:%M:%S")
    e = end.strftime("%Y-%m-%d %H:%M:%S")

    # --- Funnel: current active pipeline snapshot ---
    active_rows = conn.execute(
        """
        SELECT stage, COUNT(*) as cnt, SUM(amount) as total
        FROM deals
        WHERE status = 'active'
        GROUP BY stage
        """
    ).fetchall()
    active_map = {r["stage"]: {"cnt": r["cnt"], "total": r["total"] or 0} for r in active_rows}

    # Conversion rates: historical (all deals ever created)
    # conv(i → i+1) = deals that reached stage[i+1] or beyond / deals that reached stage[i] or beyond
    stage_counts = []
    for stage in STAGES:
        idx = STAGES.index(stage)
        # Count deals that are at this stage OR a later stage (including won)
        count = conn.execute(
            """
            SELECT COUNT(*) as cnt FROM deals
            WHERE (
                status = 'won'
                OR (status != 'won' AND stage IN ({}))
            )
            """.format(
                ",".join(f"'{s2}'" for s2 in STAGES[idx:])
            )
        ).fetchone()["cnt"]
        stage_counts.append(count)

    funnel = []
    for i, stage in enumerate(STAGES):
        conv = None
        if i < len(STAGES) - 1 and stage_counts[i] > 0:
            conv = round(stage_counts[i + 1] / stage_counts[i] * 100, 1)

        d = active_map.get(stage, {"cnt": 0, "total": 0})
        funnel.append(
            {
                "stage": stage,
                "deals_count": d["cnt"],
                "total_amount": d["total"],
                "conversion_to_next": conv,
            }
        )

    # --- Money summary for selected period ---
    money_rows = conn.execute(
        """
        SELECT status, COUNT(*) as cnt, SUM(amount) as total
        FROM deals
        WHERE created_at BETWEEN ? AND ?
        GROUP BY status
        """,
        (s, e),
    ).fetchall()
    money_map = {r["status"]: {"cnt": r["cnt"], "total": r["total"] or 0} for r in money_rows}

    total_active = sum(r["total"] for r in active_map.values())
    total_active_cnt = sum(r["cnt"] for r in active_map.values())

    money_summary = {
        "total_active": total_active,
        "total_active_count": total_active_cnt,
        "total_won": money_map.get("won", {}).get("total", 0),
        "total_won_count": money_map.get("won", {}).get("cnt", 0),
        "total_lost": money_map.get("lost", {}).get("total", 0),
        "total_lost_count": money_map.get("lost", {}).get("cnt", 0),
    }

    # --- Plan / Fact ---
    plan = PLANS.get(period, PLANS["month"])
    fact = money_summary["total_won"]
    plan_fact = {
        "plan": plan,
        "fact": fact,
        "percentage": round(fact / plan * 100, 1) if plan > 0 else 0,
    }

    conn.close()
    return {
        "funnel": funnel,
        "money_summary": money_summary,
        "plan_fact": plan_fact,
        "period": period,
    }
