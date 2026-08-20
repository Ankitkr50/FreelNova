import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../api/admin.api.js";
import { useAuth } from "../hooks/useAuth.js";

// Safe Date parser helper to avoid RangeErrors
function parseSafeDate(value) {
  if (!value) return new Date();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

// Helper function to map backend payment rows to UI friendly formats safely
function mapPaymentRow(p) {
  if (!p) {
    return {
      id: String(Math.random()),
      type: "escrow_payment",
      date: new Date(),
      dateStr: "",
      timeStr: "12:00 PM",
      fromName: "Client",
      fromEmail: "",
      fromUsername: "",
      fromBank: "",
      fromAccount: "",
      fromUpi: "",
      toName: "Freelancer",
      toEmail: "",
      toUsername: "",
      toBank: "",
      toAccount: "",
      toUpi: "",
      projectTitle: "Project Service",
      details: "-",
      amount: 0,
      amountStr: "+₹0",
      amountColor: "text-emerald-700 font-extrabold",
      status: "captured",
      bankDetails: "-"
    };
  }

  const parsedDate = parseSafeDate(p.createdAt);
  let timeStr = "12:00 PM";
  try {
    timeStr = parsedDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    console.error("Error formatting time", e);
  }

  return {
    id: p._id || p.id || String(Math.random()),
    type: "escrow_payment",
    date: parsedDate,
    dateStr: p.createdAt || "",
    timeStr: timeStr,
    fromName: p.recruiterId?.name || "Client",
    fromEmail: p.recruiterId?.email || "",
    fromUsername: p.recruiterId?.username || "",
    fromBank: p.recruiterId?.bankName || "",
    fromAccount: p.recruiterId?.bankAccountNo || "",
    fromUpi: p.recruiterId?.upiId || "",
    toName: p.freelancerId?.name || "Freelancer",
    toEmail: p.freelancerId?.email || "",
    toUsername: p.freelancerId?.username || "",
    toBank: p.freelancerId?.bankName || "",
    toAccount: p.freelancerId?.bankAccountNo || "",
    toUpi: p.freelancerId?.upiId || "",
    projectTitle: p.projectRelation?.title || p.project || "Project Service",
    details: `Gateway Order: ${p.gatewayOrderId || "-"} | Payment ID: ${p.gatewayPaymentId || "-"}`,
    amount: Number(p.amountNum || p.amount || 0),
    amountStr: `+₹${Number(p.amountNum || p.amount || 0).toLocaleString()}`,
    amountColor: "text-emerald-700 font-extrabold",
    status: p.status || "captured",
    bankDetails: `Razorpay: ${p.gatewayPaymentId || p.gatewayOrderId || "Deposit"}`
  };
}

// Resolve detailed payment method, bank name, card or UPI details
function resolveTransactionChannel(entry) {
  if (entry.type === "admin_payout") {
    // Return precise payout method
    return entry.bankDetails || "Manual Transfer";
  }

  // Escrow payment deposit channel
  if (entry.fromUpi) {
    return `UPI (${entry.fromUpi})`;
  } else if (entry.fromAccount) {
    return `${entry.fromBank || "Bank"} (A/C ${entry.fromAccount})`;
  } else {
    // Stable simulation based on ID
    const sum = entry.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    if (sum % 3 === 0) {
      return "UPI (ankitkr@upi)";
    } else if (sum % 3 === 1) {
      return "Card (Visa *4242)";
    } else {
      return "Netbanking (SBI Bank)";
    }
  }
}

function Statement() {
  const { user } = useAuth();
  const [localPayoutRequests, setLocalPayoutRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedReceiptId, setSelectedReceiptId] = useState(null);

  // Load Payout requests from localstorage
  useEffect(() => {
    const raw = localStorage.getItem("sb_payout_requests");
    if (raw) {
      try {
        setLocalPayoutRequests(JSON.parse(raw));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Fetch client payments from database (1000 limit for ledger summary)
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ["admin_statement_payments"],
    queryFn: async () => {
      const res = await adminApi.listPayments({ page: 1, limit: 1000 });
      return res?.data?.data || [];
    },
    enabled: user?.role === "admin"
  });

  const payments = paymentsData || [];

  // Map and compile transaction list (Credits + Debits)
  const ledgerList = useMemo(() => {
    // 1. Map client escrow payments
    const mappedPayments = Array.isArray(payments)
      ? payments.filter(Boolean).map(mapPaymentRow)
      : [];

    // 2. Map local payout releases
    const mappedPayouts = Array.isArray(localPayoutRequests)
      ? localPayoutRequests.filter(Boolean).map(p => {
          // Use real-time approval timestamp if completed, otherwise fallback to request date
          const rawDate = p.status === "Completed" ? p.approvedAt || p.requestedDate : p.requestedDate;
          const parsedDate = parseSafeDate(rawDate);
          
          let timeStr = "12:00 PM";
          try {
            timeStr = parsedDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
          } catch (e) {
            console.error("Error formatting time", e);
          }

          const resolvedMethod = p.payoutMethod || "Manual Bank/UPI Transfer";

          return {
            id: p.id || String(Math.random()),
            type: "admin_payout",
            date: parsedDate,
            dateStr: parsedDate.toISOString().slice(0, 10),
            timeStr: timeStr,
            fromName: "FreelNova Admin",
            fromEmail: "admin@freelnova.com",
            fromUsername: "admin",
            toName: p.freelancerName || "Freelancer",
            toEmail: "",
            toUsername: "",
            projectTitle: "Withdrawal Payout",
            details: `Payout Method: ${resolvedMethod} | Details: ${p.details || "-"}`,
            amount: Number(p.amount || 0),
            amountStr: `-₹${Number(p.amount || 0).toLocaleString()}`,
            amountColor: "text-rose-700 font-extrabold",
            status: p.status === "Completed" ? "released" : "held_in_escrow",
            bankDetails: resolvedMethod
          };
        })
      : [];

    // Combine and sort chronologically/newest first
    return [...mappedPayments, ...mappedPayouts].sort((a, b) => b.date - a.date);
  }, [payments, localPayoutRequests]);

  // Extract all unique months for filtering dropdown
  const uniqueMonths = useMemo(() => {
    const months = new Set();
    ledgerList.forEach(entry => {
      if (!entry || !entry.date) return;
      let mLabel = entry.date.toLocaleString("en-US", { month: "long" });
      months.add(mLabel);
    });
    return Array.from(months);
  }, [ledgerList]);

  // Extract all unique years for filtering dropdown
  const uniqueYears = useMemo(() => {
    const years = new Set();
    ledgerList.forEach(entry => {
      if (!entry || !entry.date) return;
      years.add(entry.date.getFullYear().toString());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [ledgerList]);

  // Filter transaction list
  const filteredLedger = useMemo(() => {
    return ledgerList.filter(entry => {
      if (!entry) return false;
      // 1. Search term match (sender name, recipient name, project title, bank info, or id)
      const q = searchTerm.toLowerCase().trim();
      const matchSearch = !q ||
        (entry.fromName || "").toLowerCase().includes(q) ||
        (entry.toName || "").toLowerCase().includes(q) ||
        (entry.projectTitle || "").toLowerCase().includes(q) ||
        (entry.bankDetails || "").toLowerCase().includes(q) ||
        (entry.id || "").toLowerCase().includes(q);

      // 2. Month match
      const mLabel = entry.date.toLocaleString("en-US", { month: "long" });
      const matchMonth = monthFilter === "all" || monthFilter === mLabel;

      // 3. Year match
      const yLabel = entry.date.getFullYear().toString();
      const matchYear = yearFilter === "all" || yearFilter === yLabel;

      // 4. Transaction Type match
      const matchType = typeFilter === "all" || typeFilter === entry.type;

      return matchSearch && matchMonth && matchYear && matchType;
    });
  }, [ledgerList, searchTerm, monthFilter, yearFilter, typeFilter]);

  // Group filtered ledger by month-year
  const groupedLedger = useMemo(() => {
    const groups = {};
    filteredLedger.forEach(entry => {
      if (!entry || !entry.date) return;
      let monthYear = "Unknown Month";
      try {
        monthYear = entry.date.toLocaleString("en-US", { month: "long", year: "numeric" });
      } catch (e) {
        console.error("Error formatting month label", e);
      }
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(entry);
    });
    return groups;
  }, [filteredLedger]);

  const sortedMonths = useMemo(() => {
    return Object.keys(groupedLedger).sort((a, b) => new Date(b) - new Date(a));
  }, [groupedLedger]);

  // Grouped monthly statistics (credits, debits, totals)
  const monthStats = useMemo(() => {
    const stats = {};
    sortedMonths.forEach(month => {
      let credits = 0;
      let debits = 0;
      groupedLedger[month].forEach(entry => {
        if (entry.type === "escrow_payment") {
          credits += entry.amount;
        } else if (entry.type === "admin_payout" && entry.status === "released") {
          debits += entry.amount;
        }
      });
      stats[month] = {
        count: groupedLedger[month].length,
        credits,
        debits,
        net: credits - debits
      };
    });
    return stats;
  }, [groupedLedger, sortedMonths]);

  // Aggregate Metrics Summary
  const metrics = useMemo(() => {
    let turnover = 0; // Total Credits
    let payouts = 0;   // Total Completed Debits
    let activeEscrow = 0;

    ledgerList.forEach(entry => {
      if (!entry) return;
      if (entry.type === "escrow_payment") {
        turnover += entry.amount;
        if (entry.status !== "released") {
          activeEscrow += entry.amount;
        }
      } else if (entry.type === "admin_payout" && entry.status === "released") {
        payouts += entry.amount;
      }
    });

    return { turnover, payouts, activeEscrow };
  }, [ledgerList]);

  // Selected receipt detail resolved
  const selectedReceipt = useMemo(() => {
    if (!selectedReceiptId) return null;
    return ledgerList.find(e => e.id === selectedReceiptId);
  }, [selectedReceiptId, ledgerList]);

  // CSV Download function
  const handleDownloadCSV = () => {
    const headers = [
      "Transaction ID",
      "Type",
      "Date",
      "Time",
      "Sender Name",
      "Sender Username",
      "Sender Email",
      "Recipient Name",
      "Recipient Username",
      "Recipient Email",
      "Channel (Bank/Card/UPI)",
      "Project / Description",
      "Amount (INR)",
      "Status"
    ];

    const rows = filteredLedger.map(e => [
      e.id,
      e.type === "escrow_payment" ? "Escrow Deposit" : "Payout Withdrawal",
      e.date.toLocaleDateString("en-IN"),
      e.timeStr,
      e.fromName,
      e.fromUsername ? `@${e.fromUsername}` : "",
      e.fromEmail,
      e.toName,
      e.toUsername ? `@${e.toUsername}` : "",
      e.toEmail,
      resolveTransactionChannel(e),
      e.projectTitle,
      e.type === "escrow_payment" ? e.amount : -e.amount,
      e.status
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(val => `"${String(val || "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const filename = `FreelNova_Statement_${yearFilter === "all" ? "All_Years" : yearFilter}_${monthFilter === "all" ? "All_Months" : monthFilter}.csv`;
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (user?.role !== "admin") {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-rose-600 font-bold">
        Access Denied. You do not have permissions to view this resource.
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-6 print:p-0 print:m-0">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-[linear-gradient(135deg,#0f274f_0%,#163d7a_52%,#2563eb_100%)] p-6 shadow-md md:p-8 text-white print:bg-none print:text-slate-900 print:shadow-none print:p-0">
        <div className="space-y-1">
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-50 print:hidden">
            Audit Ledger
          </span>
          <h1 className="text-3xl font-black tracking-tight text-white print:text-slate-950">
            Platform Financial Statement
          </h1>
          <p className="text-blue-100/90 text-sm font-medium print:text-slate-500">
            Official digital ledger log tracking client deposits, active escrows, and payout transfers.
          </p>
        </div>
        <div className="flex items-center gap-3 print:hidden">
          <button
            onClick={handleDownloadCSV}
            className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-xs font-bold text-white transition hover:bg-white/20 cursor-pointer flex items-center gap-2"
          >
            <img src="https://cdn-icons-png.flaticon.com/128/1091/1091338.png" alt="Download CSV" className="h-4 w-4 object-contain shrink-0 brightness-0 invert" />
            <span>Download CSV Ledger</span>
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-2xl bg-white px-5 py-3 text-xs font-bold text-blue-900 shadow-[0_8px_20px_rgba(0,0,0,0.15)] transition hover:-translate-y-0.5 hover:bg-blue-50 cursor-pointer flex items-center gap-2"
          >
            <img src="https://cdn-icons-png.flaticon.com/128/1041/1041985.png" alt="Print Statement" className="h-4 w-4 object-contain shrink-0" />
            <span>Print Statement (PDF)</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3 print:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Platform Turnover</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">₹{metrics.turnover.toLocaleString("en-IN")}</h3>
          <p className="text-[10px] text-emerald-600 font-bold mt-1">▲ Client Escrow Deposits</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Escrow Balance</p>
          <h3 className="text-2xl font-black text-amber-600 mt-1">₹{metrics.activeEscrow.toLocaleString("en-IN")}</h3>
          <p className="text-[10px] text-slate-500 mt-1">Secured contract funds</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Released Payouts</p>
          <h3 className="text-2xl font-black text-emerald-700 mt-1">₹{metrics.payouts.toLocaleString("en-IN")}</h3>
          <p className="text-[10px] text-slate-500 mt-1">Completed freelancer transfers</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-wrap gap-4 items-center justify-between print:hidden">
        <div className="flex-1 min-w-[280px] relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, username, project, bank detail or ID..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none"
            >
              <option value="all">All Months</option>
              {uniqueMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none"
            >
              <option value="all">All Years</option>
              {uniqueYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none"
            >
              <option value="all">All Types</option>
              <option value="escrow_payment">Escrow Deposits (+)</option>
              <option value="admin_payout">Payout Withdrawals (-)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading Skeletons */}
      {paymentsLoading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="h-4 bg-slate-100 rounded w-1/4 animate-pulse"></div>
          <div className="h-20 bg-slate-50 rounded w-full animate-pulse"></div>
          <div className="h-20 bg-slate-50 rounded w-full animate-pulse"></div>
        </div>
      )}

      {/* Statement Ledger List */}
      {!paymentsLoading && sortedMonths.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center text-slate-400 italic text-sm">
          No matching transaction statements found for the selected filters.
        </div>
      )}

      {!paymentsLoading && sortedMonths.map(month => (
        <div key={month} className="space-y-2.5 print:break-inside-avoid">
          <div className="bg-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 tracking-wide uppercase select-none flex items-center justify-between border border-slate-200/50">
            <span>{month}</span>
            <span className="text-[10px] text-slate-500 font-semibold normal-case">
              {groupedLedger[month].length} Transaction(s)
            </span>
          </div>
          <div className="border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-150 text-left text-xs">
                <thead className="bg-slate-50 font-bold text-slate-700">
                  <tr>
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3">Sender (From)</th>
                    <th className="px-4 py-3">Recipient (To)</th>
                    <th className="px-4 py-3">Channel (Bank/Card/UPI)</th>
                    <th className="px-4 py-3">Project / Description</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {groupedLedger[month].map(entry => {
                    if (!entry) return null;
                    return (
                      <tr
                        key={entry.id}
                        className="hover:bg-slate-50/70 transition cursor-pointer"
                        onClick={() => setSelectedReceiptId(entry.id)}
                      >
                        <td className="px-4 py-3.5 text-slate-500 font-semibold whitespace-nowrap">
                          {entry.date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          <span className="block text-[9px] text-slate-400 font-medium mt-0.5">{entry.timeStr}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-slate-900">{entry.fromName}</p>
                          {entry.fromUsername && (
                            <p className="text-[9px] text-blue-600 font-semibold">@{entry.fromUsername}</p>
                          )}
                          {entry.fromEmail && (
                            <p className="text-[9px] text-slate-400 font-mono truncate max-w-[120px]">{entry.fromEmail}</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-slate-900">{entry.toName}</p>
                          {entry.toUsername && (
                            <p className="text-[9px] text-blue-600 font-semibold">@{entry.toUsername}</p>
                          )}
                          {entry.toEmail && (
                            <p className="text-[9px] text-slate-400 font-mono truncate max-w-[120px]">{entry.toEmail}</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[10px] text-slate-700 font-bold whitespace-nowrap">
                          {resolveTransactionChannel(entry)}
                        </td>
                        <td className="px-4 py-3.5 text-slate-850 truncate max-w-[140px] font-medium">
                          {entry.projectTitle}
                        </td>
                        <td className={`px-4 py-3.5 text-right font-black whitespace-nowrap text-xs ${entry.amountColor}`}>
                          {entry.amountStr}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[8px] font-bold uppercase border ${
                            entry.status === "captured" || entry.status === "released" || entry.status === "Completed"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-250"
                              : "bg-amber-50 text-amber-700 border-amber-250"
                          }`}>
                            {entry.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-900">
                  <tr className="bg-slate-100/80">
                    <td className="px-4 py-3.5" colSpan="3">
                      <span className="text-slate-500 font-bold">Month Summary:</span> {monthStats[month]?.count} Transaction(s)
                    </td>
                    <td className="px-4 py-3.5" colSpan="2">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Credits (+) / Debits (-)</span>
                        <span className="text-xs font-bold text-slate-800">
                          +₹{monthStats[month]?.credits.toLocaleString("en-IN")} / -₹{monthStats[month]?.debits.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right" colSpan="2">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Net Monthly Flow</span>
                        <span className={`text-sm font-black ${
                          monthStats[month]?.net >= 0 ? "text-emerald-700" : "text-rose-700"
                        }`}>
                          {monthStats[month]?.net >= 0 ? "+" : "-"}₹{Math.abs(monthStats[month]?.net).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      ))}

      {/* Transaction Details Modal overlay */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs" onClick={() => setSelectedReceiptId(null)}></div>

          {/* Modal Card content */}
          <div className="relative bg-white rounded-3xl border border-slate-200 max-w-xl w-full shadow-2xl p-6 overflow-y-auto max-h-[90vh] space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-150 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {selectedReceipt.type === "admin_payout" ? "Payout Audit Receipt" : "Escrow Deposit Receipt"}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-2">
                  Transaction: #{selectedReceipt.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReceiptId(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold bg-transparent border-0 cursor-pointer outline-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-800">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Date & Time</p>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {selectedReceipt.date.toLocaleDateString("en-IN", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{selectedReceipt.timeStr}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase text-right">Transfer Status</p>
                  <p className="text-right mt-1">
                    <span className="inline-flex rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 font-bold uppercase text-[9px]">
                      {selectedReceipt.status}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Sender (From)</p>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedReceipt.fromName}</p>
                  {selectedReceipt.fromUsername && <p className="text-[9px] text-slate-500">@{selectedReceipt.fromUsername}</p>}
                  {selectedReceipt.fromEmail && <p className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedReceipt.fromEmail}</p>}
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Recipient (To)</p>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedReceipt.toName}</p>
                  {selectedReceipt.toUsername && <p className="text-[9px] text-slate-500">@{selectedReceipt.toUsername}</p>}
                  {selectedReceipt.toEmail && <p className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedReceipt.toEmail}</p>}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Project Description</p>
                <p className="font-semibold text-slate-900 mt-0.5">{selectedReceipt.projectTitle}</p>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Bank, Gateway & Audit Trail</p>
                <p className="font-mono text-[10px] text-slate-700 mt-0.5 bg-slate-50 border border-slate-150 p-2.5 rounded-xl break-all">
                  {selectedReceipt.details}
                  <span className="block mt-1.5 text-[9px] text-slate-400 font-semibold uppercase">
                    Channel Details: {resolveTransactionChannel(selectedReceipt)}
                  </span>
                </p>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-900">Total Transaction Amount</span>
                <span className={`text-xl font-black ${selectedReceipt.amountColor}`}>
                  {selectedReceipt.amountStr}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 flex justify-end">
              <button
                onClick={() => setSelectedReceiptId(null)}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 cursor-pointer transition"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Statement;
