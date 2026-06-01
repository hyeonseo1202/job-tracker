import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jobsApi, preferencesApi } from "../api";

const STATUS_LIST = [
  "지원 예정", "지원 완", "서류 합격", "서류 탈", "필기", "면접", "최종 합격", "최종 탈", "비어 있음"
];

const STATUS_COLORS = {
  "지원 예정":  { bg: "#eff6ff", text: "#3b82f6", border: "#bfdbfe" },
  "지원 완":    { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  "서류 합격":  { bg: "#f0fdf4", text: "#15803d", border: "#86efac" },
  "서류 탈":    { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  "필기":       { bg: "#fefce8", text: "#ca8a04", border: "#fde68a" },
  "면접":       { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" },
  "최종 합격":  { bg: "#f0fdf4", text: "#166534", border: "#4ade80" },
  "최종 탈":    { bg: "#fef2f2", text: "#991b1b", border: "#fca5a5" },
  "비어 있음":  { bg: "#f8fafc", text: "#94a3b8", border: "#e2e8f0" },
};

function daysUntil(deadline) {
  if (!deadline) return null;
  const diff = new Date(deadline) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function Applications() {
  const [jobs, setJobs] = useState([]);
  const [filter, setFilter] = useState("전체");
  const [updating, setUpdating] = useState(null);
  const navigate = useNavigate();

  const load = () =>
    jobsApi.list().then((r) => setJobs(r.data));

  useEffect(() => { load(); }, []);

  const changeStatus = async (jobId, status) => {
    setUpdating(jobId);
    try {
      await preferencesApi.updateJobStatus(jobId, { status });
      setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status } : j));
    } finally {
      setUpdating(null);
    }
  };

  const filtered = filter === "전체" ? jobs : jobs.filter((j) => j.status === filter);

  // D-day 기준 그룹
  const groups = [
    { label: "마감 임박 (7일 이내)", items: filtered.filter((j) => { const d = daysUntil(j.deadline); return d !== null && d <= 7 && d > 0; }) },
    { label: "2주 이내", items: filtered.filter((j) => { const d = daysUntil(j.deadline); return d !== null && d > 7 && d <= 14; }) },
    { label: "한 달 이내", items: filtered.filter((j) => { const d = daysUntil(j.deadline); return d !== null && d > 14 && d <= 30; }) },
    { label: "한 달 이후", items: filtered.filter((j) => { const d = daysUntil(j.deadline); return d !== null && d > 30; }) },
    { label: "마감일 미정", items: filtered.filter((j) => !j.deadline) },
  ];

  const total = jobs.length;
  const applied = jobs.filter((j) => ["지원 완", "서류 합격", "서류 탈", "필기", "면접", "최종 합격", "최종 탈"].includes(j.status)).length;
  const passed = jobs.filter((j) => ["서류 합격", "면접", "최종 합격"].includes(j.status)).length;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>내 지원 내역</h2>
        <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>지원한 공고의 진행 상황을 관리하세요</p>
      </div>

      {/* 요약 카드 */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {[
          { label: "전체 공고", value: total, color: "#6366f1" },
          { label: "지원 완료", value: applied, color: "#16a34a" },
          { label: "합격/진행 중", value: passed, color: "#ea580c" },
        ].map((s) => (
          <div key={s.label} style={{
            background: "white", borderRadius: 12, padding: "16px 20px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)", flex: 1,
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 상태 필터 탭 */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {["전체", ...STATUS_LIST].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: filter === s ? "none" : "1px solid #e2e8f0",
              background: filter === s ? "#1e293b" : "white",
              color: filter === s ? "white" : "#475569",
              cursor: "pointer",
            }}
          >
            {s}
            {s !== "전체" && (
              <span style={{ marginLeft: 4, opacity: 0.7 }}>
                {jobs.filter((j) => j.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 그룹별 공고 목록 */}
      {groups.map((group) => group.items.length > 0 && (
        <div key={group.label} style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
            {group.label} ({group.items.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {group.items.map((job) => {
              const days = daysUntil(job.deadline);
              const sc = STATUS_COLORS[job.status] || STATUS_COLORS["비어 있음"];
              return (
                <div
                  key={job.id}
                  style={{
                    background: "white", borderRadius: 10,
                    border: "1px solid #e2e8f0", padding: "14px 16px",
                    display: "flex", alignItems: "center", gap: 12,
                  }}
                >
                  {/* 클릭해서 상세 이동 */}
                  <div
                    style={{ flex: 1, cursor: "pointer" }}
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                        {job.company?.name || ""}
                      </span>
                      {days !== null && (
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          color: days <= 3 ? "#ef4444" : days <= 7 ? "#f97316" : "#64748b",
                          background: days <= 3 ? "#fef2f2" : days <= 7 ? "#fff7ed" : "#f1f5f9",
                          padding: "1px 7px", borderRadius: 20,
                        }}>
                          {days <= 0 ? "마감" : `D-${days}`}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{job.title}</div>
                    {job.deadline && (
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>
                        {new Date(job.deadline).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}
                      </div>
                    )}
                  </div>

                  {/* 상태 드롭다운 */}
                  <select
                    value={job.status || "지원 예정"}
                    disabled={updating === job.id}
                    onChange={(e) => changeStatus(job.id, e.target.value)}
                    style={{
                      padding: "5px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                      border: `1px solid ${sc.border}`,
                      background: sc.bg, color: sc.text,
                      cursor: "pointer", outline: "none",
                    }}
                  >
                    {STATUS_LIST.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", color: "#94a3b8", padding: "60px 0", fontSize: 14 }}>
          등록된 공고가 없습니다.
        </div>
      )}
    </div>
  );
}
