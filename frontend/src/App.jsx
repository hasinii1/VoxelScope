import { useState } from "react";
import Landing from "./Landing.jsx";
import Dashboard from "./Dashboard.jsx";
import Demo from "./Demo.jsx";
export default function App() {
  const [page, setPage] = useState("landing");
  if (page === "landing") return <Landing onStart={() => setPage("app")} />;
  const back = () => setPage("landing");
  return import.meta.env.VITE_DEMO ? <Demo onBack={back} /> : <Dashboard onHome={back} />;
}