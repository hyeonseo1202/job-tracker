import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useNavigate } from "react-router-dom";
import { jobsApi, crawlApi } from "../api";
import { RefreshCw } from "lucide-react";

export default function CalendarView() {
  const [events, setEvents] = useState([]);
  const [upcomingJobs, setUpcomingJobs] = useState([]);
  const [crawling, setCrawling] = useState(null); // null | "jasoseol" | "inthiswork" | "all"
  const [crawlMsg, setCrawlMsg] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    jobsApi.calendar().then((res) => {
      setEvents(res.data);
    });
    jobsApi.list().then((res) => {
      const sorted = [...res.data]
        .filter((j) => j.deadline)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 5);
      setUpcomingJobs(sorted);
    });
  }, []);

  const handleCrawl = async (source) => {
    setCrawling(source);
    setCrawlMsg("");
    try {
      const fn = source === "jasoseol" ? crawlApi.jasoseol
               : source === "inthiswork" ? crawlApi.inthiswork
               : crawlApi.all;
      await fn();
      // 완료될 때까지 상태 폴링
      const poll = setInterval(async () => {
        const s = await crawlApi.status();
        if (!s.data.running) {
          clearInterval(poll);
          setCrawling(null);
          const r = s.data.last_result;
          if (r?.error) {
            setCrawlMsg(`오류: ${r.error}`);
          } else {
            setCrawlMsg(`완료! ${r?.added || 0}개 추가, ${r?.skipped || 0}개 중복 스킵`);
          }
          // 캘린더·목록 새로고침
          jobsApi.calendar().then((res) => setEvents(res.data));
          jobsApi.list().then((res) => {
            const sorted = [...res.data]
              .filter((j) => j.deadline)
              .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
              .slice(0, 5);
            setUpcomingJobs(sorted);
          });
          setTimeout(() => setCrawlMsg(""), 5000);
        }
      }, 2000);
    } catch (e) {
      setCrawling(null);
      setCrawlMsg("크롤링 오류: " + e.message);
    }
  };

  const daysUntil = (deadline) => {
    const diff = new Date(deadline) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
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
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {crawlMsg && (
            <span style={{ fontSize: 12, color: crawlMsg.includes("오류") ? "#ef4444" : "#16a34a", fontWeight: 600 }}>
              {crawlMsg}
            </span>
          )}
          {[
            { key: "jasoseol", label: "자소설닷컴", color: "#6366f1" },
            { key: "inthiswork", label: "인디스워크", color: "#0ea5e9" },
            { key: "all", label: "전체 크롤링", color: "#059669" },
          ].map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => handleCrawl(key)}
              disabled={!!crawling}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "7px 13px", borderRadius: 8,
                background: crawling === key ? color + "99" : color,
                color: "white", border: "none",
                cursor: crawling ? "not-allowed" : "pointer",
                fontSize: 12, fontWeight: 600,
              }}
            >
              <RefreshCw size={13} style={{ animation: crawling === key ? "spin 1s linear infinite" : "none" }} />
              {crawling === key ? "수집 중..." : label}
            </button>
          ))}
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
              <p style={{ color: "#94a3b8", fontSize: 13 }}>등록된 공고가 없습니다.</p>
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
              { color: "#4f46e5", label: "대기업" },
              { color: "#059669", label: "공기업" },
              { color: "#d97706", label: "중견기업" },
              { color: "#6b7280", label: "기타" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color }} />
                <span style={{ fontSize: 13, color: "#475569" }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
