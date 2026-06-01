from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from database import get_db
from models import Job, Company, CrawlPreferences
from scrapers.crawlers import crawl_jasoseol, crawl_inthiswork, crawl_public_sites, crawl_linkedin

router = APIRouter(prefix="/api/crawl", tags=["crawl"])

# 크롤링 상태 추적
crawl_status = {
    "running": False,
    "last_run": None,
    "last_result": None,
    "progress": {"source": "", "step": "", "count": 0},
}


@router.post("/all")
async def run_all_crawl(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """전체 사이트 크롤링 (자소설닷컴 + INTHISWORK + LinkedIn + 공기업 자체 사이트)"""
    if crawl_status["running"]:
        return {"message": "이미 크롤링 중입니다."}
    background_tasks.add_task(_do_crawl, "all", db)
    return {"message": "전체 크롤링 시작 (백그라운드)"}


# 하위 호환: 개별 소스 엔드포인트도 유지
@router.post("/jasoseol")
async def run_jasoseol_crawl(background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    if crawl_status["running"]:
        return {"message": "이미 크롤링 중입니다."}
    background_tasks.add_task(_do_crawl, "all", db)
    return {"message": "크롤링 시작"}


@router.post("/inthiswork")
async def run_inthiswork_crawl(background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    if crawl_status["running"]:
        return {"message": "이미 크롤링 중입니다."}
    background_tasks.add_task(_do_crawl, "all", db)
    return {"message": "크롤링 시작"}


@router.get("/status")
async def get_crawl_status():
    return crawl_status


async def _do_crawl(source: str, db: AsyncSession):
    crawl_status["running"] = True
    crawl_status["progress"] = {"source": "", "step": "준비 중...", "count": 0}
    added = 0
    skipped = 0

    try:
        # 선호도 로드
        pref_res = await db.execute(select(CrawlPreferences).limit(1))
        pref = pref_res.scalar_one_or_none()
        allowed_job_types = pref.job_types if pref and pref.job_types else []
        allowed_keywords = pref.keywords if pref and pref.keywords else []

        jobs_data = []

        if source in ("jasoseol", "all"):
            crawl_status["progress"] = {"source": "자소설닷컴", "step": "수집 중...", "count": 0}
            new = await crawl_jasoseol(limit=100)
            crawl_status["progress"]["count"] = len(new)
            jobs_data += new

        if source in ("inthiswork", "all"):
            crawl_status["progress"] = {"source": "INTHISWORK", "step": "수집 중...", "count": 0}
            new = await crawl_inthiswork(pages=3)
            crawl_status["progress"]["count"] = len(new)
            jobs_data += new

        if source in ("linkedin", "all"):
            crawl_status["progress"] = {"source": "LinkedIn", "step": "수집 중...", "count": 0}
            new = await crawl_linkedin(limit=40)
            crawl_status["progress"]["count"] = len(new)
            jobs_data += new

        if source in ("public", "all"):
            crawl_status["progress"] = {"source": "공기업 사이트", "step": "수집 중...", "count": 0}
            new = await crawl_public_sites(db)
            crawl_status["progress"]["count"] = len(new)
            jobs_data += new

        crawl_status["progress"] = {"source": "", "step": "필터 적용 중...", "count": len(jobs_data)}

        for item in jobs_data:
            company_name = item.get("company_name", "").strip()
            if not company_name:
                skipped += 1
                continue

            # 직무 유형 필터 (선호도 설정 시 적용)
            if allowed_job_types:
                item_type = item.get("job_type", "")
                if not any(t in item_type for t in allowed_job_types):
                    skipped += 1
                    continue

            # 키워드 필터 (설정 시 적용)
            if allowed_keywords:
                text = (item.get("title", "") + " " + item.get("description", "")).lower()
                if not any(kw.lower() in text for kw in allowed_keywords):
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
                location=item.get("location", ""),
                description=item.get("description", ""),
                cover_letter_questions=item.get("cover_letter_questions", []),
                is_active=True,
                is_scraped=True,
            )
            db.add(job)
            added += 1

        await db.commit()

        # 크롤링 후 설정 필터 자동 적용
        from routers.preferences import _apply_filter
        deleted = await _apply_filter(db, pref)

        result = {"added": added, "skipped": skipped, "total": len(jobs_data), "filtered": deleted}

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
