"use client";

import { useRef } from "react";
import { Printer, Download, Plus, X, Building2, CheckCircle2, AlertCircle } from "lucide-react";

export default function CustomerStatementModal({ 
  isOpen, 
  onClose, 
  customer, 
  onOpenPayment,
  canRecordPayment = false 
}) {
  const printRef = useRef(null);

  if (!isOpen || !customer) return null;

  const totalContract = parseFloat(customer.totalContractValue || 0);
  const totalPaid = parseFloat(customer.totalPaid || 0);
  const balanceDue = parseFloat(customer.balanceDue || 0);
  const landCost = parseFloat(customer.landCost || 0);
  const registryCost = parseFloat(customer.registryCost || 0);
  const otherCharges = parseFloat(customer.otherCharges || 0);
  const taxes = parseFloat(customer.taxes || 0);
  const discount = parseFloat(customer.discount || 0);
  const ratePerSqft = parseFloat(customer.ratePerSqft || 0);
  const areaSqft = parseFloat(customer.areaSqft || 0);

  const payments = customer.payments || [];

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Mode", "Reference No", "Source Bank/Account", "Amount (INR)", "Destination Account", "Status"];
    const rows = payments.map(p => [
      new Date(p.dateOfPayment).toLocaleDateString("en-IN"),
      p.paymentMode,
      p.referenceNo || "N/A",
      p.sourceAccount || "Direct",
      p.amount,
      p.destinationAccount || "Corporate Treasury (1010)",
      p.status || "RECORDED"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + 
      [`CUSTOMER STATEMENT - ${customer.customerName} (Plot ${customer.plotNo})`, ""]
      .concat([headers.join(",")])
      .concat(rows.map(e => e.map(item => `"${item}"`).join(",")))
      .concat(["", `"TOTAL CONTRACT VALUE","${totalContract}"`])
      .concat([`"TOTAL RECEIVED","${totalPaid}"`])
      .concat([`"BALANCE DUE","${balanceDue}"`])
      .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Customer_Statement_${customer.customerName.replace(/\s+/g, "_")}_Plot_${customer.plotNo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 print:border-none print:shadow-none print:max-w-none">
        
        {/* Modal Top Control Bar (Hidden on print) */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex justify-between items-center print:hidden">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <span className="font-bold text-sm">Customer Master Statement & Payment Ledger</span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">Plot {customer.plotNo}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              title="Download CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
              title="Print Statement"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Sheet</span>
            </button>

            {canRecordPayment && customer.status === "ACTIVE" && balanceDue > 0 && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPayment?.(customer);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Record Payment</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Statement Sheet Container */}
        <div ref={printRef} className="p-6 sm:p-8 bg-white text-slate-900 space-y-6 max-h-[85vh] overflow-y-auto print:max-h-none print:p-0">
          
          {/* Main Statement Title Banner */}
          <div className="border-2 border-slate-900 text-center py-2 bg-slate-50">
            <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase text-slate-900">
              ESTATESYNC REAL ESTATE
            </h1>
            <h2 className="text-xs sm:text-sm font-extrabold tracking-widest uppercase text-slate-600 border-t border-slate-300 mt-1 pt-1">
              CUSTOMER STATEMENT & PAYMENT DETAILS
            </h2>
          </div>

          {/* 4-Column Structured Header Grid (Exact Excel Layout) */}
          <div className="grid grid-cols-1 md:grid-cols-4 border-2 border-slate-900 divide-y md:divide-y-0 md:divide-x-2 divide-slate-900 text-xs">
            
            {/* 1. LAND DETAILS */}
            <div className="flex flex-col">
              <div className="bg-slate-100 font-black text-center py-1.5 uppercase tracking-wider border-b-2 border-slate-900 text-[11px]">
                LAND DETAILS
              </div>
              <div className="p-2.5 space-y-1.5 divide-y divide-slate-200">
                <div className="flex justify-between pt-1">
                  <span className="font-bold text-slate-600">CLIENT / OWNER:</span>
                  <span className="font-extrabold text-slate-900 text-right">{customer.customerName}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="font-bold text-slate-600">PLOT NO:</span>
                  <span className="font-black text-indigo-900">{customer.plotNo}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="font-bold text-slate-600">KHATA NO:</span>
                  <span className="font-mono font-bold text-slate-800">{customer.khataNo}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="font-bold text-slate-600">AREA (SQ.FT):</span>
                  <span className="font-bold text-slate-900">{areaSqft.toLocaleString()} sq.ft</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="font-bold text-slate-600">LOCATION:</span>
                  <span className="font-semibold text-slate-800 text-right">{customer.projectLocation}</span>
                </div>
              </div>
            </div>

            {/* 2. CUSTOMER DETAILS */}
            <div className="flex flex-col">
              <div className="bg-slate-100 font-black text-center py-1.5 uppercase tracking-wider border-b-2 border-slate-900 text-[11px]">
                CUSTOMER DETAILS
              </div>
              <div className="p-2.5 space-y-1.5 divide-y divide-slate-200">
                <div className="flex justify-between pt-1">
                  <span className="font-bold text-slate-600">CONTACT NO:</span>
                  <span className="font-bold text-slate-900">{customer.customerContact}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="font-bold text-slate-600">IDENTITY:</span>
                  <span className="font-mono text-slate-800 text-right">{customer.identityType}: {customer.identityNumber}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="font-bold text-slate-600">ADDRESS:</span>
                  <span className="font-medium text-slate-700 text-right">{customer.customerAddress || "Registered in System"}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="font-bold text-slate-600">SALES REP:</span>
                  <span className="font-semibold text-indigo-700 text-right">{customer.salesOwner?.name || "System"}</span>
                </div>
              </div>
            </div>

            {/* 3. COST CALCULATION */}
            <div className="flex flex-col">
              <div className="bg-slate-100 font-black text-center py-1.5 uppercase tracking-wider border-b-2 border-slate-900 text-[11px]">
                COST CALCULATION
              </div>
              <div className="p-2.5 space-y-1.5 divide-y divide-slate-200 font-mono">
                <div className="flex justify-between pt-1">
                  <span className="font-sans font-bold text-slate-600">RATE / SQ.FT:</span>
                  <span className="font-bold text-slate-800">₹{ratePerSqft.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="font-sans font-bold text-slate-600">COST OF LAND:</span>
                  <span className="font-bold text-slate-800">₹{landCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="font-sans font-bold text-slate-600">REGISTRY COST:</span>
                  <span className="font-bold text-slate-800">₹{registryCost.toLocaleString()}</span>
                </div>
                {otherCharges > 0 && (
                  <div className="flex justify-between pt-1">
                    <span className="font-sans font-bold text-slate-600">OTHER CHARGES:</span>
                    <span className="font-bold text-slate-800">₹{otherCharges.toLocaleString()}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between pt-1">
                    <span className="font-sans font-bold text-slate-600">DISCOUNT:</span>
                    <span className="font-bold text-rose-600">-₹{discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t-2 border-slate-900 bg-slate-50 font-black">
                  <span className="font-sans font-black text-slate-900">TOTAL CONTRACT:</span>
                  <span className="font-black text-slate-950">₹{totalContract.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* 4. MODE OF PAYMENT / SUMMARY */}
            <div className="flex flex-col">
              <div className="bg-slate-100 font-black text-center py-1.5 uppercase tracking-wider border-b-2 border-slate-900 text-[11px]">
                FINANCIAL STATUS
              </div>
              <div className="p-2.5 space-y-1.5 divide-y divide-slate-200 font-mono">
                <div className="flex justify-between pt-1">
                  <span className="font-sans font-bold text-slate-600">CONTRACT VALUE:</span>
                  <span className="font-bold text-slate-900">₹{totalContract.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="font-sans font-bold text-emerald-800">TOTAL RECEIVED:</span>
                  <span className="font-extrabold text-emerald-700">₹{totalPaid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="font-sans font-bold text-rose-800">NET CREDIT DUE:</span>
                  <span className="font-extrabold text-rose-700">₹{balanceDue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1 font-sans">
                  <span className="font-bold text-slate-600">STATUS:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    balanceDue <= 0 ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-amber-100 text-amber-900 border border-amber-300"
                  }`}>
                    {balanceDue <= 0 ? "FULLY PAID" : "ACTIVE / DUE"}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Payment Tranches Ledger Table (Excel Sheet Grid) */}
          <div>
            <div className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 uppercase tracking-wider flex justify-between items-center">
              <span>PAYMENT TRANCHES & REALIZED COLLECTIONS</span>
              <span className="font-mono text-[11px] font-normal text-slate-300">{payments.length} Records</span>
            </div>

            <div className="border-2 border-t-0 border-slate-900 overflow-x-auto">
              <table className="min-w-full divide-y-2 divide-slate-900 text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-100 font-black uppercase text-slate-900 text-[11px] border-b-2 border-slate-900">
                  <tr className="divide-x-2 divide-slate-900">
                    <th className="px-3 py-2 text-center w-12">#</th>
                    <th className="px-3 py-2">DATE</th>
                    <th className="px-3 py-2">MODE</th>
                    <th className="px-3 py-2">REFERENCE / UTR</th>
                    <th className="px-3 py-2 text-right">AMOUNT (₹)</th>
                    <th className="px-3 py-2">BENEFICIARY ACCOUNT</th>
                    <th className="px-3 py-2">RECORDED BY</th>
                    <th className="px-3 py-2 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 bg-white">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 font-medium italic">
                        No collection payments recorded yet for this customer.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p, idx) => (
                      <tr key={p.id || idx} className="divide-x divide-slate-300 hover:bg-slate-50/80">
                        <td className="px-3 py-2 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="px-3 py-2 font-mono font-medium text-slate-800">
                          {new Date(p.dateOfPayment).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric"
                          })}
                        </td>
                        <td className="px-3 py-2 font-bold text-slate-900">{p.paymentMode}</td>
                        <td className="px-3 py-2 font-mono text-slate-700">{p.referenceNo || "N/A"}</td>
                        <td className="px-3 py-2 text-right font-mono font-extrabold text-slate-950">
                          ₹{parseFloat(p.amount).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-slate-700 font-medium">
                          {p.destinationAccount || "Corporate Treasury Bank (1010)"}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {p.recordedBy?.name || "Accounting Officer"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {p.status || "RECORDED"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                
                {/* Excel Summary Footer */}
                <tfoot className="bg-slate-100 font-black border-t-2 border-slate-900 text-xs">
                  <tr className="divide-x-2 divide-slate-900">
                    <td colSpan={4} className="px-4 py-2.5 text-right uppercase tracking-wider text-slate-900">
                      TOTAL AMT RECEIVED:
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm text-emerald-700">
                      ₹{totalPaid.toLocaleString()}
                    </td>
                    <td colSpan={3} className="px-3 py-2.5 text-slate-600 font-normal italic">
                      Verified & Posted to Double-Entry General Ledger (Dr 1010 / Cr 4010)
                    </td>
                  </tr>
                  <tr className="divide-x-2 divide-slate-900 bg-slate-200/80">
                    <td colSpan={4} className="px-4 py-2 text-right uppercase tracking-wider text-rose-900">
                      NET CREDIT DUE (BALANCE):
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-sm text-rose-700">
                      ₹{balanceDue.toLocaleString()}
                    </td>
                    <td colSpan={3} className="px-3 py-2 text-slate-600 font-normal">
                      Remaining client balance receivable
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Statement Footer Authorization */}
          <div className="pt-8 border-t border-slate-300 flex justify-between items-end text-xs text-slate-600 print:pt-12">
            <div>
              <p className="font-semibold">Generated by EstateSync ERP System</p>
              <p className="text-[10px] text-slate-400">Date of Statement: {new Date().toLocaleDateString("en-IN")}</p>
            </div>
            <div className="text-right">
              <div className="w-44 border-b border-slate-400 mb-1"></div>
              <p className="font-bold text-slate-800">Authorized Signatory / Accounts</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
