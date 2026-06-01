from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional
import os
import anthropic

from database import get_db
from models import Job, UserProfile, Company, CoverLetter

router = APIRouter(prefix="/api/ai", tags=["ai"])


class GenerateRequest(BaseModel):
    job_id: int
    question: str
    char_limit: Optional[int] = None
    existing_answer: Optional[str] = None


class AnalyzeCompanyRequest(BaseModel):
    company_id: int


def get_claude_client():
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(500, "ANTHROPIC_API_KEY가 설정되지 않았습니다.")
    return anthropic.Anthropic(api_key=api_key)


@router.post("/generate-cover-letter")
async def generate_cover_letter(req: GenerateRequest, db: AsyncSession = Depends(get_db)):
    """자기소개서 문항에 대한 초안을 생성합니다."""
    # 공고 정보 로드
    job_result = await db.execute(
        select(Job).options(selectinload(Job.company)).where(Job.id == req.job_id)
    )
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "공고를 찾을 수 없습니다.")

    # 사용자 프로필 로드
    profile_result = await db.execute(select(UserProfile).limit(1))
    profile = profile_result.scalar_one_or_none()

    company = job.company
    char_note = f"\n**글자 수 제한: {req.char_limit}자 이내**" if req.char_limit else ""

    # 프로필 요약
    profile_text = _format_profile(profile) if profile else "프로필 정보가 없습니다."

    prompt = f"""당신은 대기업/공기업 취업을 위한 자기소개서 전문가입니다.
아래 정보를 바탕으로 자기소개서 문항에 대한 **완성도 높은 초안**을 작성해주세요.

## 지원 기업 정보
- 기업명: {company.name if company else "미상"}
- 기업 분류: {company.category if company else ""}
- 채용 공고: {job.title}
- 부서/직무: {job.department or ""}
- 인재상: {company.talent_profile if company else "정보 없음"}

## 공고 상세
{job.description[:1000] if job.description else ""}

## 지원자 정보
{profile_text}

## 자기소개서 문항{char_note}
{req.question}

## 작성 지침
1. 구체적인 경험과 수치를 활용하여 설득력 있게 작성
2. 기업의 인재상과 직무 요구사항에 맞춰 작성
3. 두괄식 구성으로 핵심 내용을 먼저 제시
4. 진부한 표현 대신 개성 있는 문장 사용
5. {"글자 수 제한을 반드시 준수" if req.char_limit else "적절한 분량으로 작성"}

초안만 작성해주세요. 설명이나 주석 없이 자기소개서 본문만 출력해주세요."""

    client = get_claude_client()
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )
    answer = message.content[0].text

    # DB에 저장
    cl = CoverLetter(
        job_id=req.job_id,
        question=req.question,
        answer=answer,
        char_limit=req.char_limit,
        is_draft=True,
    )
    db.add(cl)
    await db.commit()
    await db.refresh(cl)

    return {"id": cl.id, "answer": answer, "char_count": len(answer)}


@router.post("/analyze-company")
async def analyze_company(req: AnalyzeCompanyRequest, db: AsyncSession = Depends(get_db)):
    """기업 인재상 및 자기소개서 작성 방향을 AI로 분석합니다."""
    result = await db.execute(select(Company).where(Company.id == req.company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(404)

    client = get_claude_client()
    prompt = f"""'{company.name}'({company.category or "기업"})의 채용 정보를 바탕으로 다음을 분석해주세요.

1. **핵심 인재상**: 이 기업이 원하는 인재의 특성 3~5가지 (불릿 포인트)
2. **자기소개서 작성 방향**: 지원자가 강조해야 할 포인트와 피해야 할 내용
3. **면접 키워드**: 이 기업 면접에서 자주 나오는 주제나 가치관
4. **업계 특성**: 이 기업/업계의 최근 트렌드와 지원자가 알아야 할 내용

마크다운 형식으로 각 섹션을 명확히 구분해서 작성해주세요."""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}]
    )
    analysis = message.content[0].text

    # 결과를 DB에 저장
    company.talent_profile = analysis
    await db.commit()

    return {"analysis": analysis}


@router.put("/cover-letters/{cl_id}")
async def update_cover_letter(cl_id: int, answer: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CoverLetter).where(CoverLetter.id == cl_id))
    cl = result.scalar_one_or_none()
    if not cl:
        raise HTTPException(404)
    cl.answer = answer
    cl.is_draft = False
    await db.commit()
    return {"ok": True}


def _format_profile(p: UserProfile) -> str:
    lines = []
    if p.name:
        lines.append(f"- 이름: {p.name}")
    if p.education:
        lines.append(f"- 학력: {p.education} / {p.major or ''} / GPA {p.gpa or ''}")
    if p.experiences:
        lines.append("- 경력/인턴:")
        for e in p.experiences:
            lines.append(f"  • {e}")
    if p.activities:
        lines.append("- 대외활동:")
        for a in p.activities:
            lines.append(f"  • {a}")
    if p.certifications:
        lines.append(f"- 자격증: {', '.join(p.certifications)}")
    if p.skills:
        lines.append(f"- 스킬: {', '.join(p.skills)}")
    if p.languages:
        lines.append("- 어학:")
        for l in p.languages:
            lines.append(f"  • {l}")
    if p.awards:
        lines.append("- 수상/성과:")
        for a in p.awards:
            lines.append(f"  • {a}")
    if p.projects:
        lines.append("- 프로젝트:")
        for pr in p.projects:
            lines.append(f"  • {pr}")
    if p.strengths:
        lines.append(f"- 강점: {p.strengths}")
    if p.career_goal:
        lines.append(f"- 취업 목표: {p.career_goal}")
    return "\n".join(lines)
