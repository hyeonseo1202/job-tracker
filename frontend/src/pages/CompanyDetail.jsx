import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { companiesApi, aiApi } from "../api";
import {
  ArrowLeft, ExternalLink, Sparkles, Save, Newspaper,
  Target, PenTool, Briefcase, Edit2, X, ChevronDown, ChevronUp
} from "lucide-react";

const CATEGORIES = ["대기업", "공기업", "중견기업", "스타트업", "기타"];

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [news, setNews] = useState([]);
  const [coverLetters, setCoverLetters] = useState([]);
  const [activeTab, setActiveTab] = useState("info");
  const [analyzing, setAnalyzing] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [recommendation, setRecommendation] = useState("");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [expandedCL, setExpandedCL] = useState({});
  const [editingCL, setEditingCL] = useState(null); // {id, answer}

  const load = async () => {
    const [cRes, jRes, clRes] = await Promise.all([
      companiesApi.get(id),
      companiesApi.jobs(id),
      companiesApi.coverLetters(id),
    ]);
    setCompany(cRes.data);
    setEditForm(cRes.data);
    setJobs(jRes.data);
    setCoverLetters(clRes.data);
  };

  useEffect(() => { load(); }, [id]);

  const loadNews = () => {
    if (news.length === 0) {
      companiesApi.news(id).then((r) => setNews(r.data)).catch(() => {});
    }
  };

  useEffect(() => {
    if (activeTab === "news") loadNews();
  }, [activeTab]);

  const analyzeCompany = async () => {
    setAnalyzing(true);
    try {
      await aiApi.analyzeCompany({ company_id: parseInt(id) });
      const r = await companiesApi.get(id);
      setCompany(r.data);
      setEditForm(r.data);
    } catch (e) {
      alert("분석 오류: " + (e.response?.data?.detail || e.message));
    }
    setAnalyzing(false);
  };

  const getRecommendation = async () => {
    setRecommending(true);
    try {
      const r = await aiApi.recommendJobs(id);
      setRecommendation(r.data.recommendation);
    } catch (e) {
      alert("추천 오류: " + (e.response?.data?.detail || e.message));
    }
    setRecommending(false);
  };

  const saveEdit = async () => {
    await companiesApi.update(id, {
      category: editForm.category,
      talent_profile: editForm.talent_profile,
      cover_letter_tips: editForm.cover_letter_tips,
      website: editForm.website,
    });
    setEditing(false);
    const r = await companiesApi.get(id);
    setCompany(r.data);
  };

  const saveCL = async (clId, answer) => {
    await aiApi.updateCoverLetter(clId, answer);
    const r = await companiesApi.coverLetters(id);
    setCoverLetters(r.data);
    setEditingCL(null);
  };

  if (!company) return <div style={{ padding: 40, color: "#64748b" }}>불러오는 중...</div>;

  const tabs = [
    { key: "info", label: "기업 정보", icon: "🏢" },
    { key: "jobs", label: `공고 (${jobs.length})`, icon: "📋" },
    { key: "coverletter", label: `자기소개서 (${coverLetters.length})`, icon: "✍️" },
    { key: "news", label: "뉴스", icon: "📰" },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      {/* 헤더 */}
      <button
        onClick={() => navigate("/companies")}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, marginBottom: 16, padding: 0 }}
      >
        <ArrowLeft size={14} /> 기업 목록으로
      </button>

      <div style={{ background: "white", borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
        {editing ? (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>분류</label>
                <select value={editForm.category || ""} onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))} style={inputStyle}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>웹사이트</label>
                <input value={editForm.website || ""} onChange={(e) => setEditForm((p) => ({ ...p, website: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>인재상 / AI 분석 메모</label>
              <textarea value={editForm.talent_profile || ""} onChange={(e) => setEditForm((p) => ({ ...p, talent_profile: e.target.value }))} rows={5} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>자기소개서 작성 방향</label>
              <textarea value={editForm.cover_letter_tips || ""} onChange={(e) => setEditForm((p) => ({ ...p, cover_letter_tips: e.target.value }))} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveEdit} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 16px", background: "#4f46e5", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                <Save size={14} /> 저장
              </button>
              <button onClick={() => setEditing(false)} style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, color: "#64748b" }}>
                취소
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>{company.name}</h1>
                {company.category && (
                  <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 20, fontWeight: 600, color: catColor(company.category), background: catBg(company.category) }}>
                    {company.category}
                  </span>
                )}
              </div>
              {company.website && (
                <a href={company.website} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 13, color: "#6366f1", display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
                  <ExternalLink size={13} /> {company.website}
                </a>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={analyzeCompany}
                disabled={analyzing}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: analyzing ? "#e0e7ff" : "#4f46e5", color: "white", border: "none", cursor: analyzing ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}
              >
                <Sparkles size={14} />
                {analyzing ? "분석 중..." : "AI 기업 분석"}
              </button>
              <button
                onClick={() => setEditing(true)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontSize: 13, color: "#475569" }}
              >
                <Edit2 size={13} /> 편집
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #e2e8f0", marginBottom: 24 }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "10px 18px", border: "none", background: "none", cursor: "pointer",
              fontSize: 14, fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? "#4f46e5" : "#64748b",
              borderBottom: activeTab === tab.key ? "2px solid #4f46e5" : "2px solid transparent",
              marginBottom: -2,
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 기업 정보 탭 */}
      {activeTab === "info" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {company.talent_profile ? (
            <div style={{ background: "white", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Target size={17} color="#4f46e5" />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>인재상 / 기업 분석</h3>
              </div>
              <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.8 }}>
                <ReactMarkdown>{company.talent_profile}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div style={{ background: "white", borderRadius: 12, padding: 40, textAlign: "center", color: "#94a3b8", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <Target size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p>AI 기업 분석 버튼을 눌러 인재상과 자기소개서 방향을 확인하세요.</p>
            </div>
          )}
          {company.cover_letter_tips && (
            <div style={{ background: "white", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>✍️ 자기소개서 작성 방향</h3>
              <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{company.cover_letter_tips}</p>
            </div>
          )}
        </div>
      )}

      {/* 공고 탭 */}
      {activeTab === "jobs" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button
              onClick={getRecommendation}
              disabled={recommending || jobs.length === 0}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: recommending ? "#e0e7ff" : "#6366f1", color: "white", border: "none", cursor: recommending || jobs.length === 0 ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}
            >
              <Sparkles size={14} />
              {recommending ? "분석 중..." : "AI 공고 추천"}
            </button>
          </div>

          {recommendation && (
            <div style={{ background: "#fafbff", borderRadius: 12, padding: 20, border: "1px solid #c7d2fe", marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#4338ca", marginBottom: 10 }}>🤖 AI 공고 분석 결과</h3>
              <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.8 }}>
                <ReactMarkdown>{recommendation}</ReactMarkdown>
              </div>
            </div>
          )}

          {jobs.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 14 }}>등록된 공고가 없습니다.</div>
          ) : (
            jobs.map((job) => {
              const days = job.deadline ? Math.ceil((new Date(job.deadline) - new Date()) / 86400000) : null;
              return (
                <div
                  key={job.id}
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  style={{
                    background: "white", borderRadius: 10, padding: "14px 16px", marginBottom: 10,
                    border: "1px solid #e2e8f0", cursor: "pointer",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    transition: "box-shadow 0.15s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 3 }}>{job.title}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {[job.department, job.job_type].filter(Boolean).join(" · ")}
                    </div>
                    {job.deadline && (
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>
                        마감: {new Date(job.deadline).toLocaleDateString("ko-KR")}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {days !== null && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                        color: days <= 0 ? "#94a3b8" : days <= 7 ? "#ef4444" : "#22c55e",
                        background: days <= 0 ? "#f1f5f9" : days <= 7 ? "#fef2f2" : "#f0fdf4",
                      }}>
                        {days <= 0 ? "마감" : `D-${days}`}
                      </span>
                    )}
                    <StatusBadge status={job.status} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 자기소개서 탭 */}
      {activeTab === "coverletter" && (
        <div>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
            이 기업 공고에 작성한 자기소개서 목록입니다. AI 초안 생성 시 이 내용이 자동으로 참고됩니다.
          </p>
          {coverLetters.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
              <PenTool size={32} style={{ marginBottom: 10, opacity: 0.3 }} />
              <p>작성된 자기소개서가 없습니다.</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>공고 상세 페이지에서 AI 초안을 생성할 수 있습니다.</p>
            </div>
          ) : (
            coverLetters.map((cl) => {
              const isOpen = expandedCL[cl.id];
              const isEditingThis = editingCL?.id === cl.id;
              return (
                <div key={cl.id} style={{ background: "white", borderRadius: 12, padding: 20, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                        {cl.job_title} · {cl.is_draft ? "초안" : "완성"}
                        {cl.char_limit && ` · ${cl.answer?.length || 0}/${cl.char_limit}자`}
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "#1e293b", lineHeight: 1.5 }}>{cl.question}</p>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginLeft: 12 }}>
                      <button
                        onClick={() => setExpandedCL((p) => ({ ...p, [cl.id]: !isOpen }))}
                        style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontSize: 12, color: "#475569", display: "flex", alignItems: "center", gap: 4 }}
                      >
                        {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        {isOpen ? "접기" : "보기"}
                      </button>
                      {isOpen && !isEditingThis && (
                        <button
                          onClick={() => setEditingCL({ id: cl.id, answer: cl.answer || "" })}
                          style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontSize: 12, color: "#475569" }}
                        >
                          편집
                        </button>
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    isEditingThis ? (
                      <div>
                        <textarea
                          value={editingCL.answer}
                          onChange={(e) => setEditingCL((p) => ({ ...p, answer: e.target.value }))}
                          rows={10}
                          style={{ width: "100%", padding: "12px", border: "1px solid #c7d2fe", borderRadius: 8, fontSize: 13, lineHeight: 1.8, resize: "vertical", boxSizing: "border-box", outline: "none" }}
                        />
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          <button onClick={() => saveCL(cl.id, editingCL.answer)} style={{ padding: "7px 14px", background: "#4f46e5", color: "white", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>저장</button>
                          <button onClick={() => setEditingCL(null)} style={{ padding: "7px 14px", background: "#f1f5f9", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 13, color: "#64748b" }}>취소</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: "14px 16px", background: "#f8fafc", borderRadius: 8, fontSize: 13, color: "#334155", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                        {cl.answer || "(내용 없음)"}
                      </div>
                    )
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 뉴스 탭 */}
      {activeTab === "news" && (
        <div>
          {news.length === 0 ? (
            <div style={{ background: "white", borderRadius: 12, padding: 40, textAlign: "center", color: "#94a3b8", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <Newspaper size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p>뉴스를 불러오는 중입니다...</p>
            </div>
          ) : (
            news.map((item, i) => (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block", background: "white", borderRadius: 10, padding: "16px 20px",
                  marginBottom: 10, textDecoration: "none", boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
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

function StatusBadge({ status }) {
  const colors = {
    "지원 완": { bg: "#f0fdf4", text: "#16a34a" },
    "서류 합격": { bg: "#f0fdf4", text: "#15803d" },
    "서류 탈": { bg: "#fef2f2", text: "#dc2626" },
    "면접": { bg: "#fff7ed", text: "#ea580c" },
    "최종 합격": { bg: "#f0fdf4", text: "#166534" },
    "최종 탈": { bg: "#fef2f2", text: "#991b1b" },
  };
  if (!status || !colors[status]) return null;
  const c = colors[status];
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: c.bg, color: c.text }}>
      {status}
    </span>
  );
}

const labelStyle = { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 };
const inputStyle = { width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 13, color: "#1e293b", boxSizing: "border-box", background: "white" };

function catColor(cat) {
  const m = { 대기업: "#4338ca", 공기업: "#065f46", 중견기업: "#92400e" };
  return m[cat] || "#374151";
}
function catBg(cat) {
  const m = { 대기업: "#eef2ff", 공기업: "#ecfdf5", 중견기업: "#fffbeb" };
  return m[cat] || "#f3f4f6";
}
