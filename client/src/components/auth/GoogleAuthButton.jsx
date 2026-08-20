import { useEffect, useRef, useState } from "react";

// Module-level: initialize Google GSI only once per page load.
let gsiInitialized = false;
let gsiLoadFailed = false;
let activeOnCredential = null;

function GoogleAuthButton({ text = "signin_with", onCredential, disabled = false }) {
  const containerRef = useRef(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // 0 = loading, 1 = ready, 2 = origin-error, 3 = no-client-id, 4 = load-failed
  const [state, setState] = useState(() => {
    if (!clientId) return 3;
    if (gsiLoadFailed) return 4;
    return 0;
  });

  activeOnCredential = onCredential;

  useEffect(() => {
    if (!clientId || disabled) return;
    if (gsiLoadFailed) { setState(4); return; }

    const renderButton = () => {
      if (!window.google?.accounts?.id || !containerRef.current) return;

      try {
        if (!gsiInitialized) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => {
              if (response?.credential && typeof activeOnCredential === "function") {
                activeOnCredential(response.credential);
              }
            },
          });
          gsiInitialized = true;
        }

        containerRef.current.innerHTML = "";
        const width = Math.min(containerRef.current.offsetWidth || 360, 420);
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          width,
          text,
        });
        setState(1);

        // Detect the 403 origin error from Google's iframe AFTER render.
        // The iframe posts a message when it fails to load due to origin mismatch.
        const onMessage = (e) => {
          if (
            typeof e.data === "string" &&
            (e.data.includes("origin") || e.data.includes("not allowed"))
          ) {
            setState(2);
          }
        };
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
      } catch {
        setState(4);
      }
    };

    if (window.google?.accounts?.id) {
      renderButton();
      return;
    }

    // Script already being loaded by another instance — poll for it.
    if (document.querySelector('script[src*="accounts.google.com/gsi"]')) {
      const poll = setInterval(() => {
        if (window.google?.accounts?.id) { clearInterval(poll); renderButton(); }
        if (gsiLoadFailed) { clearInterval(poll); setState(4); }
      }, 100);
      return () => clearInterval(poll);
    }

    // First mount — inject GSI script.
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderButton;
    script.onerror = () => {
      gsiLoadFailed = true;
      setState(4);
    };
    document.head.appendChild(script);

    return () => { script.onload = null; script.onerror = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, disabled, text]);

  // ── No client ID configured ───────────────────────────────────────────────
  if (!clientId || state === 3) return null;

  // ── Origin not whitelisted (403 from Google) ──────────────────────────────
  if (state === 2) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
        <p className="font-semibold">Google Sign-In unavailable</p>
        <p className="mt-1 text-xs text-amber-700">
          Add <code className="rounded bg-amber-100 px-1 font-mono">http://localhost:5173</code> to your{" "}
          <a
            className="underline"
            href="https://console.cloud.google.com/apis/credentials"
            rel="noopener noreferrer"
            target="_blank"
          >
            Google OAuth origins
          </a>
          . Use email/password in the meantime.
        </p>
      </div>
    );
  }

  // ── Script failed to load (network issue) ────────────────────────────────
  if (state === 4) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-500">
        Google Sign-In could not load. Use email/password instead.
      </div>
    );
  }

  // ── Loading / ready ───────────────────────────────────────────────────────
  return (
    <div className="relative flex w-full justify-center">
      {state === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-500" />
        </div>
      )}
      <div
        className={`w-full transition-opacity duration-200 ${state === 0 ? "opacity-0" : "opacity-100"}`}
        ref={containerRef}
      />
    </div>
  );
}

export default GoogleAuthButton;
