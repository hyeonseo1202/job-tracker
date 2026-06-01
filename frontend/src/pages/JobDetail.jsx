import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { jobsApi, companiesApi, aiApi } from "../api";
import {
  ExternalLink, RefreshCw, Trash2, Sparkles, ChevronDown, ChevronUp,
  Newspaper, Target, PenTool, ArrowLeft
} from "lucide-react";

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [news, setNews] = useState([]);
  const [activeTab, setActiveTab] = useState("info");
  const [generatingIdx, setGeneratingIdx] = useState(null);
  const [analyzingCompany, setAnalyzingCompany] = useState(false);
  const [charLimit, setCharLimit] = useState("");
  const [expandedCL, setExpandedCL] = useState({});

  useEffect(() => {
    loadJob();
  }, [id]);

  const loadJob = async () => {
    const res = await jobsApi.get(id);
    setJob(res.data);
    if (res.data.company?.id) {
      companiesApi.get(res.data.company.id).then((r) => setCompanyInfo(r.data));
      companiesApi.news(res.data.company.id).then((r) => setNews(r.data)).catch(() => {});
    }
  };

  const handleDelete = async () => {
    if (!confirm("이 공고를 삭제하시겠습니까?")) return;
    await jobsApi.delete(id);
    navigate("/");
  };

  const handleRescrape = async () => {
    await jobsApi.rescrape(id);
    loadJob();
    alert("공고 정보를 다시 불러왔습니다.");
  };

  const generateCoverLetter = async (question, idx) => {
    setGeneratingIdx(idx);
    try {
      await aiApi.generateCoverLetter({
        job_id: parseInt(id),
        question,
        char_limit: charLimit ? parseInt(charLimit) : null,
      });
      await loadJob();
    } catch (e) {
      alert("생성 중 오류: " + (e.response?.data?.detail || e.message));
    }
    setGeneratingIdx(null);
  };

  const analyzeCompany = async () => {
    setAnalyzingCompany(true);
    try {
      await aiApi.analyzeCompany({ company_id: job.company.id });
      const r = await companiesApi.get(job.company.id);
      setCompanyInfo(r.data);
    } catch (e) {
      alert("분석 오류: " + (e.response?.data?.detail || e.message));
    }
    setAnalyzingCompany(false);
  };

  if (!job) return <div style={{ padding: 40, color: "#64748b" }}>불러오는 중...</div>;

  const daysUntil = job.deadline
    ? Math.ceil((new Date(job.deadline) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      {/* 헤더 */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => navigate("/")}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, marginBottom: 12, padding: 0 }}
        >
          <ArrowLeft size={14} /> 캘린더로 돌아가기
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {job.company && (
                <span style={{
                  fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                  background: categoryBg(job.company.category), color: categoryColor(job.company.category)
                }}>
                  {job.company.category || "기업"}
                </span>
              )}
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>
                {job.company?.name} — {job.title}
              </h1>
            </div>
            {job.deadline && (
              <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "#64748b" }}>
                  마감: {new Date(job.deadline).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
                  {" "}
                  {new Date(job.deadline).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                {daysUntil !== null && (
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 20,
                    color: daysUntil <= 3 ? "#ef4444" : daysUntil <= 7 ? "#f97316" : "#22c55e",
                    background: daysUntil <= 3 ? "#fef2f2" : daysUntil <= 7 ? "#fff7ed" : "#f0fdf4",
                  }}>
                    {daysUntil <= 0 ? "마감됨" : `D-${daysUntil}`}
                  </span>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <a href={job.url} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", color: "#475569", textDecoration: "none", fontSize: 13 }}>
              <ExternalLink size={14} /> 공고 보기
            </a>
            <button onClick={handleRescrape}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", color: "#475569", cursor: "pointer", fontSize: 13 }}>
              <RefreshCw size={14} /> 재수집
            </button>
            <button onClick={handleDelete}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#ef4444", cursor: "pointer", fontSize: 13 }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #e2e8f0", marginBottom: 24 }}>
        {[
          { key: "info", label: "공고 정보", icon: "📋" },
          { key: "coverletter", label: "자기소개서", icon: "✍️" },
          { key: "company", label: "기업 분석", icon: "🏢" },
          { key: "news", label: "최근 뉴스", icon: "📰" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "10px 18px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? "#4f46e5" : "#64748b",
              borderBottom: activeTab === tab.key ? "2px solid #4f46e5" : "2px solid transparent",
              marginBottom: -2,
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 공고 정보 탭 */}
      {activeTab === "info" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {job.department && (
            <InfoCard label="부서/직무" value={job.department} />
          )}
          {job.job_type && (
            <InfoCard label="고용 형태" value={job.job_type} />
          )}
          {job.location && (
            <InfoCard label="근무 지역" value={job.location} />
          )}
          <div style={{ gridColumn: "1 / -1", background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: "#0f172a" }}>공고 내용</h3>
            <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {job.description || "공고 내용이 없습니다. 재수집을 시도해보세요."}
            </div>
          </div>
          {job.requirements && (
            <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: "#0f172a" }}>자격 요건</h3>
              <div style={{ fontSize: 13, color: "#475569", whiteSpace: "pre-wrap" }}>{job.requirements}</div>
            </div>
          )}
          {job.preferred && (
            <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: "#0f172a" }}>우대 사항</h3>
              <div style={{ fontSize: 13, color: "#475569", whiteSpace: "pre-wrap" }}>{job.preferred}</div>
            </div>
          )}
        </div>
      )}

      {/* 자기소개서 탭 */}
      {activeTab === "coverletter" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <label style={{ fontSize: 13, color: "#475569" }}>글자 수 제한:</label>
            <input
              type="number"
              placeholder="예: 1000"
              value={charLimit}
              onChange={(e) => setCharLimit(e.target.value)}
              style={{ padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, width: 120 }}
            />
            <span style={{ fontSize: 12, color: "#94a3b8" }}>비워두면 제한 없음</span>
          </div>

          {(job.cover_letter_questions || []).length === 0 ? (
            <div style={{ background: "white", borderRadius: 12, padding: 32, textAlign: "center", color: "#94a3b8", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <PenTool size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p>자기소개서 문항이 없습니다.</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>공고 편집에서 문항을 직접 추가할 수 있습니다.</p>
            </div>
          ) : (
            (job.cover_letter_questions || []).map((q, idx) => {
              const existingCL = (job.cover_letters || []).find((cl) => cl.question === q);
              const isExpanded = expandedCL[idx];
              return (
                <div key={idx} style={{ background: "white", borderRadius: 12, padding: 20, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={{ display: "flex", gap: 10, flex: 1 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#4f46e5", background: "#eef2ff", padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>
                        문항 {idx + 1}
                      </span>
                      <p style={{ fontSize: 14, color: "#1e293b", fontWeight: 500, lineHeight: 1.5 }}>{q}</p>
                    </div>
                    <button
                      onClick={() => generateCoverLetter(q, idx)}
                      disabled={generatingIdx === idx}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "7px 14px", borderRadius: 8,
                        background: generatingIdx === idx ? "#e0e7ff" : "#4f46e5",
                        color: "white", border: "none", cursor: generatingIdx === idx ? "not-allowed" : "pointer",
                        fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", marginLeft: 12,
                      }}
                    >
                      <Sparkles size={13} />
                      {generatingIdx === idx ? "생성 중..." : (existingCL ? "재생성" : "AI 초안 생성")}
                    </button>
                  </div>

                  {existingCL && (
                    <div>
                      <button
                        onClick={() => setExpandedCL((p) => ({ ...p, [idx]: !isExpanded }))}
                        style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 12, color: "#475569" }}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {isExpanded ? "접기" : "초안 보기"}
                        {existingCL.char_limit && (
                          <span style={{ color: "#94a3b8" }}>({existingCL.answer?.length || 0} / {existingCL.char_limit}자)</span>
                        )}
                      </button>
                      {isExpanded && (
                        <div style={{ marginTop: 12, padding: 16, background: "#f8fafc", borderRadius: 8, fontSize: 13, color: "#334155", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                          {existingCL.answer}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 기업 분석 탭 */}
      {activeTab === "company" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button
              onClick={analyzeCompany}
              disabled={analyzingCompany || !job.company}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 8,
                background: analyzingCompany ? "#e0e7ff" : "#4f46e5",
                color: "white", border: "none", cursor: analyzingCompany ? "not-allowed" : "pointer",
                fontSize: 13, fontWeight: 600,
              }}
            >
              <Sparkles size={14} />
              {analyzingCompany ? "분석 중..." : "AI 기업 분석"}
            </button>
          </div>

          {companyInfo?.talent_profile ? (
            <div style={{ background: "white", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Target size={18} color="#4f46e5" />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>기업 분석 결과</h3>
              </div>
              <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.8 }}>
                <ReactMarkdown>{companyInfo.talent_profile}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div style={{ background: "white", borderRadius: 12, padding: 40, textAlign: "center", color: "#94a3b8", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <Target size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p>아직 기업 분석 정보가 없습니다.</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>AI 기업 분석 버튼을 눌러 인재상과 자기소개서 방향을 확인하세요.</p>
            </div>
          )}
        </div>
      )}

      {/* 뉴스 탭 */}
      {activeTab === "news" && (
        <div>
          {news.length === 0 ? (
            <div style={{ background: "white", borderRadius: 12, padding: 40, textAlign: "center", color: "#94a3b8", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <Newspaper size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p>뉴스를 불러오는 중이거나 결과가 없습니다.</p>
            </div>
          ) : (
            news.map((item, i) => (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  background: "white",
                  borderRadius: 10,
                  padding: "16px 20px",
                  marginBottom: 10,
                  textDecoration: "none",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                  transition: "box-shadow 0.15s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)"}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.08)"}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", lineHeight: 1.5 }}>{item.title}</h4>
                  <ExternalLink size={14} color="#94a3b8" style={{ flexShrink: 0, marginLeft: 12, marginTop: 2 }} />
                </div>
                {item.summary && (
                  <p style={{ fontSize: 12, color: "#64748b", marginTop: 6, lineHeight: 1.5 }}
                    dangerouslySetInnerHTML={{ __html: item.summary.replace(/<[^>]*>/g, "") }} />
                )}
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>
                  {item.source} · {item.published_at ? new Date(item.published_at).toLocaleDateString("ko-KR") : ""}
                </div>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div style={{ background: "white", borderRadius: 10, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, color: "#1e293b", fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function categoryColor(cat) {
  const m = { 대기업: "#4338ca", 공기업: "#065f46", 중견기업: "#92400e" };
  return m[cat] || "#374151";
}
function categoryBg(cat) {
  const m = { 대기업: "#eef2ff", 공기업: "#ecfdf5", 중견기업: "#fffbeb" };
  return m[cat] || "#f3f4f6";
}
