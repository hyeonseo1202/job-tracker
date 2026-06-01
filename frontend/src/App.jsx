import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import CalendarView from "./pages/CalendarView";
import JobDetail from "./pages/JobDetail";
import AddJob from "./pages/AddJob";
import UserProfile from "./pages/UserProfile";
import Companies from "./pages/Companies";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<CalendarView />} />
          <Route path="jobs/add" element={<AddJob />} />
          <Route path="jobs/:id" element={<JobDetail />} />
          <Route path="profile" element={<UserProfile />} />
          <Route path="companies" element={<Companies />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
