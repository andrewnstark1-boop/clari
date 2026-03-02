from fastapi import APIRouter, Query
from database import get_connection, get_period_dates, STAGES
from datetime import datetime

router = APIRouter()


@router.get("")
def get_stages(period: str = Query("month")):
    conn = get_connection()
    start, end = get_period_dates(period)
    s = start.strftime("%Y-%m-%d %H:%M:%S")
    e = end.strftime("%Y-%m-%d %H:%M:%S")

    result = []

    for i, stage in enumerate(STAGES):
        # Active deals at this stage (all time — current pipeline)
        active = conn.execute(
            "SELECT COUNT(*) as cnt, SUM(amount) as total FROM deals WHERE status='active' AND stage=?",
            (stage,),
        ).fetchone()

        # Won/lost in period that were at THIS stage when they exited
        won = conn.execute(
            "SELECT COUNT(*) as cnt, SUM(amount) as total FROM deals WHERE status='won' AND stage=? AND created_at BETWEEN ? AND ?",
            (stage, s, e),
        ).fetchone()
        lost = conn.execute(
            "SELECT COUNT(*) as cnt, SUM(amount) as total FROM deals WHERE status='lost' AND stage=? AND created_at BETWEEN ? AND ?",
            (stage, s, e),
        ).fetchone()

        # Average days active deals have been sitting in this stage
        active_deals = conn.execute(
            "SELECT last_stage_changed_at FROM deals WHERE status='active' AND stage=?",
            (stage,),
        ).fetchall()

        avg_days = 0.0
        if active_deals:
            now = datetime(2026, 3, 2, 12, 0, 0)
            deltas = []
            for row in active_deals:
                try:
                    changed = datetime.strptime(row["last_stage_changed_at"], "%Y-%m-%d %H:%M:%S")
                    deltas.append((now - changed).days)
                except Exception:
                    pass
            avg_days = round(sum(deltas) / len(deltas), 1) if deltas else 0.0

        # Conversion to next stage (historical, all time)
        conv_to_next = None
        if i < len(STAGES) - 1:
            # Deals that reached this stage (= all deals with stage >= i, including won)
            at_stage = conn.execute(
                "SELECT COUNT(*) as cnt FROM deals WHERE stage IN ({})".format(
                    ",".join(f"'{s2}'" for s2 in STAGES[i:])
                )
            ).fetchone()["cnt"]
            at_next = conn.execute(
                "SELECT COUNT(*) as cnt FROM deals WHERE stage IN ({})".format(
                    ",".join(f"'{s2}'" for s2 in STAGES[i + 1:])
                )
            ).fetchone()["cnt"]
            if at_stage > 0:
                conv_to_next = round(at_next / at_stage * 100, 1)

        lost_revenue = lost["total"] or 0

        result.append(
            {
                "stage": stage,
                "active_count": active["cnt"] or 0,
                "active_amount": active["total"] or 0,
                "won_count": won["cnt"] or 0,
                "won_amount": won["total"] or 0,
                "lost_count": lost["cnt"] or 0,
                "lost_amount": lost_revenue,
                "lost_revenue": lost_revenue,
                "conversion_to_next": conv_to_next,
                "avg_days_in_stage": avg_days,
            }
        )

    # Sort by lost_revenue descending (so worst bottlenecks are first)
    result.sort(key=lambda x: x["lost_revenue"], reverse=True)

    conn.close()
    return {"stages": result, "period": period}
