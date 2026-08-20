import { useState } from "react";
import { useAuth } from "../../hooks/useAuth.js";
import { useRazorpay } from "../../hooks/useRazorpay.js";
import { paymentsApi } from "../../api/payments.api.js";

export default function FinePaymentModal() {
  const { user, refreshUser } = useAuth();
  const { openCheckout, loading: razorpayLoading } = useRazorpay();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });

  if (!user) return null;

  // Show modal if user is blocked or has pending fine
  const isFinePending = user.fineStatus === "PENDING" || (user.fineAmount > 0 && user.fineStatus !== "PAID" && user.fineStatus !== "WAIVED");
  const isBlocked = user.moderationStatus === "blocked" || user.moderationStatus === "suspended";

  if (!isBlocked && !isFinePending) {
    return null;
  }

  const fineAmount = user.fineAmount || 5000;
  const reasonText = user.fineReason || "Contact details sharing policy violation (Phone/Email/Social Handle)";

  const handlePayFine = async () => {
    setIsProcessing(true);
    setStatusMsg({ type: "", text: "" });

    try {
      const res = await paymentsApi.createFineOrder();
      const { orderId, amount, currency, keyId } = res.data.data;

      await openCheckout({
        orderId,
        amount,
        currency,
        keyId,
        name: "FreelNova Fine Clearance",
        description: "Administrative Fine Clearance & Account Unblock",
        prefillName: user.name || "",
        prefillEmail: user.email || "",
        onSuccess: async (response) => {
          try {
            await paymentsApi.verifyFinePayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            setStatusMsg({
              type: "success",
              text: "🎉 Fine payment verified successfully! Your account has been unblocked.",
            });

            if (refreshUser) {
              await refreshUser();
            }

            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } catch (verifyErr) {
            setStatusMsg({
              type: "error",
              text: verifyErr?.response?.data?.message || "Fine payment verification failed. Please contact support.",
            });
          } finally {
            setIsProcessing(false);
          }
        },
        onError: (err) => {
          setStatusMsg({
            type: "error",
            text: err?.description || "Payment failed or cancelled. Please try again to unblock.",
          });
          setIsProcessing(false);
        },
        onDismiss: () => {
          setIsProcessing(false);
        },
      });
    } catch (err) {
      setStatusMsg({
        type: "error",
        text: err?.response?.data?.message || "Could not initiate fine payment order. Try again.",
      });
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] border border-rose-200 p-8 shadow-2xl max-w-lg w-full space-y-6 text-center animate-scaleUp">
        <div className="w-16 h-16 rounded-full bg-rose-100 border-2 border-rose-300 text-rose-600 flex items-center justify-center mx-auto text-2xl font-black shadow-inner">
          ⚠️
        </div>

        <div className="space-y-2">
          <span className="inline-block rounded-full bg-rose-100 text-rose-800 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest border border-rose-200">
            Account Access Restricted
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Policy Violation Notice
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            Your account has been temporarily restricted due to off-platform contact sharing or policy non-compliance.
          </p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5 space-y-3 text-left">
          <div className="flex justify-between items-center border-b border-rose-200/80 pb-2">
            <span className="text-xs font-bold text-slate-700">Violation Reason:</span>
            <span className="text-xs font-extrabold text-rose-700">Contact Details Sharing</span>
          </div>

          <p className="text-xs text-rose-900 font-semibold leading-relaxed">
            "{reasonText}"
          </p>

          <div className="pt-2 border-t border-rose-200/80 flex justify-between items-center text-slate-900 font-extrabold text-sm">
            <span>Mandatory Fine Amount:</span>
            <span className="text-rose-700 text-lg">₹{fineAmount.toLocaleString()} INR</span>
          </div>
        </div>

        {statusMsg.text && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-bold border ${
              statusMsg.type === "error"
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            {statusMsg.text}
          </div>
        )}

        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handlePayFine}
            disabled={isProcessing || razorpayLoading}
            className="w-full rounded-2xl bg-gradient-to-r from-rose-600 via-rose-700 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-extrabold py-4 text-sm shadow-xl shadow-rose-500/25 transition transform active:scale-98 cursor-pointer border-0 disabled:opacity-50"
          >
            {isProcessing || razorpayLoading
              ? "Opening Razorpay Gateway..."
              : `Pay ₹${fineAmount.toLocaleString()} Fine to Unblock Account`}
          </button>

          <p className="text-[10px] text-slate-400 font-medium leading-normal">
            Payment is securely processed via Razorpay. Upon verification, your account status will be restored instantly.
          </p>
        </div>
      </div>
    </div>
  );
}
