import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ScreeningProvider } from "@/providers/ScreeningContext";
import { SecurityErrorBoundary } from "@/components/common/SecurityErrorBoundary";
import { AppRouter } from "@/router";
import "@/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Real-time automatic query synchronization across tabs and events
if (typeof window !== "undefined") {
  const invalidateAllCaseQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["cases"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["reports"] });
    queryClient.invalidateQueries({ queryKey: ["screening_cases"] });
  };
  window.addEventListener("trustgate:case_saved", invalidateAllCaseQueries);
  window.addEventListener("cases_changed", invalidateAllCaseQueries);
  window.addEventListener("tg:db_updated", invalidateAllCaseQueries);
  window.addEventListener("storage", (e) => {
    if (e.key === "tg:last_db_change") invalidateAllCaseQueries();
  });
  if (typeof BroadcastChannel !== "undefined") {
    try {
      const bc = new BroadcastChannel("trustgate_live_events");
      bc.onmessage = () => invalidateAllCaseQueries();
    } catch {}
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <ScreeningProvider>
              <SecurityErrorBoundary>
                <AppRouter />
              </SecurityErrorBoundary>
            </ScreeningProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
