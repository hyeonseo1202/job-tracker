import { Outlet, NavLink } from "react-router-dom";
import { Calendar, Building2, User, Plus, ClipboardList, Settings } from "lucide-react";

export default function Layout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      {/* 사이드바 */}
      <aside style={{
        width: 220,
        background: "#1e293b",
        color: "white",
        display: "flex",
        flexDirection: "column",
        padding: "24px 0",
        flexShrink: 0,
      }}>
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid #334155" }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9" }}>
            📋 취업 트래커
          </h1>
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>채용공고 관리 시스템</p>
        </div>

        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          <NavLink to="/" end style={navStyle}>
            <Calendar size={18} />
            캘린더
          </NavLink>
          <NavLink to="/companies" style={navStyle}>
            <Building2 size={18} />
            기업 관리
          </NavLink>
          <NavLink to="/applications" style={navStyle}>
            <ClipboardList size={18} />
            내 지원 내역
          </NavLink>
          <NavLink to="/profile" style={navStyle}>
            <User size={18} />
            내 정보
          </NavLink>
          <NavLink to="/preferences" style={navStyle}>
            <Settings size={18} />
            크롤링 설정
          </NavLink>
        </nav>

        <div style={{ padding: "16px 12px" }}>
          <NavLink
            to="/jobs/add"
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "#4f46e5", color: "white", borderRadius: 8,
              padding: "10px 14px", textDecoration: "none",
              fontSize: 14, fontWeight: 600,
            }}
          >
            <Plus size={16} />
            공고 추가
          </NavLink>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main style={{ flex: 1, overflow: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}

function navStyle({ isActive }) {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 8,
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 500,
    color: isActive ? "#e2e8f0" : "#94a3b8",
    background: isActive ? "#334155" : "transparent",
    transition: "all 0.15s",
  };
}
