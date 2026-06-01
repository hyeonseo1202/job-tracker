"""공고 URL에서 내용을 파싱하는 스크레이퍼"""
import httpx
from bs4 import BeautifulSoup
import re
from datetime import datetime
from typing import Optional
import json


async def scrape_job_url(url: str) -> dict:
    """주어진 URL에서 채용공고 정보를 추출합니다."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=30) as client:
        try:
            resp = await client.get(url)
            resp.raise_for_status()
        except Exception as e:
            return {"error": str(e), "url": url}

    soup = BeautifulSoup(resp.text, "html.parser")

    # 사람인 파싱
    if "saramin.co.kr" in url:
        return _parse_saramin(soup, url)
    # 잡코리아 파싱
    elif "jobkorea.co.kr" in url:
        return _parse_jobkorea(soup, url)
    # 공공기관 채용 (채용24)
    elif "gosi.kr" in url or "ncs.go.kr" in url or "work24.go.kr" in url:
        return _parse_public(soup, url)
    # 기업 자체 채용 페이지 (범용)
    else:
        return _parse_generic(soup, url)


def _parse_saramin(soup: BeautifulSoup, url: str) -> dict:
    result = {"url": url, "source": "saramin"}

    title_el = soup.select_one("h1.tit_job, .job_tit h1, h1.tit")
    result["title"] = title_el.get_text(strip=True) if title_el else ""

    company_el = soup.select_one(".company_name a, .corp_name a")
    result["company_name"] = company_el.get_text(strip=True) if company_el else ""

    deadline_el = soup.select_one(".info_period .date, .deadlines")
    result["deadline_text"] = deadline_el.get_text(strip=True) if deadline_el else ""

    detail_el = soup.select_one(".jv_cont, .job_summary, #job_contents")
    result["description"] = detail_el.get_text(separator="\n", strip=True)[:3000] if detail_el else ""

    # 자기소개서 문항 파싱
    qs = []
    for el in soup.select(".letter_wrap .q_item, .resume_item .question"):
        qs.append(el.get_text(strip=True))
    result["cover_letter_questions"] = qs

    return result


def _parse_jobkorea(soup: BeautifulSoup, url: str) -> dict:
    result = {"url": url, "source": "jobkorea"}

    title_el = soup.select_one(".hd-tit, h1.tit")
    result["title"] = title_el.get_text(strip=True) if title_el else ""

    company_el = soup.select_one(".coname a, .corp-name")
    result["company_name"] = company_el.get_text(strip=True) if company_el else ""

    deadline_el = soup.select_one(".date-info .end-date, .deadline")
    result["deadline_text"] = deadline_el.get_text(strip=True) if deadline_el else ""

    detail_el = soup.select_one("#jd-cont, .jd-contents")
    result["description"] = detail_el.get_text(separator="\n", strip=True)[:3000] if detail_el else ""

    qs = []
    for el in soup.select(".item-question, .cover-item .q-txt"):
        qs.append(el.get_text(strip=True))
    result["cover_letter_questions"] = qs

    return result


def _parse_public(soup: BeautifulSoup, url: str) -> dict:
    result = {"url": url, "source": "public"}

    title_el = soup.select_one("h2.tit, .view-title, .job-title")
    result["title"] = title_el.get_text(strip=True) if title_el else ""

    detail_el = soup.select_one(".view-content, .job-content, .cont-area")
    result["description"] = detail_el.get_text(separator="\n", strip=True)[:3000] if detail_el else ""

    return result


def _parse_generic(soup: BeautifulSoup, url: str) -> dict:
    """범용 파싱 - 주요 텍스트 추출"""
    result = {"url": url, "source": "generic"}

    # og 태그에서 제목/설명 추출
    og_title = soup.find("meta", property="og:title")
    result["title"] = og_title["content"] if og_title else (soup.title.get_text() if soup.title else "")

    og_desc = soup.find("meta", property="og:description")
    result["og_description"] = og_desc["content"] if og_desc else ""

    # 본문 텍스트 (script/style 제거)
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    body = soup.get_text(separator="\n", strip=True)
    result["description"] = body[:3000]

    return result


async def fetch_company_news(company_name: str, limit: int = 5) -> list[dict]:
    """네이버 뉴스 RSS로 기업 최신 뉴스 수집"""
    encoded = httpx.URL(f"https://news.google.com/rss/search?q={company_name}+채용&hl=ko&gl=KR&ceid=KR:ko")
    import feedparser
    try:
        feed = feedparser.parse(str(encoded))
        news = []
        for entry in feed.entries[:limit]:
            news.append({
                "title": entry.get("title", ""),
                "url": entry.get("link", ""),
                "published_at": entry.get("published", ""),
                "source": entry.get("source", {}).get("title", "Google News"),
                "summary": entry.get("summary", "")[:300],
            })
        return news
    except Exception:
        return []
