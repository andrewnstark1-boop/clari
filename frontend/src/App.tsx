import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Stages from "./pages/Stages";
import ProblemDeals from "./pages/ProblemDeals";
import Managers from "./pages/Managers";
import Channels from "./pages/Channels";
import Analytics from "./pages/Analytics";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="stages" element={<Stages />} />
        <Route path="problems" element={<ProblemDeals />} />
        <Route path="managers" element={<Managers />} />
        <Route path="channels" element={<Channels />} />
        <Route path="analytics" element={<Analytics />} />
      </Route>
    </Routes>
  );
}
