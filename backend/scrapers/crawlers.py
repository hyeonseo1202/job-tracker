"""
자소설닷컴 / INTHISWORK 채용공고 크롤러
- 자소설닷컴: Playwright DOM 파싱 (로그인 불필요 공개 영역)
- INTHISWORK: WordPress REST API
"""
import httpx
import re
from datetime import datetime
from bs4 import BeautifulSoup
from typing import Optional


HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

# ──────────────────────────────────────────
# 자소설닷컴 (Playwright)
# ──────────────────────────────────────────

async def crawl_jasoseol(limit: int = 50) -> list[dict]:
    """자소설닷컴 공개 채용 공고 수집 (Playwright)"""
    from playwright.async_api import async_playwright

    jobs = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # API 응답 캡처
        captured = {}

        async def on_response(resp):
            url = resp.url
            if "jasoseol.com" in url and not any(
                x in url for x in [".png", ".jpg", ".css", ".js", "naver", "google", "linkedin", "wcs"]
            ):
                try:
                    body = await resp.json()
                    if body:
                        captured[url] = body
                except Exception:
                    pass

        page.on("response", on_response)

        # 공고 목록 페이지 로드
        await page.goto("https://jasoseol.com/recruit", wait_until="networkidle", timeout=25000)
        await page.wait_for_timeout(3000)

        # DOM에서 공고 카드 추출 시도
        cards = await page.eval_on_selector_all(
            "a[href*='/employment/'], a[href*='/recruit/']",
            """els => els.map(el => {
                const parent = el.closest('[class]') || el.parentElement;
                return {
                    href: el.href,
                    text: el.innerText.trim(),
                    parentText: parent ? parent.innerText.slice(0, 300) : ''
                };
            })"""
        )

        seen_urls = set()
        for card in cards[:limit]:
            href = card.get("href", "")
            if not href or href in seen_urls:
                continue
            seen_urls.add(href)

            raw_text = card.get("text", "").replace("끝\n", "").replace("끝", "").strip()
            parent_text = card.get("parentText", "").replace("끝\n", "").replace("끝", "").strip()
            company_name, title = _split_company_title(raw_text)
            deadline = _extract_deadline_from_text(parent_text)

            # 유효한 기업명인지 확인 (2자 이상)
            if company_name and len(company_name.strip()) >= 2:
                jobs.append({
                    "source": "jasoseol",
                    "company_name": company_name.strip(),
                    "title": (title or "채용공고").strip(),
                    "url": href,
                    "deadline": deadline,
                    "job_type": _infer_job_type(parent_text),
                    "description": parent_text[:500],
                    "cover_letter_questions": [],
                })

        # API 캡처에서 curations 데이터도 활용
        for url, body in captured.items():
            if "curations" in url and isinstance(body, list):
                for item in body:
                    if item.get("company_name") and item.get("title"):
                        job_url = f"https://jasoseol.com/company-curations/{item['id']}"
                        if job_url in seen_urls:
                            continue
                        seen_urls.add(job_url)
                        jobs.append({
                            "source": "jasoseol",
                            "company_name": item["company_name"],
                            "title": item["title"],
                            "url": job_url,
                            "deadline": _parse_dt(item.get("end_time")),
                            "start_date": _parse_dt(item.get("start_time")),
                            "job_type": "",
                            "description": _strip_html(item.get("description", "")),
                            "cover_letter_questions": [],
                        })

        await browser.close()

    return jobs[:limit]


# ──────────────────────────────────────────
# INTHISWORK (WordPress REST API)
# ──────────────────────────────────────────

# 카테고리 ID (wp-json/wp/v2/categories로 미리 확인)
INTHISWORK_CAT = {
    "entry":   191700167,   # 신입/인턴
    "junior":  191700168,   # 주니어경력
    "hot":     191700299,   # 오늘 핫한 공고
}


