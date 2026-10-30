import { Provider } from "react-redux";
import { store } from "./store";
import { AuthGate, Team } from "./pages/Account";
import Calendar from "./pages/Calendar";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { MotionConfig } from "framer-motion";
import AppLayout from "./layouts/AppLayout";
import Overview from "./pages/Overview";
import Posts from "./pages/Posts";
import Pipeline from "./pages/Pipeline";
import { Retry, Dlq, Idempotency } from "./pages/Labs";
import History from "./pages/History";
import Architecture from "./pages/Architecture";
import { useLive } from "./hooks/useLive";
import "./styles.css";
function App() {
  const { data: health, error } = useLive("/system/health", 5000);
  return (
    <AppLayout health={health} disconnected={!!error}>
      <Routes>
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/team" element={<Team />} />
        <Route path="/" element={<Overview health={health} />} />
        <Route path="/posts" element={<Posts />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/retry" element={<Retry />} />
        <Route path="/dlq" element={<Dlq />} />
        <Route path="/idempotency" element={<Idempotency />} />
        <Route path="/history" element={<History />} />
        <Route path="/architecture" element={<Architecture />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Provider store={store}>
          <AuthGate>
            <App />
          </AuthGate>
        </Provider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#1b2032",
              color: "#eef0f8",
              border: "1px solid #343b51",
            },
            duration: 4000,
          }}
        />
      </BrowserRouter>
    </MotionConfig>
  </React.StrictMode>,
);
