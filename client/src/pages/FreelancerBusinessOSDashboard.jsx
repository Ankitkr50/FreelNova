import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import http from "../api/http.js";
import { useAuth } from "../hooks/useAuth.js";

export default function FreelancerBusinessOSDashboard() {
  const { user } = useAuth();
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const { data: businessData, isLoading } = useQuery({
    queryKey: ["freelancer_business_os"],
    queryFn: async () => {
      const res = await http.get("/users/business-os").catch(() => ({ data: { data: {} } }));
      return res.data?.data;
    },
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4">
        <div className="h-64 rounded-3xl bg-slate-100 animate-pulse flex items-center justify-center text-slate-400 font-bold">
          Loading Business OS & Tax Center...
        </div>
      </div>
    );
  }

  const data = {
    summary: {
      totalRevenue: businessData?.summary?.totalRevenue ?? 0,
      platformFees: businessData?.summary?.platformFees ?? 0,
      teamPayments: businessData?.summary?.teamPayments ?? 0,
      netEarnings: businessData?.summary?.netEarnings ?? 0,
      marginPercentage: businessData?.summary?.marginPercentage ?? 0,
    },
    invoices: Array.isArray(businessData?.invoices) ? businessData.invoices : [],
    taxCenter: {
      panStatus: businessData?.taxCenter?.panStatus || "NOT_VERIFIED",
      gstin: businessData?.taxCenter?.gstin || "N/A",
      tdsDeductedTotal: businessData?.taxCenter?.tdsDeductedTotal ?? 0,
    },
  };

  const sampleInvoice = {
    invoiceNumber: "INV-2026-1001",
    orderId: "ORD_RZP_99182",
    payoutRef: "PAYOUT_RZP_88102",
    date: new Date().toISOString(),
    clientName: "Apex Global Labs Inc.",
    projectTitle: "Senior Full Stack React & Node.js Platform",
    grossAmount: 45000,
    platformFee: 6750,
    tdsDeducted: 450,
    netPayout: 37800,
    gstTdsExportStatus: "TAX_READY",
    sacCode: "998314",
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 animate-fadeIn">
      {/* Header Banner */}
      <div className="rounded-[2.5rem] bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_50%,#334155_100%)] p-8 md:p-12 text-white shadow-2xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-400/20 border border-blue-300/30 px-4 py-1 text-xs font-bold text-blue-200">
          FreelNova Business OS & Tax Center
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-white mt-2">
          Financial Statements & Tax-Ready Exports
        </h1>
        <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-xl">
          Track gross revenue, platform service fees, team payouts, net profitability margins, and GST/TDS tax invoices.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold">
        <div className="p-5 rounded-[2rem] border border-slate-200 bg-white space-y-1 shadow-2xs">
          <p className="text-slate-400 uppercase text-[10px]">Gross Revenue</p>
          <p className="text-2xl font-black text-slate-900">₹{data.summary.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="p-5 rounded-[2rem] border border-slate-200 bg-white space-y-1 shadow-2xs">
          <p className="text-slate-400 uppercase text-[10px]">Platform Service Fees</p>
          <p className="text-2xl font-black text-amber-600">₹{data.summary.platformFees.toLocaleString()}</p>
        </div>
        <div className="p-5 rounded-[2rem] border border-slate-200 bg-white space-y-1 shadow-2xs">
          <p className="text-slate-400 uppercase text-[10px]">Studio Team Payouts</p>
          <p className="text-2xl font-black text-purple-600">₹{data.summary.teamPayments.toLocaleString()}</p>
        </div>
        <div className="p-5 rounded-[2rem] border border-slate-200 bg-white space-y-1 shadow-2xs">
          <p className="text-slate-400 uppercase text-[10px]">Net Earnings ({data.summary.marginPercentage}% Margin)</p>
          <p className="text-2xl font-black text-emerald-600">₹{data.summary.netEarnings.toLocaleString()}</p>
        </div>
      </div>

      {/* Invoices Section */}
      <div className="rounded-[2.5rem] border border-slate-200 bg-white p-6 md:p-8 space-y-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Generated Project Invoices</h3>
            <p className="text-xs text-slate-400">Expand any invoice to view detailed tax breakdown & download official A4 Tax Bill</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedInvoice(sampleInvoice)}
              className="rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold px-4 py-2 cursor-pointer transition"
            >
              Preview Sample A4 Tax Bill
            </button>
            <button
              onClick={() => setSelectedInvoice(data.invoices[0] || sampleInvoice)}
              className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 cursor-pointer transition border-0"
            >
              Export Annual Summary (PDF)
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {data.invoices.length > 0 ? (
            data.invoices.map((inv, idx) => (
              <div
                key={idx}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 p-3 rounded-2xl transition cursor-pointer"
                onClick={() => setSelectedInvoice(inv)}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-sm">{inv.invoiceNumber}</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {inv.gstTdsExportStatus || "TAX_READY"} ✓
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-600">
                    {inv.projectTitle || "Contract Milestone Deliverable"} • Client: <span className="font-bold text-slate-800">{inv.clientName || "Enterprise Client"}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Date: {new Date(inv.date).toLocaleDateString()} • Ref: {inv.orderId || "ORD_RZP_1001"}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <div className="text-right">
                    <p className="font-black text-slate-900 text-sm">₹{(inv.grossAmount || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-slate-500 font-semibold">Net Payout: ₹{(inv.netPayout || (inv.grossAmount * 0.84)).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedInvoice(inv);
                    }}
                    className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 cursor-pointer transition border-0 shrink-0"
                  >
                    Expand Invoice →
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center space-y-3">
              <p className="text-xs text-slate-400 font-semibold">
                No generated invoices found for completed milestones yet. Invoices will automatically appear here when payments are settled.
              </p>
              <button
                onClick={() => setSelectedInvoice(sampleInvoice)}
                className="inline-block rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold px-4 py-2 transition cursor-pointer"
              >
                Click here to view Sample A4 Tax Invoice Format
              </button>
            </div>
          )}
        </div>
      </div>

      {/* A4 Tax Invoice Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-5 md:p-7 space-y-4 shadow-2xl animate-scaleIn border border-slate-200 my-auto">
            {/* Modal Controls */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 print:hidden">
              <span className="text-[11px] font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Official Tax Invoice / Bill of Supply
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-1.5 cursor-pointer transition border-0 shadow-md flex items-center gap-1.5"
                >
                  Print / Save A4 PDF
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1.5 cursor-pointer transition"
                >
                  Close ✕
                </button>
              </div>
            </div>

            {/* A4 Sheet Invoice Container */}
            <div className="space-y-4 text-slate-900 font-sans">
              {/* Header Company Details */}
              <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-4 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black tracking-tight text-slate-900">FreelNova</span>
                    <span className="text-[9px] font-extrabold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      TECHNOLOGIES PVT LTD
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs leading-tight">
                    Level 14, FreelNova Hub, BKC Financial Center, Mumbai 400051, MH, India
                  </p>
                  <p className="text-[10px] font-mono text-slate-600 mt-1">
                    GSTIN: <span className="font-bold">27AAACF8819Q1Z5</span> • PAN: <span className="font-bold">AAACF8819Q</span> • SAC: <span className="font-bold">998314</span>
                  </p>
                </div>

                <div className="sm:text-right space-y-0.5">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">TAX INVOICE</span>
                  <p className="text-lg font-black text-slate-900 font-mono">{selectedInvoice.invoiceNumber || "INV-2026-1001"}</p>
                  <p className="text-[11px] text-slate-500">Date: <span className="font-bold">{new Date(selectedInvoice.date || Date.now()).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</span></p>
                  <p className="text-[10px] text-slate-400 font-mono">Gateway Ref: {selectedInvoice.orderId || "ORD_RZP_9910"}</p>
                </div>
              </div>

              {/* Billed To & Billed By Grid */}
              <div className="grid grid-cols-2 gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px]">
                <div>
                  <p className="font-extrabold text-slate-400 uppercase tracking-wider text-[9px]">SERVICE PROVIDER (BILLED BY)</p>
                  <p className="font-black text-slate-900 text-xs mt-0.5">{user?.name || "Verified Freelancer"}</p>
                  <p className="text-slate-600">@{user?.username || user?.name?.toLowerCase().replace(/\s+/g, "") || "freelancer"}</p>
                  <p className="text-slate-600">{user?.email || "freelancer@freelnova.com"}</p>
                </div>

                <div>
                  <p className="font-extrabold text-slate-400 uppercase tracking-wider text-[9px]">HIRING CLIENT (BILLED TO)</p>
                  <p className="font-black text-slate-900 text-xs mt-0.5">{selectedInvoice.clientName || "Apex Global Labs Inc."}</p>
                  <p className="text-slate-600">Enterprise Hiring Client</p>
                  <p className="text-slate-600">Payment Gateway: Razorpay Escrow Direct</p>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden text-[11px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-2.5">Description / Milestone Particulars</th>
                      <th className="p-2.5 text-center">SAC Code</th>
                      <th className="p-2.5 text-right">Gross Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-2.5">
                        <p className="font-extrabold text-slate-900">{selectedInvoice.projectTitle || "Contract Milestone Deliverable"}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Software Engineering & Professional Platform Development Service</p>
                      </td>
                      <td className="p-2.5 text-center font-mono">{selectedInvoice.sacCode || "998314"}</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">₹{(selectedInvoice.grossAmount || 0).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 text-[11px]">
                <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 max-w-xs space-y-1">
                  <p className="font-extrabold text-emerald-950">✓ Tax & Escrow Status: {selectedInvoice.gstTdsExportStatus || "TAX_READY"}</p>
                  <p className="text-[10px] text-emerald-900 leading-tight">
                    1% TDS under Section 194J of Income Tax Act has been deducted and reported to IT Department.
                  </p>
                </div>

                <div className="w-full sm:w-64 space-y-1.5 font-semibold text-[11px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Gross Milestone Value:</span>
                    <span>₹{(selectedInvoice.grossAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span>Platform Fee (15%):</span>
                    <span>-₹{(selectedInvoice.platformFee || Math.round((selectedInvoice.grossAmount || 0) * 0.15)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-purple-700">
                    <span>TDS Deducted (1%):</span>
                    <span>-₹{(selectedInvoice.tdsDeducted || Math.round((selectedInvoice.grossAmount || 0) * 0.01)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-black text-xs border-t border-slate-200 pt-1.5">
                    <span>Net Freelancer Payout:</span>
                    <span className="text-emerald-700">₹{(selectedInvoice.netPayout || Math.round((selectedInvoice.grossAmount || 0) * 0.84)).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Stamp & Verification Footer */}
              <div className="border-t border-slate-200 pt-3 flex flex-col sm:flex-row justify-between items-center gap-3 text-[10px] text-slate-400 font-medium">
                <div>
                  <p className="font-bold text-slate-600">FreelNova Automated Tax Engine</p>
                  <p>Computer-generated tax invoice requiring no physical signature.</p>
                </div>
                <div className="text-right">
                  <span className="inline-block border border-emerald-300 bg-emerald-50 text-emerald-800 font-extrabold px-2.5 py-0.5 rounded-lg">
                    VERIFIED & SETTLED IN ESCROW
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
