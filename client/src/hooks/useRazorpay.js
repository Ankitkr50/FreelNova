/**
 * useRazorpay — loads the Razorpay checkout SDK dynamically and
 * exposes an `openCheckout` function that opens the payment modal.
 *
 * Usage:
 *   const { openCheckout, loading } = useRazorpay();
 *   await openCheckout({ orderId, amount, currency, keyId, name, description, onSuccess, onError });
 */

import { useState, useCallback } from "react";

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function useRazorpay() {
  const [loading, setLoading] = useState(false);

  const openCheckout = useCallback(
    async ({
      orderId,
      amount,      // in paise
      currency = "INR",
      keyId,
      name = "FreelNova",
      description = "Pro Subscription",
      prefillName = "",
      prefillEmail = "",
      prefillContact = "",
      onSuccess,
      onError,
      onDismiss,
    }) => {
      setLoading(true);

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setLoading(false);
        const msg = "Failed to load Razorpay SDK. Check your internet connection.";
        if (onError) onError(new Error(msg));
        return;
      }

      const options = {
        key: keyId,
        amount,
        currency,
        name,
        description,
        order_id: orderId,
        prefill: {
          name: prefillName,
          email: prefillEmail,
          contact: prefillContact,
        },
        theme: { color: "#2563eb" },
        modal: {
          ondismiss: () => {
            setLoading(false);
            if (onDismiss) onDismiss();
          },
        },
        handler: (response) => {
          // response = { razorpay_order_id, razorpay_payment_id, razorpay_signature }
          setLoading(false);
          if (onSuccess) onSuccess(response);
        },
      };

      try {
        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (response) => {
          setLoading(false);
          if (onError) onError(response.error);
        });
        rzp.open();
      } catch (error) {
        setLoading(false);
        if (onError) onError(error);
      }
    },
    []
  );

  return { openCheckout, loading };
}
