import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from database import init_db, get_connection
from routers import dashboard, stages, deals, analytics

app = FastAPI(
    title="Клари API",
    version="1.0.0",
    description="CRM-аналитика для CEO агентства недвижимости",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    init_db()


app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(stages.router, prefix="/api/stages", tags=["Stages"])
app.include_router(deals.router, prefix="/api/deals", tags=["Deals"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "Клари API v1.0"}


@app.get("/api/meta/managers")
def get_managers():
    conn = get_connection()
    rows = conn.execute(
        "SELECT DISTINCT manager_id, manager_name FROM deals ORDER BY manager_name"
    ).fetchall()
    conn.close()
    return [{"id": r["manager_id"], "name": r["manager_name"]} for r in rows]


@app.get("/api/meta/channels")
def get_channels():
    conn = get_connection()
    rows = conn.execute(
        "SELECT DISTINCT channel FROM deals ORDER BY channel"
    ).fetchall()
    conn.close()
    return [r["channel"] for r in rows]


# --- Serve built React frontend (production) ---
# Run `npm run build` in /frontend first, then this serves the dist/ folder.
_DIST = os.path.join(os.path.dirname(__file__), "../frontend/dist")
if os.path.exists(_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        return FileResponse(os.path.join(_DIST, "index.html"))
