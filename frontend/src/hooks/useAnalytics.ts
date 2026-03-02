import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";

function getSessionId(): string {
  let sid = sessionStorage.getItem("clari_sid");
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("clari_sid", sid);
    // Fire session_start once per session
    sendEvent("session_start", "/", sid, {});
  }
  return sid;
}

function sendEvent(
  event_name: string,
  page: string,
  session_id: string,
  properties: Record<string, unknown>
) {
  return axios.post("/api/analytics/event", { event_name, page, session_id, properties })
    .catch(() => {}); // Never break the app over analytics
}

// For use outside React components (e.g. filter changes)
export function trackFeatureEvent(
  event_name: string,
  page: string,
  properties: Record<string, unknown>
) {
  const sid = sessionStorage.getItem("clari_sid") ?? "unknown";
  sendEvent(event_name, page, sid, properties);
}

export function useAnalytics() {
  const location = useLocation();
  const enterTimeRef = useRef<number>(Date.now());
  const prevPageRef = useRef<string>("");

  useEffect(() => {
    const sid = getSessionId();
    const now = Date.now();

    // Send page_leave for the previous page with time spent
    if (prevPageRef.current) {
      const timeSpent = Math.round((now - enterTimeRef.current) / 1000);
      sendEvent("page_leave", prevPageRef.current, sid, { time_spent_seconds: timeSpent });
    }

    // Track new page_view
    sendEvent("page_view", location.pathname, sid, {});

    prevPageRef.current = location.pathname;
    enterTimeRef.current = now;
  }, [location.pathname]);

  // Track final page leave when user closes the tab
  useEffect(() => {
    const handleUnload = () => {
      const sid = sessionStorage.getItem("clari_sid") ?? "unknown";
      const timeSpent = Math.round((Date.now() - enterTimeRef.current) / 1000);
      // sendBeacon works even when page is closing
      navigator.sendBeacon(
        "/api/analytics/event",
        JSON.stringify({
          event_name: "page_leave",
          page: prevPageRef.current,
          session_id: sid,
          properties: { time_spent_seconds: timeSpent },
        })
      );
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);
}
