import { useEffect, useState } from "react";
import { companiesApi } from "../api";
import { Plus, Building2, Edit2, Save, X } from "lucide-react";

const CATEGORIES = ["대기업", "공기업", "중견기업", "스타트업", "기타"];

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", category: "대기업", website: "" });

  useEffect(() => {
    load();
  }, []);

  const load = () => companiesApi.list().then((r) => setCompanies(r.data));

  const addCompany = async () => {
    await companiesApi.create(newForm);
    setShowAdd(false);
    setNewForm({ name: "", category: "대기업", website: "" });
    load();
  };

  const saveEdit = async () => {
    await companiesApi.update(editing.id, editing);
    setEditing(null);
    load();
  };

  return (
    <div style={{ padding: 24, maxWidth: 860, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>기업 관리</h2>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>기업별 인재상과 자기소개서 전략을 관리합니다.</p>
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
        <div key={company.id} style={{ background: "white", borderRadius: 12, padding: 20, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          {editing?.id === company.id ? (
            <EditForm
              data={editing}
              onChange={setEditing}
              onSave={saveEdit}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Building2 size={20} color="#4f46e5" />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{company.name}</div>
                    {company.category && (
                      <span style={{ fontSize: 11, color: categoryColor(company.category), background: categoryBg(company.category), padding: "1px 8px", borderRadius: 10, fontWeight: 600 }}>
                        {company.category}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setEditing({ ...company, talent_profile: "", cover_letter_tips: "" })}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontSize: 12, color: "#475569" }}
                >
                  <Edit2 size={12} /> 편집
                </button>
              </div>
            </div>
          )}
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

function EditForm({ data, onChange, onSave, onCancel }) {
  const set = (k) => (e) => onChange((p) => ({ ...p, [k]: e.target.value }));
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>기업명</label>
          <input value={data.name} onChange={set("name")} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>분류</label>
          <select value={data.category || ""} onChange={set("category")} style={inputStyle}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>웹사이트</label>
          <input value={data.website || ""} onChange={set("website")} style={inputStyle} />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>인재상 (직접 입력 또는 AI 분석 결과)</label>
        <textarea value={data.talent_profile || ""} onChange={set("talent_profile")} rows={4} style={{ ...inputStyle, resize: "vertical" }} placeholder="AI 분석을 통해 자동으로 채워지거나 직접 입력할 수 있습니다." />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>자기소개서 작성 방향 메모</label>
        <textarea value={data.cover_letter_tips || ""} onChange={set("cover_letter_tips")} rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="이 기업에 지원할 때 강조해야 할 포인트를 메모하세요." />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onSave} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 16px", background: "#4f46e5", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          <Save size={14} /> 저장
        </button>
        <button onClick={onCancel} style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, color: "#64748b" }}>
          취소
        </button>
      </div>
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
