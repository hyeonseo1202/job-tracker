import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { companiesApi } from "../api";
import { Plus, Building2, Save, X, ChevronRight } from "lucide-react";

const CATEGORIES = ["대기업", "공기업", "중견기업", "스타트업", "기타"];

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", category: "대기업", website: "" });
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);
  const load = () => companiesApi.list().then((r) => setCompanies(r.data));

  const addCompany = async () => {
    if (!newForm.name.trim()) return;
    await companiesApi.create(newForm);
    setShowAdd(false);
    setNewForm({ name: "", category: "대기업", website: "" });
    load();
  };

  return (
    <div style={{ padding: 24, maxWidth: 860, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>기업 관리</h2>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>기업을 클릭하면 상세 정보, 공고, 자기소개서를 확인할 수 있습니다.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, background: "#4f46e5", color: "white", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
        >
          <Plus size={15} /> 기업 추가
        </button>
      </div>

      {showAdd && (
        <div style={{ background: "white", borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: "2px solid #4f46e5" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: "#0f172a" }}>새 기업 추가</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto auto", gap: 10, alignItems: "end" }}>
            <div>
              <label style={labelStyle}>기업명 *</label>
              <input value={newForm.name} onChange={(e) => setNewForm((p) => ({ ...p, name: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>분류</label>
              <select value={newForm.category} onChange={(e) => setNewForm((p) => ({ ...p, category: e.target.value }))} style={inputStyle}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>웹사이트</label>
              <input value={newForm.website} onChange={(e) => setNewForm((p) => ({ ...p, website: e.target.value }))} placeholder="https://..." style={inputStyle} />
            </div>
            <button onClick={addCompany} style={{ padding: "9px 16px", background: "#4f46e5", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
              <Save size={14} /> 저장
            </button>
            <button onClick={() => setShowAdd(false)} style={{ padding: "9px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer", color: "#64748b" }}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {companies.map((company) => (
        <div
          key={company.id}
          onClick={() => navigate(`/companies/${company.id}`)}
          style={{
            background: "white", borderRadius: 12, padding: "16px 20px", marginBottom: 10,
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            transition: "box-shadow 0.15s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"}
          onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.08)"}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Building2 size={20} color="#6366f1" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{company.name}</div>
              {company.category && (
                <span style={{ fontSize: 11, color: categoryColor(company.category), background: categoryBg(company.category), padding: "1px 8px", borderRadius: 10, fontWeight: 600 }}>
                  {company.category}
                </span>
              )}
            </div>
          </div>
          <ChevronRight size={16} color="#94a3b8" />
        </div>
      ))}

      {companies.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
          <Building2 size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p>등록된 기업이 없습니다.</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>공고를 추가하면 자동으로 기업이 등록됩니다.</p>
        </div>
      )}
    </div>
  );
}

const labelStyle = { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 };
const inputStyle = { width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 13, color: "#1e293b", boxSizing: "border-box", background: "white" };

function categoryColor(cat) {
  const m = { 대기업: "#4338ca", 공기업: "#065f46", 중견기업: "#92400e" };
  return m[cat] || "#374151";
}
function categoryBg(cat) {
  const m = { 대기업: "#eef2ff", 공기업: "#ecfdf5", 중견기업: "#fffbeb" };
  return m[cat] || "#f3f4f6";
}
