"""노션 데이터를 DB에 초기 적재하는 스크립트"""
import asyncio
from sqlalchemy import select
from database import init_db, AsyncSessionLocal
from models import UserProfile, Company, Job


USER_PROFILE = {
    "name": "황현서",
    "education": "동국대학교",
    "major": "정보통신공학과",
    "gpa": "",
    "certifications": [
        "SQLD (SQLD-055009491) - 2024.12.13 / 한국데이터산업진흥원",
        "Azure AI Fundamentals (wdrXE-48DB) - 2024.01.12 / Microsoft",
        "AWS Certified AI Practitioner - 2026.01.23 / AWS",
    ],
    "languages": [
        "TOEFL IBT 75/120 - 2024.08.03",
        "OPIc IH - 2025.12.07",
    ],
    "awards": [
        "한이음 ICT멘토링 공모전 입선 - 2024.12.04 / 한국정보산업연합회 | 시각장애인 키오스크 음성인식 TTS 기반 접근성 개선 시스템 개발",
        "2022 어드벤쳐디자인경진대회 우수상 - 2022.12.30 / 동국대학교 공과대학 | IoT 센서 기반 공간 밀집도 감지 및 인원 초과 경보 시스템 설계",
        "IoT 기반 지식재산 창의 아이디어 공모전 우수상 - 2024.12.31 / 동국대학교 | IoT 웨어러블 센서 활용 항만 작업자 위치·환경 위험 감지 및 긴급 대응 안전 시스템 설계",
    ],
    "activities": [
        "AI/NLP Research Assistant (2026.02 ~ 2026.08) | 뉴스 크롤링부터 요약, RAG 파이프라인 구축까지 자연어 처리 프로젝트 수행. 웹 크롤링으로 뉴스 데이터 수집, 요약 모델 활용 핵심 정보 추출, RAG 구조 적용 검색 기반 답변 생성 시스템 구현",
        "헝가리 교환학생 (2025.02 ~ 2025.08) | Károli Gáspár University 교환학생. 다양한 국적의 사람들과 교류하며 협업 방식 확장, 문화적 다양성 이해",
        "구름x카카오 풀스택 데블로퍼 부트캠프 11회차 (2024.06 ~ 2025.02) | Spring Framework 기반 백엔드 개발 역량 습득. 해커톤 참여 - 치매 예방 모바일 앱 'Memory Tree' 기획·개발",
        "AI Network 연구실 학부연구생 (2024.06 ~ 2025.01) | 이재훈 교수님 지도. AI 기반 네트워크(AI-enabled Networking) 연구. ONOS/SDN 실습, Mininet 가상 네트워크 구성, Raspberry Pi OVS VLAN 패킷 제어, 실시간 트래픽 데이터 시각화",
        "정보통신공학과 학생회 홍보국 부국장 (2022.03 ~ 2024.12) | 학과 행사 홍보 콘텐츠 제작, SNS 운영, 행사 지원 담당. 협업 리더십 경험",
        "다빈치 10기 운영진 (2023.06 ~ 2026.06) | 프로그램 운영 지원, 행사 기획 및 참여자 관리",
        "108리더스 (2024.03 ~ 2025.02) | 리더십 교육과 팀 활동, 봉사 및 기획 활동",
        "42서울 라피신 (2023.07 ~ 2023.08) | C언어 기초 없이 시작, 하루 12시간 이상 몰입 1개월 완주. 동료 평가 기반 학습으로 문제 해결 능력 향상",
    ],
    "skills": [
        "Python", "Spring Framework (Java)", "FastAPI",
        "SQL", "AWS", "Azure", "SDN/ONOS", "RAG/NLP",
        "React", "Git"
    ],
    "strengths": (
        "1. AI/NLP 실무 경험: 뉴스 크롤링부터 RAG 파이프라인까지 자연어 처리 전 과정 경험\n"
        "2. 백엔드 개발 역량: Spring Framework, FastAPI, Python 기반 서버 개발\n"
        "3. 클라우드/인프라: AWS AI Practitioner, Azure AI Fundamentals 자격증 보유\n"
        "4. 글로벌 역량: 헝가리 교환학생, OPIc IH, TOEFL 75점\n"
        "5. 끈기와 몰입: 42서울 라피신 C언어 기초 없이 완주, 부트캠프 수료"
    ),
    "career_goal": (
        "백엔드 개발자 / AI 엔지니어로서 실제 사용자 문제를 해결하는 서비스를 만들고 싶습니다. "
        "AI와 백엔드 기술을 결합하여 지능형 서비스를 개발하는 것이 목표입니다."
    ),
    "self_introduction": (
        "안녕하세요, 저는 동국대학교 정보통신공학과 황현서입니다.\n\n"
        "AI/NLP 연구 경험과 백엔드 개발 역량을 갖춘 개발자입니다. "
        "구름x카카오 풀스택 부트캠프에서 Spring Framework 기반 개발을 익혔고, "
        "AI Network 연구실에서 SDN 실습을, AI/NLP 연구조교로서 RAG 파이프라인 구축까지 경험했습니다.\n\n"
        "헝가리 교환학생 경험으로 다양한 문화권 사람들과 협업하는 능력을 길렀으며, "
        "42서울 라피신을 C언어 기초 없이 완주한 경험처럼 낯선 환경에서도 끝까지 해내는 끈기가 강점입니다."
    ),
}

