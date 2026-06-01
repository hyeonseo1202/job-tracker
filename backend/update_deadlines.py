"""노션에서 확인한 마감일 데이터를 업데이트하는 스크립트"""
import asyncio
from datetime import datetime
from sqlalchemy import select
from database import init_db, AsyncSessionLocal
from models import Job, Company

# 노션 화면에서 확인한 마감일 데이터
# 형식: (기업명 일부, 마감일)
DEADLINES = [
    ("IPP",       "2026-02-02"),
    ("코레일",    "2026-03-12"),
    ("삼성전자",  "2026-03-17"),
    ("NH투자증권","2026-03-20"),
    ("한화시스템","2026-03-25"),
    ("한화에어로","2026-03-30"),
    ("롯데캐피탈","2026-03-30"),
    ("한화오션",  "2026-03-31"),
    ("신한은행",  "2026-04-03"),
    ("현대자동차","2026-04-03"),   # 신입
    ("한국투자증권","2026-04-22"),
    ("한국선급",  "2026-04-23"),
    ("케이뱅크",  "2026-04-24"),
    ("IBK",       "2026-05-13"),
    ("안랩",      "2026-05-25"),
    ("대한항공",  "2026-05-26"),
    ("영커리언스","2026-05-31"),
    ("손해보험협회","2026-06-07"),
    ("에코마케팅","2026-06-07"),
    ("이스트소프트","2026-06-09"),
    ("플렉스팀",  "2026-06-09T15:00:00"),  # 오후 3시
]

# 지원 상태
STATUS_MAP = {
    "IPP":       "서류 합격 → 면접",
    "코레일":    "서류 합격 → 필기",
    "삼성전자":  "서류탈",
    "NH투자증권":"서류탈",
    "한화시스템":"서류탈",
    "한화에어로":"서류탈",
    "롯데캐피탈":"서류탈",
    "한화오션":  "서류탈",
    "신한은행":  "서류탈",
    "한국투자증권":"서류탈",
    "한국선급":  "서류 합격 → 필기",
    "케이뱅크":  "서류탈",
    "IBK":       "지원 완",
    "안랩":      "지원 완",
    "영커리언스":"인턴",
    "에코마케팅":"인턴",
    "이스트소프트":"인턴",
    "플렉스팀":  "비어 있음",
}


async def update():
    await init_db()
    async with AsyncSessionLocal() as db:
        updated = 0
        for keyword, deadline_str in DEADLINES:
            # 기업명으로 검색
            res = await db.execute(
                select(Job).join(Company).where(Company.name.contains(keyword))
            )
            jobs = res.scalars().all()
            if not jobs:
                print(f"  ⚠️ '{keyword}' 공고 없음")
                continue

            # 마감일 파싱
            try:
                if "T" in deadline_str:
                    dl = datetime.fromisoformat(deadline_str)
                else:
                    dl = datetime.strptime(deadline_str, "%Y-%m-%d").replace(hour=23, minute=59)
            except ValueError:
                print(f"  ⚠️ '{keyword}' 날짜 파싱 실패: {deadline_str}")
                continue

            for job in jobs:
                job.deadline = dl
                # 지원 상태를 description에 추가
                for k, status in STATUS_MAP.items():
                    if k in keyword or keyword in k:
                        if not job.description:
                            job.description = f"[지원 상태] {status}"
                        break
                updated += 1
                print(f"  ✅ {keyword} → {dl.strftime('%Y-%m-%d %H:%M')}")

        await db.commit()
        print(f"\n총 {updated}개 공고 마감일 업데이트 완료!")


if __name__ == "__main__":
    asyncio.run(update())
