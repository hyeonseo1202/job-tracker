from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import Company, NewsCache, Job, CoverLetter
from scrapers.job_scraper import fetch_company_news
from datetime import datetime
from sqlalchemy import and_

router = APIRouter(prefix="/api/companies", tags=["companies"])


class CompanyCreate(BaseModel):
    name: str
    category: Optional[str] = None
    talent_profile: Optional[str] = None
    cover_letter_tips: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None


class CompanyUpdate(BaseModel):
    category: Optional[str] = None
    talent_profile: Optional[str] = None
    cover_letter_tips: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None


@router.get("/")
async def list_companies(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Company).order_by(Company.name))
    return [
        {"id": c.id, "name": c.name, "category": c.category, "logo_url": c.logo_url}
        for c in result.scalars().all()
    ]


@router.get("/{company_id}")
async def get_company(company_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(404, "기업을 찾을 수 없습니다.")
    return {
        "id": company.id,
        "name": company.name,
        "category": company.category,
        "talent_profile": company.talent_profile,
        "cover_letter_tips": company.cover_letter_tips,
        "logo_url": company.logo_url,
        "website": company.website,
    }


@router.post("/")
async def create_company(data: CompanyCreate, db: AsyncSession = Depends(get_db)):
    company = Company(**data.model_dump())
    db.add(company)
    await db.commit()
    await db.refresh(company)
    return {"id": company.id}


@router.put("/{company_id}")
async def update_company(company_id: int, data: CompanyUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(404)
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(company, k, v)
    await db.commit()
    return {"ok": True}


@router.get("/{company_id}/jobs")
async def get_company_jobs(company_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Job).where(and_(Job.company_id == company_id, Job.is_active == True))
        .order_by(Job.created_at.desc())
    )
    jobs = result.scalars().all()
    return [
        {
            "id": j.id, "title": j.title, "job_type": j.job_type,
            "department": j.department, "deadline": str(j.deadline) if j.deadline else None,
            "status": j.status, "url": j.url,
        }
        for j in jobs
    ]


@router.get("/{company_id}/cover-letters")
async def get_company_cover_letters(company_id: int, db: AsyncSession = Depends(get_db)):
    """해당 기업 공고들에 작성된 모든 자기소개서"""
    jobs_res = await db.execute(select(Job.id).where(Job.company_id == company_id))
    job_ids = [r[0] for r in jobs_res.all()]
    if not job_ids:
        return []

    cls_res = await db.execute(
        select(CoverLetter, Job.title)
        .join(Job, CoverLetter.job_id == Job.id)
        .where(CoverLetter.job_id.in_(job_ids))
        .order_by(CoverLetter.updated_at.desc())
    )
    rows = cls_res.all()
    return [
        {
            "id": cl.id, "job_id": cl.job_id, "job_title": title,
            "question": cl.question, "answer": cl.answer,
            "char_limit": cl.char_limit, "is_draft": cl.is_draft,
            "updated_at": str(cl.updated_at),
        }
        for cl, title in rows
    ]


@router.get("/{company_id}/news")
async def get_company_news(company_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(404)

    # 캐시 확인 (6시간 이내)
    from sqlalchemy import and_
    cache_result = await db.execute(
        select(NewsCache).where(
            and_(
                NewsCache.company_name == company.name,
                NewsCache.cached_at > datetime.utcnow().replace(hour=datetime.utcnow().hour - 6)
            )
        ).order_by(NewsCache.published_at.desc()).limit(5)
    )
    cached = cache_result.scalars().all()
    if cached:
        return [{"title": n.title, "url": n.url, "published_at": str(n.published_at), "source": n.source, "summary": n.summary} for n in cached]

    # 새로 수집
    news = await fetch_company_news(company.name)
    for item in news:
        nc = NewsCache(
            company_name=company.name,
            title=item["title"],
            url=item["url"],
            published_at=item.get("published_at"),
            summary=item.get("summary", ""),
            source=item.get("source", ""),
        )
        db.add(nc)
    await db.commit()
    return news
