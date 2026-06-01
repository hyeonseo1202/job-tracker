import { useEffect, useState, useRef, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useNavigate } from "react-router-dom";
import { jobsApi, crawlApi } from "../api";
import { RefreshCw } from "lucide-react";

export default function CalendarView() {
  const [events, setEvents] = useState([]);
  const [upcomingJobs, setUpcomingJobs] = useState([]);
  const [crawling, setCrawling] = useState(false);
  const [crawlMsg, setCrawlMsg] = useState("");
  const [progress, setProgress] = useState(null); // {source, step, count}
  const [ctxMenu, setCtxMenu] = useState(null); // {x, y, jobId, jobUrl}
  const navigate = useNavigate();
  const pollRef = useRef(null);

  const loadData = useCallback(() => {
    jobsApi.calendar().then((res) => setEvents(res.data));
    jobsApi.list().then((res) => {
      const now = new Date();
      const sorted = [...res.data]
        .filter((j) => j.deadline && new Date(j.deadline) > now) // 마감된 공고 제외
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 5);
      setUpcomingJobs(sorted);
    });
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // 화면 클릭 시 컨텍스트 메뉴 닫기
  useEffect(() => {
    const close = () => setCtxMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const handleCrawl = async () => {
    if (crawling) return;
    setCrawling(true);
    setCrawlMsg("");
    setProgress({ source: "", step: "시작 중...", count: 0 });
    try {
      await crawlApi.all();
      pollRef.current = setInterval(async () => {
        const s = await crawlApi.status();
        const data = s.data;
        if (data.progress) setProgress(data.progress);
        if (!data.running) {
          clearInterval(pollRef.current);
          setCrawling(false);
          setProgress(null);
          const r = data.last_result;
          if (r?.error) {
            setCrawlMsg(`오류: ${r.error}`);
          } else {
            setCrawlMsg(`완료! ${r?.added || 0}개 추가, ${r?.skipped || 0}개 중복 스킵`);
          }
          loadData();
          setTimeout(() => setCrawlMsg(""), 6000);
        }
      }, 2000);
    } catch (e) {
      setCrawling(false);
      setProgress(null);
      setCrawlMsg("크롤링 오류: " + e.message);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!confirm("이 공고를 삭제하시겠습니까?")) return;
    await jobsApi.delete(jobId);
    loadData();
  };

  const daysUntil = (deadline) => {
    const diff = new Date(deadline) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const urgencyColor = (days) => {
    if (days <= 3) return "#ef4444";
    if (days <= 7) return "#f97316";
    if (days <= 14) return "#eab308";
    return "#22c55e";
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>채용 캘린더</h2>
          <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>마감일 기준으로 공고를 확인하세요</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          {/* 진행 상황 표시 */}
          {crawling && progress && (
            <div style={{
              fontSize: 12, color: "#6366f1", fontWeight: 600,
              background: "#eef2ff", padding: "4px 12px", borderRadius: 20,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <RefreshCw size={11} style={{ animation: "spin 1s linear infinite" }} />
              {progress.source ? `${progress.source} ${progress.step}` : progress.step}
              {progress.count > 0 && ` (${progress.count}개 수집)`}
            </div>
          )}
          {crawlMsg && (
            <span style={{ fontSize: 12, color: crawlMsg.includes("오류") ? "#ef4444" : "#16a34a", fontWeight: 600 }}>
              {crawlMsg}
            </span>
          )}
          <button
            onClick={handleCrawl}
            disabled={crawling}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 8,
              background: crawling ? "#6366f199" : "#6366f1",
              color: "white", border: "none",
              cursor: crawling ? "not-allowed" : "pointer",
              fontSize: 13, fontWeight: 600,
            }}
          >
            <RefreshCw size={13} style={{ animation: crawling ? "spin 1s linear infinite" : "none" }} />
            {crawling ? "크롤링 중..." : "전체 크롤링"}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
        {/* 캘린더 */}
        <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale="ko"
            events={events}
            eventClick={(info) => navigate(`/jobs/${info.event.id}`)}
            eventDidMount={(info) => {
              info.el.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                setCtxMenu({
                  x: e.clientX,
                  y: e.clientY,
                  jobId: info.event.id,
                  jobUrl: info.event.extendedProps?.url,
                });
              });
            }}
            eventContent={(arg) => (
              <div style={{
                padding: "2px 6px",
                fontSize: 11,
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}>
                {arg.event.title}
              </div>
            )}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "",
            }}
            buttonText={{ today: "오늘" }}
            height={560}
          />
        </div>

        {/* 마감 임박 공고 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{
            background: "white", borderRadius: 12, padding: 20,
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
              ⏰ 마감 임박
            </h3>
            {upcomingJobs.length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: 13 }}>마감 예정 공고가 없습니다.</p>
            ) : (
              upcomingJobs.map((job) => {
                const days = daysUntil(job.deadline);
                return (
                  <div
                    key={job.id}
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      marginBottom: 8,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                          {job.company?.name || ""}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                          {job.title}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: urgencyColor(days),
                        background: urgencyColor(days) + "15",
                        padding: "2px 8px",
                        borderRadius: 20,
                        whiteSpace: "nowrap",
                        marginLeft: 8,
                      }}>
                        {days <= 0 ? "마감" : `D-${days}`}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
                      {new Date(job.deadline).toLocaleDateString("ko-KR", {
                        month: "long", day: "numeric", weekday: "short"
                      })}
                      {" "}
                      {new Date(job.deadline).toLocaleTimeString("ko-KR", {
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 범례 */}
          <div style={{
            background: "white", borderRadius: 12, padding: 16,
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 10 }}>범례</h3>
            {[
              { color: "#a5b4fc", label: "대기업" },
              { color: "#6ee7b7", label: "공기업" },
              { color: "#fcd34d", label: "중견기업" },
              { color: "#cbd5e1", label: "기타" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color }} />
                <span style={{ fontSize: 13, color: "#475569" }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 우클릭 컨텍스트 메뉴 */}
      {ctxMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: ctxMenu.y,
            left: ctxMenu.x,
            background: "white",
            borderRadius: 10,
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            border: "1px solid #e2e8f0",
            zIndex: 9999,
            overflow: "hidden",
            minWidth: 160,
          }}
        >
          <button
            onClick={() => { navigate(`/jobs/${ctxMenu.jobId}`); setCtxMenu(null); }}
            style={ctxBtnStyle}
          >
            🔍 자세히 보기
          </button>
          {ctxMenu.jobUrl && (
            <button
              onClick={() => { window.open(ctxMenu.jobUrl, "_blank"); setCtxMenu(null); }}
              style={ctxBtnStyle}
            >
              🔗 공고 원문 열기
            </button>
          )}
          <div style={{ height: 1, background: "#f1f5f9" }} />
          <button
            onClick={() => { handleDeleteJob(ctxMenu.jobId); setCtxMenu(null); }}
            style={{ ...ctxBtnStyle, color: "#ef4444" }}
          >
            🗑 삭제
          </button>
        </div>
      )}
    </div>
  );
}

const ctxBtnStyle = {
  display: "block", width: "100%", padding: "10px 16px",
  background: "none", border: "none", cursor: "pointer",
  fontSize: 13, color: "#1e293b", textAlign: "left",
  transition: "background 0.1s",
};
