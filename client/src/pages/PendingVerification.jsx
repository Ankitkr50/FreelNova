import { useAuth } from "../hooks/useAuth.js";
import { Link } from "react-router-dom";
import { ROUTES } from "../constants/routes.js";

function PendingVerification() {
  const { logout, user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white/5 border border-white/10 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-12 shadow-2xl overflow-hidden">
        {/* Decorative ambient gradients */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px]" />

        {/* Animated review sweep icon */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-xl animate-pulse" />
            <div className="relative flex items-center justify-center w-24 h-24 rounded-full border border-blue-400/50 bg-slate-800 text-blue-400">
              <svg className="w-12 h-12 animate-pulse" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
          </div>

          <h1 className="text-3xl font-black text-white tracking-tight">Verification Under Review</h1>
          <p className="mt-3 text-slate-300 text-sm max-w-md leading-relaxed">
            Thank you for completing your profile, <strong className="text-white">{user?.name}</strong>. Our administration team is currently verifying your credential documents.
          </p>

          {/* Details Card */}
          <div className="w-full mt-8 bg-slate-850/60 border border-white/5 rounded-2xl p-6 text-left space-y-4">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest border-b border-white/5 pb-2">Submitted Profile Details</h3>
            
            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <p className="text-slate-400">Profile Category</p>
                <p className="text-white font-bold capitalize mt-0.5">{user?.category || "Not Specified"}</p>
              </div>
              
              <div>
                <p className="text-slate-400">Registered Email</p>
                <p className="text-white font-semibold mt-0.5">{user?.email}</p>
              </div>

              <div className="sm:col-span-2 border-t border-white/5 pt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Compliance Documents</p>
                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3 space-y-1.5 text-slate-300">
                  <p>✓ Aadhaar & PAN Card submitted successfully</p>
                  <p>✓ Bank details recorded for secure escrow payouts</p>
                  {user?.category === "student" && <p>✓ School/College credentials pending validation</p>}
                  {user?.category === "company" && <p>✓ Company incorporation & registrar details registered</p>}
                  {user?.category === "employee" && <p>✓ Corporate employment identification card uploaded</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
            <button
              onClick={logout}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-xs text-white font-bold hover:bg-white/10 hover:border-white/20 transition cursor-pointer"
            >
              Sign Out / Switch Account
            </button>
            <Link
              to={ROUTES.HOME}
              className="w-full sm:w-auto text-center px-6 py-3 rounded-xl bg-blue-600 text-xs text-white font-bold hover:bg-blue-700 transition cursor-pointer"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PendingVerification;
