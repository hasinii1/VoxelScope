import { useState } from "react";
import Landing from "./Landing.jsx";
import Dashboard from "./Dashboard.jsx";

export default function App() {
  const [page, setPage] = useState("landing");
  if (page === "landing") return <Landing onStart={() => setPage("app")} />;
  const back = () => setPage("landing");
  return <Dashboard onHome={back} />;
}