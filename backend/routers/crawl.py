from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from database import get_db
from models import Job, Company
from scrapers.crawlers import crawl_jasoseol, crawl_inthiswork

router = APIRouter(prefix="/api/crawl", tags=["crawl"])

# 크롤링 상태 추적
crawl_status = {"running": False, "last_run": None, "last_result": None}


@router.post("/jasoseol")
async def run_jasoseol_crawl(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """자소설닷컴 공고 크롤링"""
    if crawl_status["running"]:
        return {"message": "이미 크롤링 중입니다."}
    background_tasks.add_task(_do_crawl, "jasoseol", db)
    return {"message": "자소설닷컴 크롤링 시작"}


@router.post("/inthiswork")
async def run_inthiswork_crawl(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """INTHISWORK 공고 크롤링"""
    if crawl_status["running"]:
        return {"message": "이미 크롤링 중입니다."}
    background_tasks.add_task(_do_crawl, "inthiswork", db)
    return {"message": "INTHISWORK 크롤링 시작"}


@router.post("/all")
async def run_all_crawl(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """전체 사이트 크롤링"""
    background_tasks.add_task(_do_crawl, "all", db)
    return {"message": "전체 크롤링 시작 (백그라운드)"}


@router.get("/status")
async def get_crawl_status():
    return crawl_status


async def _do_crawl(source: str, db: AsyncSession):
    crawl_status["running"] = True
    added = 0
    skipped = 0

    try:
        jobs_data = []
        if source in ("jasoseol", "all"):
            jobs_data += await crawl_jasoseol(limit=100)
        if source in ("inthiswork", "all"):
            jobs_data += await crawl_inthiswork(pages=3)

        for item in jobs_data:
            company_name = item.get("company_name", "").strip()
            if not company_name:
                skipped += 1
                continue

            # 기업 찾기 or 생성
            res = await db.execute(select(Company).where(Company.name == company_name))
            company = res.scalar_one_or_none()
            if not company:
                company = Company(
                    name=company_name,
                    category=_guess_category(company_name),
                    logo_url=item.get("logo_url", ""),
                )
                db.add(company)
                await db.flush()

            # 중복 공고 확인 (URL 기준)
            res = await db.execute(select(Job).where(Job.url == item["url"]))
            if res.scalar_one_or_none():
                skipped += 1
                continue

            job = Job(
                company_id=company.id,
                title=item["title"] or "채용공고",
                url=item["url"],
                deadline=item.get("deadline"),
                start_date=item.get("start_date"),
                job_type=item.get("job_type", ""),
                description=item.get("description", ""),
                cover_letter_questions=item.get("cover_letter_questions", []),
                is_active=True,
                is_scraped=True,
            )
            db.add(job)
            added += 1

        await db.commit()
        result = {"added": added, "skipped": skipped, "total": len(jobs_data)}

    except Exception as e:
        result = {"error": str(e), "added": added}
        await db.rollback()

    crawl_status["running"] = False
    crawl_status["last_run"] = datetime.now().isoformat()
    crawl_status["last_result"] = result


def _guess_category(name: str) -> str:
    public = ["공사", "공단", "공기업", "코레일", "한국전력", "도로공사", "수자원", "가스공사",
              "기업은행", "산업은행", "수출입은행", "국민건강", "근로복지"]
    big = ["삼성", "현대", "LG", "SK", "롯데", "한화", "포스코", "GS", "두산", "CJ",
           "신한", "KB", "하나", "우리", "카카오", "네이버", "쿠팡"]
    for k in public:
        if k in name:
            return "공기업"
    for k in big:
        if k in name:
            return "대기업"
    return "중견기업"
