import React from "react";
import AppRouter from "./routes/AppRouter.jsx";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught render error:", error, errorInfo);
    const errorStr = String(error?.message || error || "").toLowerCase();
    if (errorStr.includes("failed to fetch dynamically imported module") || errorStr.includes("loading chunk")) {
      const reloaded = sessionStorage.getItem("fn_chunk_reloaded");
      if (!reloaded) {
        sessionStorage.setItem("fn_chunk_reloaded", "true");
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
          <div className="max-w-lg w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-4">
            <h2 className="text-xl font-extrabold text-slate-900">Application Recovered</h2>
            <p className="text-xs text-slate-500">A component render issue occurred:</p>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-left text-xs font-mono text-rose-800 overflow-x-auto">
              {this.state.error?.toString()}
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                }}
                className="rounded-xl bg-blue-600 text-white font-bold text-xs px-5 py-2.5 transition cursor-pointer border-0"
              >
                Try Re-rendering
              </button>
              <button
                onClick={() => {
                  window.location.href = "/";
                }}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 transition cursor-pointer border-0"
              >
                Go to Home →
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  );
}

export default App;

