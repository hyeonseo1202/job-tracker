from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False, unique=True)
    category = Column(String(50))  # 대기업 / 공기업 / 중견기업
    talent_profile = Column(Text)  # 인재상
    cover_letter_tips = Column(Text)  # 자기소개서 작성 방향
    logo_url = Column(String(500))
    website = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    jobs = relationship("Job", back_populates="company")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    title = Column(String(300), nullable=False)
    url = Column(String(1000), nullable=False)
    department = Column(String(200))
    job_type = Column(String(100))  # 신입/경력/인턴
    location = Column(String(200))
    deadline = Column(DateTime)
    start_date = Column(DateTime)
    description = Column(Text)  # 공고 원문 요약
    requirements = Column(Text)  # 자격 요건
    preferred = Column(Text)  # 우대 사항
    cover_letter_questions = Column(JSON)  # 자기소개서 문항 목록
    is_active = Column(Boolean, default=True)
    is_scraped = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="jobs")
    cover_letters = relationship("CoverLetter", back_populates="job")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True)
    name = Column(String(100))
    education = Column(Text)  # 학력
    major = Column(String(200))
    gpa = Column(String(20))
    experiences = Column(JSON)  # 경력/인턴 목록
    activities = Column(JSON)  # 대외활동 목록
    certifications = Column(JSON)  # 자격증 목록
    skills = Column(JSON)  # 스킬 목록
    languages = Column(JSON)  # 어학 성적
    awards = Column(JSON)  # 수상 경력
    projects = Column(JSON)  # 프로젝트
    self_introduction = Column(Text)  # 기본 자기소개
    strengths = Column(Text)  # 강점
    weaknesses = Column(Text)  # 약점/보완점
    career_goal = Column(Text)  # 취업 목표/비전
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CoverLetter(Base):
    __tablename__ = "cover_letters"

    id = Column(Integer, primary_key=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    question = Column(Text, nullable=False)
    answer = Column(Text)
    is_draft = Column(Boolean, default=True)
    char_limit = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    job = relationship("Job", back_populates="cover_letters")


class NewsCache(Base):
    __tablename__ = "news_cache"

    id = Column(Integer, primary_key=True)
    company_name = Column(String(200), nullable=False)
    title = Column(String(500))
    url = Column(String(1000))
    published_at = Column(DateTime)
    summary = Column(Text)
    source = Column(String(200))
    cached_at = Column(DateTime, default=datetime.utcnow)
