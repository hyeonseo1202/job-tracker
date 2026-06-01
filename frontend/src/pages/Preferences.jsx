import { useEffect, useState } from "react";
import { preferencesApi } from "../api";
import { Save, Plus, Trash2, Filter } from "lucide-react";

const JOB_TYPE_OPTIONS = ["신입", "인턴", "채용연계형 인턴", "경력", "주니어"];
const LOCATION_OPTIONS = ["서울", "경기", "인천", "부산", "대전", "광주", "대구", "세종", "해외", "기타"];
const COMPANY_SIZE_OPTIONS = ["대기업", "공기업", "중견기업", "스타트업"];

const IT_CATEGORY_KEY = "IT직군";

export default function Preferences() {
  const [prefs, setPrefs] = useState({
    job_types: ["신입", "인턴", "채용연계형 인턴"],
    locations: ["서울", "경기"],
    categories: [],
    keywords: [],
    company_sizes: ["대기업", "공기업", "중견기업"],
    auto_crawl_enabled: true,
  });
  const [newKeyword, setNewKeyword] = useState("");
  const [sites, setSites] = useState([]);
  const [newSite, setNewSite] = useState({ name: "", url: "", selector: "" });
  const [saved, setSaved] = useState(false);
  const [filterMsg, setFilterMsg] = useState("");

  useEffect(() => {
    preferencesApi.get().then((r) => setPrefs(r.data));
    preferencesApi.getCareerSites().then((r) => setSites(r.data));
  }, []);

  const toggle = (field, value) => {
    setPrefs((p) => {
      const arr = p[field] || [];
      return {
        ...p,
        [field]: arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value],
      };
    });
  };

  const addKeyword = () => {
    const kw = newKeyword.trim();
    if (!kw || prefs.keywords.includes(kw)) return;
    setPrefs((p) => ({ ...p, keywords: [...p.keywords, kw] }));
    setNewKeyword("");
  };

  const removeKeyword = (kw) =>
    setPrefs((p) => ({ ...p, keywords: p.keywords.filter((k) => k !== kw) }));

  const savePrefs = async () => {
    const r = await preferencesApi.save(prefs);
    setSaved(true);
    const deleted = r.data?.deleted ?? 0;
    if (deleted > 0) setFilterMsg(`설정 기준에 맞지 않는 공고 ${deleted}개가 캘린더에서 삭제됐습니다.`);
    setTimeout(() => { setSaved(false); setFilterMsg(""); }, 4000);
  };

  const applyFilterNow = async () => {
    const r = await preferencesApi.applyFilter();
    const deleted = r.data?.deleted ?? 0;
    setFilterMsg(deleted > 0 ? `공고 ${deleted}개가 삭제됐습니다.` : "삭제할 공고가 없습니다.");
    setTimeout(() => setFilterMsg(""), 4000);
  };

  const addSite = async () => {
    if (!newSite.name || !newSite.url) return;
    await preferencesApi.addCareerSite(newSite.name, newSite.url, newSite.selector);
    const r = await preferencesApi.getCareerSites();
    setSites(r.data);
    setNewSite({ name: "", url: "", selector: "" });
  };

  const CheckGroup = ({ label, field, options }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map((opt) => {
          const active = (prefs[field] || []).includes(opt);
          return (
            <button
              key={opt}
              onClick={() => toggle(field, opt)}
              style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500,
                border: active ? "none" : "1px solid #e2e8f0",
                background: active ? "#1e293b" : "white",
                color: active ? "white" : "#64748b",
                cursor: "pointer",
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 700 }}>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>크롤링 설정</h2>
          <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>공고 필터 조건을 설정하세요 (매일 오전 8시 자동 크롤링)</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={applyFilterNow}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 8,
                background: "white", color: "#ef4444",
                border: "1px solid #fecaca", cursor: "pointer",
                fontSize: 13, fontWeight: 600,
              }}
            >
              <Filter size={14} />
              지금 필터 적용
            </button>
            <button
              onClick={savePrefs}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 8,
                background: saved ? "#16a34a" : "#1e293b",
                color: "white", border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600,
              }}
            >
              <Save size={14} />
              {saved ? "저장됨!" : "저장"}
            </button>
          </div>
          {filterMsg && (
            <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 600 }}>{filterMsg}</span>
          )}
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", marginBottom: 20 }}>
        {/* IT 직군 전용 필터 */}
        <div style={{ marginBottom: 20, padding: "14px 16px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>IT 직군 전용</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                개발·데이터·AI·보안 등 IT 관련 키워드가 없는 공고를 자동 삭제합니다
              </div>
            </div>
            <button
              onClick={() => {
                const isOn = (prefs.categories || []).includes(IT_CATEGORY_KEY);
                setPrefs((p) => ({
                  ...p,
                  categories: isOn
                    ? (p.categories || []).filter((c) => c !== IT_CATEGORY_KEY)
                    : [...(p.categories || []), IT_CATEGORY_KEY],
                }));
              }}
              style={{
                width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                background: (prefs.categories || []).includes(IT_CATEGORY_KEY) ? "#6366f1" : "#e2e8f0",
                position: "relative", transition: "background 0.2s", flexShrink: 0,
              }}
            >
              <span style={{
                position: "absolute", top: 2,
                left: (prefs.categories || []).includes(IT_CATEGORY_KEY) ? 22 : 2,
                width: 20, height: 20, borderRadius: "50%",
                background: "white", transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </button>
          </div>
        </div>

        <CheckGroup label="채용 유형" field="job_types" options={JOB_TYPE_OPTIONS} />
        <CheckGroup label="지역" field="locations" options={LOCATION_OPTIONS} />
        <CheckGroup label="기업 규모" field="company_sizes" options={COMPANY_SIZE_OPTIONS} />

        {/* 키워드 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>키워드 필터</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addKeyword()}
              placeholder="키워드 입력 후 Enter"
              style={{
                flex: 1, padding: "7px 12px", borderRadius: 8,
                border: "1px solid #e2e8f0", fontSize: 13, outline: "none",
              }}
            />
            <button
              onClick={addKeyword}
              style={{ padding: "7px 14px", borderRadius: 8, background: "#6366f1", color: "white", border: "none", cursor: "pointer", fontSize: 13 }}
            >
              추가
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(prefs.keywords || []).map((kw) => (
              <span
                key={kw}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "4px 10px", borderRadius: 20,
                  background: "#f1f5f9", fontSize: 12, color: "#475569",
                }}
              >
                {kw}
                <Trash2 size={11} style={{ cursor: "pointer", color: "#94a3b8" }} onClick={() => removeKeyword(kw)} />
              </span>
            ))}
          </div>
        </div>

        {/* 자동 크롤링 토글 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>매일 오전 8시 자동 크롤링</div>
          <button
            onClick={() => setPrefs((p) => ({ ...p, auto_crawl_enabled: !p.auto_crawl_enabled }))}
            style={{
              width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
              background: prefs.auto_crawl_enabled ? "#16a34a" : "#e2e8f0",
              position: "relative", transition: "background 0.2s",
            }}
          >
            <span style={{
              position: "absolute", top: 2,
              left: prefs.auto_crawl_enabled ? 22 : 2,
              width: 20, height: 20, borderRadius: "50%",
              background: "white", transition: "left 0.2s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </button>
        </div>
      </div>

      {/* 공기업 자체 채용 사이트 */}
      <div style={{ background: "white", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>공기업 자체 채용 사이트</h3>
        <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>자소설·인디스워크에 안 올라오는 공기업 채용 페이지를 등록하면 주기적으로 크롤링합니다.</p>

        {/* 기존 사이트 목록 */}
        {sites.map((s) => (
          <div key={s.id} style={{
            padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0",
            marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{s.name}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{s.url}</div>
              {s.last_crawled && (
                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                  마지막 크롤링: {new Date(s.last_crawled).toLocaleDateString("ko-KR")}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* 신규 추가 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          <input
            value={newSite.name}
            onChange={(e) => setNewSite((p) => ({ ...p, name: e.target.value }))}
            placeholder="기관명 (예: 한국선급)"
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}
          />
          <input
            value={newSite.url}
            onChange={(e) => setNewSite((p) => ({ ...p, url: e.target.value }))}
            placeholder="채용 페이지 URL"
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}
          />
          <input
            value={newSite.selector}
            onChange={(e) => setNewSite((p) => ({ ...p, selector: e.target.value }))}
            placeholder="CSS 셀렉터 (선택, 예: .recruit-list a)"
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}
          />
          <button
            onClick={addSite}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "9px", borderRadius: 8, background: "#6366f1", color: "white",
              border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}
          >
            <Plus size={14} />
            사이트 추가
          </button>
        </div>
      </div>
    </div>
  );
}
