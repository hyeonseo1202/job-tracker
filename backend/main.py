from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from database import init_db, AsyncSessionLocal
from routers import jobs, companies, user, ai, crawl, preferences
from routers.crawl import _do_crawl


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()

    # APScheduler: 매일 오전 8시 자동 크롤링
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.cron import CronTrigger

        async def scheduled_crawl():
            async with AsyncSessionLocal() as db:
                await _do_crawl("all", db)

        scheduler = AsyncIOScheduler()
        scheduler.add_job(scheduled_crawl, CronTrigger(hour=8, minute=0))
        scheduler.start()
        app.state.scheduler = scheduler
    except ImportError:
        pass  # apscheduler not installed

    yield

    if hasattr(app.state, "scheduler"):
        app.state.scheduler.shutdown(wait=False)


app = FastAPI(title="Job Tracker API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router)
app.include_router(companies.router)
app.include_router(user.router)
app.include_router(ai.router)
app.include_router(crawl.router)
app.include_router(preferences.router)


@app.get("/")
async def root():
    return {"status": "ok", "message": "Job Tracker API"}
