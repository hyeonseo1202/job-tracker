from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from database import get_db
from models import CrawlPreferences, Job, PublicCareerSite

router = APIRouter(prefix="/api/preferences", tags=["preferences"])


class PreferencesData(BaseModel):
    job_types: Optional[list] = None
    locations: Optional[list] = None
    categories: Optional[list] = None
    keywords: Optional[list] = None
    company_sizes: Optional[list] = None
    auto_crawl_enabled: Optional[bool] = None


class StatusUpdate(BaseModel):
    status: str
    memo: Optional[str] = None
    applied_at: Optional[datetime] = None


@router.get("/")
async def get_preferences(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CrawlPreferences).limit(1))
    pref = result.scalar_one_or_none()
    if not pref:
        return {
            "job_types": ["신입", "인턴", "채용연계형 인턴"],
            "locations": ["서울", "경기"],
            "categories": [],
            "keywords": [],
            "company_sizes": ["대기업", "공기업", "중견기업"],
            "auto_crawl_enabled": True,
        }
    return {
        "job_types": pref.job_types or [],
        "locations": pref.locations or [],
        "categories": pref.categories or [],
        "keywords": pref.keywords or [],
        "company_sizes": pref.company_sizes or [],
        "auto_crawl_enabled": pref.auto_crawl_enabled,
    }


@router.post("/")
async def save_preferences(data: PreferencesData, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CrawlPreferences).limit(1))
    pref = result.scalar_one_or_none()
    if not pref:
        pref = CrawlPreferences()
        db.add(pref)
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(pref, k, v)
    await db.commit()
    return {"ok": True}


@router.put("/jobs/{job_id}/status")
async def update_job_status(job_id: int, data: StatusUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        from fastapi import HTTPException
        raise HTTPException(404)
    job.status = data.status
    if data.memo is not None:
        job.memo = data.memo
    if data.applied_at:
        job.applied_at = data.applied_at
    elif data.status == "지원 완" and not job.applied_at:
        job.applied_at = datetime.utcnow()
    await db.commit()
    return {"ok": True}


@router.get("/career-sites")
async def list_career_sites(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PublicCareerSite).where(PublicCareerSite.is_active == True))
    sites = result.scalars().all()
    return [{"id": s.id, "name": s.name, "url": s.url, "last_crawled": str(s.last_crawled) if s.last_crawled else None}
            for s in sites]


@router.post("/career-sites")
async def add_career_site(name: str, url: str, selector: str = "", db: AsyncSession = Depends(get_db)):
    site = PublicCareerSite(name=name, url=url, selector=selector)
    db.add(site)
    await db.commit()
    return {"ok": True}
