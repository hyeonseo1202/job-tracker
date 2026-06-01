from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import Company, NewsCache
from scrapers.job_scraper import fetch_company_news
from datetime import datetime

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