async def crawl_inthiswork(pages: int = 3, category: str = "entry") -> list[dict]:
    """INTHISWORK WordPress REST API로 신입/인턴 공고 수집"""
    cat_id = INTHISWORK_CAT.get(category, INTHISWORK_CAT["entry"])
    base = "https://inthiswork.com/wp-json/wp/v2/posts"
    jobs = []

    async with httpx.AsyncClient(headers=HEADERS, timeout=20) as client:
        for page_num in range(1, pages + 1):
            resp = await client.get(base, params={
                "per_page": 20,
                "page": page_num,
                "categories": cat_id,
                "_fields": "id,title,link,date,excerpt,content",
            })
            if resp.status_code != 200:
                break
            posts = resp.json()
            if not posts:
                break

            for post in posts:
                title_raw = _strip_html(post.get("title", {}).get("rendered", ""))
                company_name, job_title = _split_company_title(title_raw)

                content_html = post.get("content", {}).get("rendered", "")
                excerpt_html = post.get("excerpt", {}).get("rendered", "")
                full_text = _strip_html(content_html)
                excerpt_text = _strip_html(excerpt_html)

                deadline = _extract_deadline_from_text(full_text) or _extract_deadline_from_text(excerpt_text)

                jobs.append({
                    "source": "inthiswork",
                    "company_name": company_name,
                    "title": job_title or title_raw,
                    "url": post.get("link", ""),
                    "deadline": deadline,
                    "start_date": _parse_dt(post.get("date")),
                    "job_type": _infer_job_type(title_raw),
                    "description": excerpt_text[:800],
                    "cover_letter_questions": [],
                })

    return jobs


async def crawl_inthiswork_detail(url: str) -> dict:
    """INTHISWORK 공고 상세에서 마감일/내용 상세 파싱"""
    async with httpx.AsyncClient(headers=HEADERS, timeout=15, follow_redirects=True) as client:
        try:
            resp = await client.get(url)
            soup = BeautifulSoup(resp.text, "html.parser")

            # 본문 추출
            content = soup.select_one(".entry-content, .post-content, article")
            text = content.get_text(separator="\n", strip=True)[:2000] if content else ""
            deadline = _extract_deadline_from_text(text)

            return {"description": text, "deadline": deadline}
        except Exception:
            return {}


# ──────────────────────────────────────────
# 공통 유틸
# ──────────────────────────────────────────

def _parse_dt(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    try:
        clean = s[:19].replace("T", " ")
        return datetime.strptime(clean, "%Y-%m-%d %H:%M:%S")
    except Exception:
        return None


def _strip_html(html: str) -> str:
    if not html:
        return ""
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"&[a-z]+;", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _split_company_title(title: str) -> tuple[str, str]:
    """'기업명｜공고제목' 분리"""
    for sep in ["｜", " | ", " ｜ ", "|"]:
        if sep in title:
            parts = title.split(sep, 1)
            return parts[0].strip(), parts[1].strip()
    # 괄호 앞을 기업명으로 간주 (일부 패턴)
    m = re.match(r"^(.+?)\s+[\[\(](.+?)[\]\)]", title)
    if m:
        return m.group(1).strip(), title
    return title, title


def _infer_job_type(title: str) -> str:
    lower = title.lower()
    if any(k in lower for k in ["채용연계", "전환형"]):
        return "채용연계형 인턴"
    if any(k in lower for k in ["인턴", "intern"]):
        return "인턴"
    if any(k in lower for k in ["신입", "공채", "공개채용"]):
        return "신입"
    if any(k in lower for k in ["경력", "주니어"]):
        return "경력"
    return "신입/인턴"


def _extract_deadline_from_text(text: str) -> Optional[datetime]:
    """본문 텍스트에서 마감일 추출"""
    if not text:
        return None
    patterns = [
        r"(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})\s*(?:\([^)]*\))?\s*(?:까지|마감|접수마감|지원마감)",
        r"(?:마감|접수마감|지원마감|~\s*)\s*:?\s*(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})",
        r"(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(?:까지|마감|\()",
        r"~\s*(\d{2})[./](\d{1,2})[./](\d{1,2})\s*(?:\(|까지|마감)",  # ~26.06.30 패턴
    ]
    for pattern in patterns:
        m = re.search(pattern, text)
        if m:
            try:
                y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
                if y < 100:
                    y += 2000
                if 1 <= mo <= 12 and 1 <= d <= 31:
                    return datetime(y, mo, d, 23, 59)
            except (ValueError, IndexError):
                continue
    return None
