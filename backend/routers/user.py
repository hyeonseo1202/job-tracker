from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import UserProfile

router = APIRouter(prefix="/api/user", tags=["user"])


class ProfileData(BaseModel):
    name: Optional[str] = None
    education: Optional[str] = None
    major: Optional[str] = None
    gpa: Optional[str] = None
    experiences: Optional[list] = None
    activities: Optional[list] = None
    certifications: Optional[list] = None
    skills: Optional[list] = None
    languages: Optional[list] = None
    awards: Optional[list] = None
    projects: Optional[list] = None
    self_introduction: Optional[str] = None
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    career_goal: Optional[str] = None


@router.get("/profile")
async def get_profile(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserProfile).limit(1))
    profile = result.scalar_one_or_none()
    if not profile:
        return {}
    return {
        "name": profile.name,
        "education": profile.education,
        "major": profile.major,
        "gpa": profile.gpa,
        "experiences": profile.experiences or [],
        "activities": profile.activities or [],
        "certifications": profile.certifications or [],
        "skills": profile.skills or [],
        "languages": profile.languages or [],
        "awards": profile.awards or [],
        "projects": profile.projects or [],
        "self_introduction": profile.self_introduction,
        "strengths": profile.strengths,
        "weaknesses": profile.weaknesses,
        "career_goal": profile.career_goal,
    }


@router.post("/profile")
async def save_profile(data: ProfileData, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserProfile).limit(1))
    profile = result.scalar_one_or_none()
    if not profile:
        profile = UserProfile()
        db.add(profile)
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(profile, k, v)
    await db.commit()
    return {"ok": True}
