from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False, unique=True)
    category = Column(String(50))
    talent_profile = Column(Text)
    cover_letter_tips = Column(Text)
    logo_url = Column(String(500))
    website = Column(String(500))
    career_page_url = Column(String(500))   # 자체 채용 페이지 URL (공기업 등)
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
    job_type = Column(String(100))   # 신입 / 경력 / 인턴 / 채용연계형 인턴
    location = Column(String(200))   # 서울 / 경기 / 해외 등
    job_category = Column(String(200))  # IT개발 / 금융 / 마케팅 등
    deadline = Column(DateTime)
    start_date = Column(DateTime)
    description = Column(Text)
    requirements = Column(Text)
    preferred = Column(Text)
    cover_letter_questions = Column(JSON)
    # 지원 상태
    status = Column(String(50), default="지원 예정")
    # 지원 예정 / 지원 완 / 서류 합격 / 서류 탈 / 필기 / 면접 / 최종 합격 / 최종 탈 / 비어 있음
    applied_at = Column(DateTime)
    memo = Column(Text)           # 메모
    is_active = Column(Boolean, default=True)
    is_scraped = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="jobs")
    cover_letters = relationship("CoverLetter", back_populates="job")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True)
    name = Column(String(100))
    education = Column(Text)
    major = Column(String(200))
    gpa = Column(String(20))
    experiences = Column(JSON)
    activities = Column(JSON)
    certifications = Column(JSON)
    skills = Column(JSON)
    languages = Column(JSON)
    awards = Column(JSON)
    projects = Column(JSON)
    self_introduction = Column(Text)
    strengths = Column(Text)
    weaknesses = Column(Text)
    career_goal = Column(Text)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CrawlPreferences(Base):
    """크롤링 필터 선호도"""
    __tablename__ = "crawl_preferences"

    id = Column(Integer, primary_key=True)
    job_types = Column(JSON, default=list)      # ["신입", "인턴", "채용연계형 인턴"]
    locations = Column(JSON, default=list)      # ["서울", "경기", "해외"]
    categories = Column(JSON, default=list)     # ["IT개발", "금융", "마케팅"]
    keywords = Column(JSON, default=list)       # 검색 키워드
    company_sizes = Column(JSON, default=list)  # ["대기업", "공기업", "중견기업"]
    auto_crawl_enabled = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PublicCareerSite(Base):
    """공기업/정부기관 자체 채용 사이트"""
    __tablename__ = "public_career_sites"

    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    url = Column(String(500), nullable=False)
    selector = Column(String(500))   # CSS 셀렉터 (공고 목록 요소)
    last_crawled = Column(DateTime)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


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
