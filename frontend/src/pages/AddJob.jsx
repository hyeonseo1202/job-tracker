import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { jobsApi } from "../api";
import { Link2, Loader2, ArrowLeft } from "lucide-react";

export default function AddJob() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    url: "",
    title: "",
    company_name: "",
    deadline: "",
    department: "",
    job_type: "",
  });
  const [loading, setLoading] = useState(false);
  const [scraped, setScraped] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form };
      if (payload.deadline) payload.deadline = new Date(payload.deadline).toISOString();
      const res = await jobsApi.create(payload);
      setScraped(res.data.scraped);
      setTimeout(() => navigate(`/jobs/${res.data.id}`), 1500);
    } catch (err) {
      alert("오류: " + (err.response?.data?.detail || err.message));
    }
    setLoading(false);
  };

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div style={{ padding: 24, maxWidth: 640, margin: "0 auto" }}>
      <button
        onClick={() => navigate("/")}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, marginBottom: 20, padding: 0 }}
      >
        <ArrowLeft size={14} /> 뒤로
      </button>

      <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>채용 공고 추가</h2>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 28 }}>공고 URL을 입력하면 자동으로 내용을 분석합니다.</p>

      <form onSubmit={handleSubmit}>
        <Field label="공고 URL *" icon={<Link2 size={14} />}>
          <input
            required
            type="url"
            placeholder="https://..."
            value={form.url}
            onChange={set("url")}
            style={inputStyle}
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="기업명">
            <input placeholder="자동 감지" value={form.company_name} onChange={set("company_name")} style={inputStyle} />
          </Field>
          <Field label="공고 제목">
            <input placeholder="자동 감지" value={form.title} onChange={set("title")} style={inputStyle} />
          </Field>
          <Field label="부서/직무">
            <input placeholder="예: 개발팀, 마케팅" value={form.department} onChange={set("department")} style={inputStyle} />
          </Field>
          <Field label="고용 형태">
            <select value={form.job_type} onChange={set("job_type")} style={inputStyle}>
              <option value="">선택</option>
              <option value="신입">신입</option>
              <option value="경력">경력</option>
              <option value="인턴">인턴</option>
              <option value="계약직">계약직</option>
            </select>
          </Field>
        </div>

        <Field label="마감 일시">
          <input type="datetime-local" value={form.deadline} onChange={set("deadline")} style={inputStyle} />
        </Field>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%", padding: "12px", borderRadius: 10,
            background: loading ? "#a5b4fc" : "#4f46e5",
            color: "white", border: "none", cursor: loading ? "not-allowed" : "pointer",
            fontSize: 15, fontWeight: 700, marginTop: 8,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {loading ? (
            <>
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
              공고 분석 중...
            </>
          ) : "공고 추가 및 분석"}
        </button>
      </form>

      {scraped && (
        <div style={{ marginTop: 20, padding: 16, background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#15803d" }}>✅ 공고를 성공적으로 분석했습니다. 이동 중...</p>
          {scraped.title && <p style={{ fontSize: 12, color: "#16a34a", marginTop: 4 }}>제목: {scraped.title}</p>}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Field({ label, icon, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        {icon}{label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0",
  borderRadius: 8, fontSize: 13, color: "#1e293b", boxSizing: "border-box",
  outline: "none", background: "white",
};