# 공고 목록 (노션 DB 기반)
JOBS_DATA = [
    {"company": "IPP",              "category": "기타",   "title": "IPP 현장실습",                   "job_type": "인턴"},
    {"company": "코레일",            "category": "공기업", "title": "신입사원 채용",                   "job_type": "신입사원"},
    {"company": "삼성전자",          "category": "대기업", "title": "삼성전자 DX부문 채용연계형 인턴",  "job_type": "채용연계형 인턴"},
    {"company": "NH투자증권",        "category": "대기업", "title": "신입사원 채용",                   "job_type": "신입사원"},
    {"company": "한화시스템",        "category": "대기업", "title": "신입사원 채용",                   "job_type": "신입사원"},
    {"company": "한화에어로스페이스", "category": "대기업", "title": "채용연계형 인턴",                 "job_type": "채용연계형 인턴"},
    {"company": "롯데캐피탈",        "category": "대기업", "title": "신입사원 채용",                   "job_type": "신입사원"},
    {"company": "한화오션",          "category": "대기업", "title": "신입사원 채용",                   "job_type": "신입사원"},
    {"company": "신한은행",          "category": "대기업", "title": "디지털/ICT 수시채용",              "job_type": "신입사원"},
    {"company": "현대자동차",        "category": "대기업", "title": "신입사원 채용",                   "job_type": "신입사원"},
    {"company": "한국투자증권",      "category": "대기업", "title": "인턴 채용",                       "job_type": "채용연계형 인턴"},
    {"company": "한국선급",          "category": "공기업", "title": "신입사원 채용",                   "job_type": "신입사원"},
    {"company": "케이뱅크",          "category": "대기업", "title": "채용연계형 인턴십",               "job_type": "채용연계형 인턴"},
    {"company": "현대자동차",        "category": "대기업", "title": "채용연계형 인턴",                 "job_type": "채용연계형 인턴"},
    {"company": "IBK기업은행",       "category": "공기업", "title": "IBK 인턴십",                      "job_type": "인턴"},
    {"company": "안랩",              "category": "대기업", "title": "인턴 채용",                       "job_type": "인턴"},
    {"company": "대한항공",          "category": "대기업", "title": "인턴 채용",                       "job_type": "인턴"},
    {"company": "영커리언스",        "category": "기타",   "title": "인턴 채용",                       "job_type": "인턴"},
    {"company": "손해보험협회",      "category": "공기업", "title": "신입사원 채용",                   "job_type": "신입사원"},
    {"company": "에코마케팅",        "category": "중견기업","title": "백엔드 개발자(Python) 인턴",      "job_type": "인턴"},
    {"company": "이스트소프트",      "category": "중견기업","title": "청년 일경험 인턴",                "job_type": "인턴"},
    {"company": "플렉스팀",          "category": "중견기업","title": "백엔드 인턴(채용연계)",           "job_type": "채용연계형 인턴",
     "url": "https://flex.careers.team/job-descriptions/QvzkVQzRp",
     "cover_letter_questions": [
         "플렉스팀 Product Engineer (Backend) Intern으로 지원하신 동기를 작성해 주세요. (500자 미만)",
         "본인이 가장 자신 있는 기술 요소를 이용해 실제 마주했던 기술적 문제를 깊이 있게 해결해 보았거나, 직접 운용해 본 경험을 구체적인 사례 중심으로 설명해 주세요. (500자 미만) 기술 요소는 본 채용 공고(JD)에 소개된 자격 요건이나 요구 기술 중에서 선택해 주시는 것이 좋습니다.",
         "AI 도구를 적극 활용해 실제 어려운 문제를 해결해 본 경험이 있다면, 도구를 어떤 방식으로 활용했고 그 한계를 이떻게 보완했는지 함께 기재해 주세요. (500자 미만)",
     ]},
]


async def seed():
    await init_db()

    async with AsyncSessionLocal() as db:
        # 1. 사용자 프로필 저장
        result = await db.execute(select(UserProfile).limit(1))
        profile = result.scalar_one_or_none()
        if not profile:
            profile = UserProfile()
            db.add(profile)

        for k, v in USER_PROFILE.items():
            setattr(profile, k, v)

        await db.flush()
        print("✅ 프로필 저장 완료")

        # 2. 기업 + 공고 저장
        seen_companies = {}
        for item in JOBS_DATA:
            cname = item["company"]
            if cname not in seen_companies:
                res = await db.execute(select(Company).where(Company.name == cname))
                company = res.scalar_one_or_none()
                if not company:
                    company = Company(name=cname, category=item["category"])
                    db.add(company)
                    await db.flush()
                seen_companies[cname] = company
            else:
                company = seen_companies[cname]

            # 중복 공고 확인
            res = await db.execute(
                select(Job).where(Job.title == item["title"], Job.company_id == company.id)
            )
            if res.scalar_one_or_none():
                continue

            job = Job(
                company_id=company.id,
                title=item["title"],
                url=item.get("url", f"https://www.google.com/search?q={cname}+채용"),
                job_type=item.get("job_type", ""),
                cover_letter_questions=item.get("cover_letter_questions", []),
                is_active=True,
            )
            db.add(job)
            print(f"  ➕ {cname} - {item['title']}")

        await db.commit()
        print("\n✅ 모든 데이터 적재 완료!")
        print(f"   기업: {len(seen_companies)}개")
        print(f"   공고: {len(JOBS_DATA)}개")


if __name__ == "__main__":
    asyncio.run(seed())
