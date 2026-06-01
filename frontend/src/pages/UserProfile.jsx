import { useEffect, useState } from "react";
import { userApi } from "../api";
import { Plus, Trash2, Save } from "lucide-react";

const EMPTY_PROFILE = {
  name: "",
  education: "",
  major: "",
  gpa: "",
  experiences: [],
  activities: [],
  certifications: [],
  skills: [],
  languages: [],
  awards: [],
  projects: [],
  self_introduction: "",
  strengths: "",
  weaknesses: "",
  career_goal: "",
};

export default function UserProfile() {
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState("basic");

  useEffect(() => {
    userApi.getProfile().then((res) => {
      if (Object.keys(res.data).length > 0) {
        setProfile({ ...EMPTY_PROFILE, ...res.data });
      }
    });
  }, []);

  const save = async () => {
    await userApi.saveProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const set = (k) => (e) => setProfile((p) => ({ ...p, [k]: e.target.value }));

  const addListItem = (key) =>
    setProfile((p) => ({ ...p, [key]: [...(p[key] || []), ""] }));

  const updateListItem = (key, idx, val) =>
    setProfile((p) => {
      const arr = [...(p[key] || [])];
      arr[idx] = val;
      return { ...p, [key]: arr };
    });

  const removeListItem = (key, idx) =>
    setProfile((p) => ({ ...p, [key]: (p[key] || []).filter((_, i) => i !== idx) }));

  const sections = [
    { key: "basic", label: "기본 정보" },
    { key: "experience", label: "경력/활동" },
    { key: "skills", label: "스킬/자격" },
    { key: "essay", label: "자기소개" },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 760, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>내 정보 관리</h2>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>이 정보를 바탕으로 AI가 자기소개서 초안을 작성합니다.</p>
        </div>
        <button
          onClick={save}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "10px 20px", borderRadius: 8,
            background: saved ? "#22c55e" : "#4f46e5",
            color: "white", border: "none", cursor: "pointer",
            fontSize: 14, fontWeight: 600,
          }}
        >
          <Save size={15} />
          {saved ? "저장됨!" : "저장"}
        </button>
      </div>

      {/* 섹션 탭 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f1f5f9", borderRadius: 8, padding: 4 }}>
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            style={{
              flex: 1, padding: "8px", border: "none", cursor: "pointer", borderRadius: 6,
              background: activeSection === s.key ? "white" : "transparent",
              color: activeSection === s.key ? "#4f46e5" : "#64748b",
              fontWeight: activeSection === s.key ? 700 : 500,
              fontSize: 13,
              boxShadow: activeSection === s.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ background: "white", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>

        {activeSection === "basic" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <Field label="이름">
                <input value={profile.name} onChange={set("name")} style={inputStyle} />
              </Field>
              <Field label="학교/학력">
                <input value={profile.education} onChange={set("education")} placeholder="예: OO대학교" style={inputStyle} />
              </Field>
              <Field label="전공">
                <input value={profile.major} onChange={set("major")} style={inputStyle} />
              </Field>
              <Field label="학점 (GPA)">
                <input value={profile.gpa} onChange={set("gpa")} placeholder="예: 4.1/4.5" style={inputStyle} />
              </Field>
            </div>
            <Field label="취업 목표 / 커리어 비전">
              <textarea value={profile.career_goal} onChange={set("career_goal")}
                rows={3} placeholder="어떤 분야에서 어떻게 성장하고 싶은지 기술해주세요."
                style={{ ...inputStyle, resize: "vertical" }} />
            </Field>
          </div>
        )}

        {activeSection === "experience" && (
          <div>
            <ListSection
              title="경력 / 인턴 경험"
              items={profile.experiences}
              onAdd={() => addListItem("experiences")}
              onUpdate={(i, v) => updateListItem("experiences", i, v)}
              onRemove={(i) => removeListItem("experiences", i)}
              placeholder="예: OO회사 마케팅 인턴 (2024.07 ~ 2024.08) - 주요 업무 기술"
            />
            <ListSection
              title="대외 활동"
              items={profile.activities}
              onAdd={() => addListItem("activities")}
              onUpdate={(i, v) => updateListItem("activities", i, v)}
              onRemove={(i) => removeListItem("activities", i)}
              placeholder="예: OO 서포터즈 7기 (2024.03 ~ 2024.06)"
            />
            <ListSection
              title="프로젝트"
              items={profile.projects}
              onAdd={() => addListItem("projects")}
              onUpdate={(i, v) => updateListItem("projects", i, v)}
              onRemove={(i) => removeListItem("projects", i)}
              placeholder="예: React 기반 웹앱 개발 (팀장, 기여도 60%) - 주요 성과"
            />
            <ListSection
              title="수상 / 성과"
              items={profile.awards}
              onAdd={() => addListItem("awards")}
              onUpdate={(i, v) => updateListItem("awards", i, v)}
              onRemove={(i) => removeListItem("awards", i)}
              placeholder="예: OO 공모전 대상 (2024.05)"
            />
          </div>
        )}

        {activeSection === "skills" && (
          <div>
            <ListSection
              title="보유 스킬"
              items={profile.skills}
              onAdd={() => addListItem("skills")}
              onUpdate={(i, v) => updateListItem("skills", i, v)}
              onRemove={(i) => removeListItem("skills", i)}
              placeholder="예: Python, React, SQL, Figma"
            />
            <ListSection
              title="어학 능력"
              items={profile.languages}
              onAdd={() => addListItem("languages")}
              onUpdate={(i, v) => updateListItem("languages", i, v)}
              onRemove={(i) => removeListItem("languages", i)}
              placeholder="예: 영어 - TOEIC 950 (2024.03)"
            />
            <ListSection
              title="자격증"
              items={profile.certifications}
              onAdd={() => addListItem("certifications")}
              onUpdate={(i, v) => updateListItem("certifications", i, v)}
              onRemove={(i) => removeListItem("certifications", i)}
              placeholder="예: 정보처리기사 (2024.06)"
            />
          </div>
        )}

        {activeSection === "essay" && (
          <div>
            <Field label="핵심 강점 (AI가 자기소개서 작성 시 활용)">
              <textarea value={profile.strengths} onChange={set("strengths")}
                rows={4} placeholder="구체적인 경험과 함께 본인의 강점을 기술해주세요."
                style={{ ...inputStyle, resize: "vertical" }} />
            </Field>
            <Field label="보완점 / 성장 스토리">
              <textarea value={profile.weaknesses} onChange={set("weaknesses")}
                rows={3} placeholder="약점을 어떻게 극복하고 있는지 작성해주세요."
                style={{ ...inputStyle, resize: "vertical" }} />
            </Field>
            <Field label="기본 자기소개 (AI 초안 작성의 기반)">
              <textarea value={profile.self_introduction} onChange={set("self_introduction")}
                rows={6} placeholder="본인을 소개하는 자유로운 글을 작성해주세요. AI가 이를 참고하여 맞춤형 자기소개서를 작성합니다."
                style={{ ...inputStyle, resize: "vertical" }} />
            </Field>
          </div>
        )}
      </div>
    </div>
  );
}

function ListSection({ title, items, onAdd, onUpdate, onRemove, placeholder }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>{title}</h3>
        <button
          onClick={onAdd}
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontSize: 12, color: "#475569" }}
        >
          <Plus size={12} /> 추가
        </button>
      </div>
      {(items || []).map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            value={item}
            onChange={(e) => onUpdate(i, e.target.value)}
            placeholder={placeholder}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={() => onRemove(i)}
            style={{ padding: "8px", border: "1px solid #fecaca", borderRadius: 6, background: "#fef2f2", cursor: "pointer", color: "#ef4444" }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      {(items || []).length === 0 && (
        <p style={{ fontSize: 12, color: "#94a3b8", padding: "10px 0" }}>항목이 없습니다. 추가 버튼을 눌러 입력하세요.</p>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0",
  borderRadius: 8, fontSize: 13, color: "#1e293b", boxSizing: "border-box",
  outline: "none", background: "white",
};
