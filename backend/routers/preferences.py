from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from database import get_db
from models import CrawlPreferences, Job, Company, PublicCareerSite

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
    # 설정 저장 즉시 기존 공고 필터 적용
    deleted = await _apply_filter(db, pref)
    return {"ok": True, "deleted": deleted}


@router.post("/apply-filter")
async def apply_filter(db: AsyncSession = Depends(get_db)):
    """현재 설정 기준으로 맞지 않는 크롤링 공고 삭제"""
    result = await db.execute(select(CrawlPreferences).limit(1))
    pref = result.scalar_one_or_none()
    deleted = await _apply_filter(db, pref)
    return {"deleted": deleted}


async def _apply_filter(db: AsyncSession, pref: CrawlPreferences) -> int:
    """
    is_scraped=True인 공고만 대상으로 선호도 필터 적용.
    수동 추가 공고(is_scraped=False)는 건드리지 않음.
    """
    if not pref:
        return 0

    allowed_job_types = pref.job_types or []
    allowed_company_sizes = pref.company_sizes or []
    allowed_keywords = pref.keywords or []

    # 필터가 하나도 설정 안 된 경우 삭제하지 않음
    if not allowed_job_types and not allowed_company_sizes and not allowed_keywords:
        return 0

    jobs_res = await db.execute(
        select(Job).options(selectinload(Job.company)).where(Job.is_scraped == True)
    )
    jobs = jobs_res.scalars().all()

    deleted = 0
    for job in jobs:
        remove = False

        # 직무 유형 필터
        if allowed_job_types:
            job_type = job.job_type or ""
            if not any(t in job_type for t in allowed_job_types):
                remove = True

        # 기업 규모 필터
        if not remove and allowed_company_sizes:
            category = job.company.category if job.company else ""
            if category not in allowed_company_sizes:
                remove = True

        # 키워드 필터 (설정된 경우 하나라도 포함돼야 통과)
        if not remove and allowed_keywords:
            text = (job.title or "") + " " + (job.description or "")
            if not any(kw.lower() in text.lower() for kw in allowed_keywords):
                remove = True

        if remove:
            await db.delete(job)
            deleted += 1

    if deleted:
        await db.commit()
    return deleted


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
