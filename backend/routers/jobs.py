from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from database import get_db
from models import Job, Company
from scrapers.job_scraper import scrape_job_url

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


class JobCreate(BaseModel):
    url: str
    title: Optional[str] = None
    company_name: Optional[str] = None
    deadline: Optional[datetime] = None
    department: Optional[str] = None
    job_type: Optional[str] = None


class JobUpdate(BaseModel):
    title: Optional[str] = None
    deadline: Optional[datetime] = None
    department: Optional[str] = None
    job_type: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    preferred: Optional[str] = None
    cover_letter_questions: Optional[list] = None
    is_active: Optional[bool] = None


@router.get("/")
async def list_jobs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Job).options(selectinload(Job.company)).where(Job.is_active == True).order_by(Job.deadline)
    )
    jobs = result.scalars().all()
    return [_job_to_dict(j) for j in jobs]


@router.get("/calendar")
async def calendar_jobs(db: AsyncSession = Depends(get_db)):
    """캘린더용 이벤트 목록 반환"""
    result = await db.execute(
        select(Job).options(selectinload(Job.company)).where(Job.is_active == True)
    )
    jobs = result.scalars().all()
    events = []
    for j in jobs:
        if j.deadline:
            events.append({
                "id": j.id,
                "title": f"[{j.company.name if j.company else ''}] {j.title}",
                "end": j.deadline.isoformat(),
                "start": j.start_date.isoformat() if j.start_date else j.deadline.isoformat(),
                "company": j.company.name if j.company else "",
                "job_type": j.job_type,
                "color": _category_color(j.company.category if j.company else ""),
            })
    return events


@router.get("/{job_id}")
async def get_job(job_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Job).options(selectinload(Job.company), selectinload(Job.cover_letters))
        .where(Job.id == job_id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "공고를 찾을 수 없습니다.")
    return _job_to_dict(job, detail=True)


@router.post("/")
async def create_job(data: JobCreate, db: AsyncSession = Depends(get_db)):
    # URL 스크래핑
    scraped = await scrape_job_url(data.url)

    # 회사 찾기 또는 생성
    company_name = data.company_name or scraped.get("company_name", "")
    company = None
    if company_name:
        res = await db.execute(select(Company).where(Company.name == company_name))
        company = res.scalar_one_or_none()
        if not company:
            company = Company(name=company_name)
            db.add(company)
            await db.flush()

    job = Job(
        company_id=company.id if company else None,
        title=data.title or scraped.get("title", "제목 없음"),
        url=data.url,
        deadline=data.deadline,
        department=data.department,
        job_type=data.job_type,
        description=scraped.get("description", ""),
        cover_letter_questions=scraped.get("cover_letter_questions", []),
        is_scraped=True,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return {"id": job.id, "scraped": scraped}


@router.put("/{job_id}")
async def update_job(job_id: int, data: JobUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "공고를 찾을 수 없습니다.")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(job, k, v)
    await db.commit()
    return {"ok": True}


@router.delete("/{job_id}")
async def delete_job(job_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404)
    job.is_active = False
    await db.commit()
    return {"ok": True}


@router.post("/{job_id}/rescrape")
async def rescrape_job(job_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404)
    scraped = await scrape_job_url(job.url)
    job.description = scraped.get("description", job.description)
    job.cover_letter_questions = scraped.get("cover_letter_questions", job.cover_letter_questions)
    await db.commit()
    return scraped


def _job_to_dict(job: Job, detail: bool = False) -> dict:
    d = {
        "id": job.id,
        "title": job.title,
        "url": job.url,
        "department": job.department,
        "job_type": job.job_type,
        "location": job.location,
        "deadline": job.deadline.isoformat() if job.deadline else None,
        "start_date": job.start_date.isoformat() if job.start_date else None,
        "is_active": job.is_active,
        "company": {
            "id": job.company.id,
            "name": job.company.name,
            "category": job.company.category,
            "logo_url": job.company.logo_url,
        } if job.company else None,
    }
    if detail:
        d["description"] = job.description
        d["requirements"] = job.requirements
        d["preferred"] = job.preferred
        d["cover_letter_questions"] = job.cover_letter_questions or []
        if hasattr(job, "cover_letters"):
            d["cover_letters"] = [
                {"id": cl.id, "question": cl.question, "answer": cl.answer, "char_limit": cl.char_limit}
                for cl in job.cover_letters
            ]
    return d


def _category_color(category: str) -> str:
    colors = {"대기업": "#a5b4fc", "공기업": "#6ee7b7", "중견기업": "#fcd34d"}
    return colors.get(category, "#cbd5e1")
