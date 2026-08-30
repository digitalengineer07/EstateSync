"use client";

import { useRef } from "react";
import { Printer, Download, Plus, X, Building2, Edit3 } from "lucide-react";

export default function CustomerStatementModal({ 
  isOpen, 
  onClose, 
  customer, 
  onOpenPayment,
  onOpenEdit,
  canRecordPayment = false,
  userRole = "SALES"
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
    const headers = ["Date", "Mode", "Reference No", "Bank / Source Account", "Amount", "Beneficiary Name", "Beneficiary A/C No"];
    const rows = payments.map(p => [
      new Date(p.dateOfPayment).toLocaleDateString("en-IN"),
      p.paymentMode,
      p.referenceNo || "N/A",
      p.sourceAccount || "Direct",
      p.amount,
      "ESTATESYNC / Corporate Treasury",
      p.destinationAccount || "Corporate Bank (1010)"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + 
      [`CUSTOMER STATEMENT - ${customer.customerName} (Plot ${customer.plotNo})`, ""]
      .concat([headers.join(",")])
      .concat(rows.map(e => e.map(item => `"${item}"`).join(",")))
      .concat(["", `"TOTAL AMT RECEIVED","${totalPaid}"`])
      .concat([`"NET CREDIT DUE","${balanceDue}"`])
      .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Customer_Statement_${customer.customerName.replace(/\s+/g, "_")}_Plot_${customer.plotNo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const canEdit = ["SALES", "ADMIN", "MARKETING", "MANAGER"].includes(userRole);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full flex flex-col overflow-hidden border border-slate-300 animate-in fade-in zoom-in-95 duration-150 print:border-none print:shadow-none print:max-w-none">
        
        {/* Modal Top Control Bar (Hidden on print) */}
        <div className="px-5 py-3 bg-slate-900 text-white flex justify-between items-center print:hidden border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <span className="font-bold text-sm">Customer Master Statement (Excel Sheet Format)</span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">Plot {customer.plotNo}</span>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => {
                  onOpenEdit?.(customer);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
                title="Edit Customer Profile & Plot Info"
              >
                <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Edit Profile</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
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
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Record Payment</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Unified Authentic Excel Sheet Container */}
        <div ref={printRef} className="p-4 sm:p-6 bg-white text-slate-900 space-y-4 max-h-[88vh] overflow-y-auto print:max-h-none print:p-0">
          
          {/* Top Title Bar (Exact Excel Header) */}
          <div className="border border-slate-800 text-center py-2 bg-slate-100 font-sans">
            <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase text-slate-950">
              ESTATESYNC REAL ESTATE
            </h1>
            <h2 className="text-xs sm:text-sm font-bold tracking-widest uppercase text-slate-700 border-t border-slate-300 mt-1 pt-0.5">
              CUSTOMER DETAILS & STATEMENT
            </h2>
          </div>

          {/* Unified 4-Section Excel Grid Table (Matching uploaded sheet) */}
          <div className="overflow-x-auto border border-slate-800">
            <table className="w-full text-xs border-collapse border border-slate-800">
              
              {/* Table Column Headers */}
              <thead>
                <tr className="bg-slate-200/90 text-slate-900 font-black uppercase text-[11px] border-b border-slate-800 text-center">
                  <th colSpan={2} className="py-2 px-3 border-r border-slate-800 w-1/4">LAND DETAILS</th>
                  <th colSpan={2} className="py-2 px-3 border-r border-slate-800 w-1/4">CUSTOMER DETAILS</th>
                  <th colSpan={2} className="py-2 px-3 border-r border-slate-800 w-1/4">COST CALCULATION</th>
                  <th colSpan={2} className="py-2 px-3 w-1/4">PAYMENT & DUE STATUS</th>
                </tr>
              </thead>

              {/* Data Grid Rows */}
              <tbody className="divide-y divide-slate-300">
                {/* Row 1 */}
                <tr className="divide-x divide-slate-300">
                  <td className="py-1.5 px-2.5 bg-slate-50 font-bold text-slate-700 w-24 text-[10px] uppercase">OWNER</td>
                  <td className="py-1.5 px-2.5 font-extrabold text-slate-900 border-r border-slate-800">{customer.customerName}</td>
                  
                  <td className="py-1.5 px-2.5 bg-slate-50 font-bold text-slate-700 w-24 text-[10px] uppercase">CONTACT NO</td>
                  <td className="py-1.5 px-2.5 font-bold text-slate-900 font-mono border-r border-slate-800">{customer.customerContact}</td>
                  
                  <td className="py-1.5 px-2.5 bg-slate-50 font-bold text-slate-700 w-28 text-[10px] uppercase">RATE (PER SQ. FT)</td>
                  <td className="py-1.5 px-2.5 font-bold text-slate-900 text-right font-mono border-r border-slate-800">₹{ratePerSqft.toLocaleString('en-IN')}</td>
                  
                  <td className="py-1.5 px-2.5 bg-slate-50 font-bold text-slate-700 w-28 text-[10px] uppercase">TOTAL CONTRACT AMT</td>
                  <td className="py-1.5 px-2.5 font-extrabold text-slate-950 text-right font-mono">₹{totalContract.toLocaleString('en-IN')}</td>
                </tr>

                {/* Row 2 */}
                <tr className="divide-x divide-slate-300">
                  <td className="py-1.5 px-2.5 bg-slate-50 font-bold text-slate-700 w-24 text-[10px] uppercase">PLOT NO</td>
                  <td className="py-1.5 px-2.5 font-black text-indigo-950 font-mono border-r border-slate-800">{customer.plotNo}</td>
                  
                  <td className="py-1.5 px-2.5 bg-slate-50 font-bold text-slate-700 w-24 text-[10px] uppercase">IDENTITY</td>
                  <td className="py-1.5 px-2.5 font-mono text-slate-800 text-[11px] border-r border-slate-800">
                    <span className="font-semibold text-slate-500 mr-1">{customer.identityType}:</span>
                    {customer.identityNumber}
                  </td>
                  
                  <td className="py-1.5 px-2.5 bg-slate-50 font-bold text-slate-700 w-28 text-[10px] uppercase">COST OF LAND</td>
                  <td className="py-1.5 px-2.5 font-bold text-slate-900 text-right font-mono border-r border-slate-800">₹{landCost.toLocaleString('en-IN')}</td>
                  
                  <td className="py-1.5 px-2.5 bg-slate-50 font-bold text-slate-700 w-28 text-[10px] uppercase">EXTRA / TAXES (GST)</td>
                  <td className="py-1.5 px-2.5 font-mono text-slate-700 text-right">
                    {taxes > 0 ? `+₹${taxes.toLocaleString('en-IN')}` : "₹0"}
                  </td>
                </tr>

                {/* Row 3 */}
                <tr className="divide-x divide-slate-300">
                  <td className="py-1.5 px-2.5 bg-slate-50 font-bold text-slate-700 w-24 text-[10px] uppercase">KHATA NO.</td>
                  <td className="py-1.5 px-2.5 font-mono font-bold text-slate-800 border-r border-slate-800">{customer.khataNo}</td>
                  
                  <td className="py-1.5 px-2.5 bg-slate-50 font-bold text-slate-700 w-24 text-[10px] uppercase">ADD</td>
                  <td className="py-1.5 px-2.5 text-slate-700 text-[11px] leading-tight border-r border-slate-800">{customer.customerAddress || "N/A"}</td>
                  
                  <td className="py-1.5 px-2.5 bg-indigo-50/60 font-black text-indigo-900 w-28 text-[10px] uppercase">DEV. CHARGES</td>
                  <td className="py-1.5 px-2.5 font-bold text-indigo-950 text-right font-mono border-r border-slate-800">₹{otherCharges.toLocaleString('en-IN')}</td>
                  
                  <td className="py-1.5 px-2.5 bg-slate-50 font-bold text-slate-700 w-28 text-[10px] uppercase">DISCOUNT ALLOWED</td>
                  <td className="py-1.5 px-2.5 font-mono text-slate-800 text-right">
                    {discount > 0 ? (
                      <span className="text-rose-600 font-bold">-₹{discount.toLocaleString('en-IN')}</span>
                    ) : (
                      "₹0"
                    )}
                  </td>
                </tr>

                {/* Row 4 */}
                <tr className="divide-x divide-slate-300">
                  <td className="py-1.5 px-2.5 bg-slate-50 font-bold text-slate-700 w-24 text-[10px] uppercase">AREA -</td>
                  <td className="py-1.5 px-2.5 font-bold text-slate-900 border-r border-slate-800">{areaSqft.toLocaleString('en-IN')} sq.ft</td>
                  
                  <td className="py-1.5 px-2.5 bg-slate-50 font-bold text-slate-700 w-24 text-[10px] uppercase">SALES REP</td>
                  <td className="py-1.5 px-2.5 font-semibold text-indigo-700 text-[11px] border-r border-slate-800">{customer.salesOwner?.name || "System"}</td>
                  
                  <td className="py-1.5 px-2.5 bg-slate-50 font-bold text-slate-700 w-28 text-[10px] uppercase">REGISTRY COST</td>
                  <td className="py-1.5 px-2.5 font-bold text-slate-900 text-right font-mono border-r border-slate-800">₹{registryCost.toLocaleString('en-IN')}</td>
                  
                  <td className="py-1.5 px-2.5 bg-emerald-50/70 font-black text-emerald-800 w-28 text-[10px] uppercase">TOTAL RECEIVED</td>
                  <td className="py-1.5 px-2.5 font-black text-emerald-700 text-right font-mono">₹{totalPaid.toLocaleString('en-IN')}</td>
                </tr>

                {/* Row 5 (Summary Row) */}
                <tr className="divide-x divide-slate-300 bg-slate-100/80 font-bold">
                  <td className="py-1.5 px-2.5 bg-slate-200/80 font-bold text-slate-700 w-24 text-[10px] uppercase">LOCATION</td>
                  <td className="py-1.5 px-2.5 font-semibold text-slate-800 text-[11px] border-r border-slate-800">{customer.projectLocation}</td>
                  
                  <td className="py-1.5 px-2.5 bg-slate-200/80 font-bold text-slate-700 w-24 text-[10px] uppercase">STATUS</td>
                  <td className="py-1.5 px-2.5 border-r border-slate-800">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      balanceDue <= 0 ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-amber-100 text-amber-900 border border-amber-300"
                    }`}>
                      {balanceDue <= 0 ? "FULLY PAID" : "ACTIVE DUE"}
                    </span>
                  </td>
                  
                  <td className="py-1.5 px-2.5 bg-slate-200/80 font-black text-slate-900 w-28 text-[10px] uppercase">TOTAL CONTRACT</td>
                  <td className="py-1.5 px-2.5 font-black text-slate-950 text-right font-mono border-r border-slate-800">₹{totalContract.toLocaleString('en-IN')}</td>
                  
                  <td className="py-1.5 px-2.5 bg-rose-100/90 font-black text-rose-900 w-28 text-[10px] uppercase">NET CREDIT DUE</td>
                  <td className="py-1.5 px-2.5 font-black text-rose-700 text-right font-mono">₹{balanceDue.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment Ledger Table (Exact Excel Columns) */}
          <div className="overflow-x-auto border border-slate-800 mt-4">
            <table className="w-full text-xs border-collapse border border-slate-800 whitespace-nowrap">
              
              {/* Payment Header Row */}
              <thead>
                <tr className="bg-slate-200/90 text-slate-900 font-black uppercase text-[11px] border-b border-slate-800">
                  <th className="py-2 px-3 border-r border-slate-800 text-center w-10">#</th>
                  <th className="py-2 px-3 border-r border-slate-800 text-left">DATE</th>
                  <th className="py-2 px-3 border-r border-slate-800 text-left">MODE</th>
                  <th className="py-2 px-3 border-r border-slate-800 text-left">BANK / SOURCE A/C</th>
                  <th className="py-2 px-3 border-r border-slate-800 text-right">AMOUNT</th>
                  <th className="py-2 px-3 border-r border-slate-800 text-left">BENEFICIARY NAME</th>
                  <th className="py-2 px-3 border-r border-slate-800 text-left">BENEFICIARY A/C NO</th>
                  <th className="py-2 px-3 text-left">REMARKS / REFERENCE</th>
                </tr>
              </thead>

              {/* Payment Rows */}
              <tbody className="divide-y divide-slate-300 font-medium">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                      No collection payments recorded yet for this customer.
                    </td>
                  </tr>
                ) : (
                  payments.map((p, idx) => (
                    <tr key={p.id || idx} className="divide-x divide-slate-300 hover:bg-slate-50">
                      <td className="py-1.5 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-1.5 px-3 font-mono text-slate-800">
                        {new Date(p.dateOfPayment).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric"
                        })}
                      </td>
                      <td className="py-1.5 px-3 font-bold text-slate-900">
                        {p.referenceNo ? `${p.paymentMode}-${p.referenceNo}` : p.paymentMode}
                      </td>
                      <td className="py-1.5 px-3 text-slate-700">{p.sourceAccount || "Direct"}</td>
                      <td className="py-1.5 px-3 text-right font-mono font-black text-slate-950">
                        {parseFloat(p.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-1.5 px-3 text-slate-800 font-semibold">ESTATESYNC INDIA</td>
                      <td className="py-1.5 px-3 text-slate-700 font-mono text-[11px]">
                        {p.destinationAccount || "HDFC-1010"}
                      </td>
                      <td className="py-1.5 px-3 text-slate-600 text-[11px]">
                        {p.status || "RECORDED"} (Recorded by {p.recordedBy?.name || "Accounts"})
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Bottom Summary Rows (Exact Excel footer) */}
              <tfoot className="border-t-2 border-slate-800 bg-slate-100 font-black text-xs">
                <tr className="divide-x border-slate-800">
                  <td colSpan={4} className="py-2 px-4 text-right uppercase tracking-wider text-slate-900">
                    TOTAL AMT RECEIVED:
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-sm text-emerald-700 font-black">
                    {totalPaid.toLocaleString('en-IN')}
                  </td>
                  <td colSpan={3} className="py-2 px-3 text-slate-500 font-normal italic">
                    Corporate Treasury Inflow (Dr 1010 / Cr 4010)
                  </td>
                </tr>
                <tr className="divide-x divide-slate-800 bg-slate-200/90">
                  <td colSpan={4} className="py-2 px-4 text-right uppercase tracking-wider text-rose-900">
                    NET CREDIT DUE:
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-sm text-rose-700 font-black">
                    {balanceDue.toLocaleString('en-IN')}
                  </td>
                  <td colSpan={3} className="py-2 px-3 text-slate-600 font-normal">
                    Remaining Client Balance Receivable
                  </td>
                </tr>
              </tfoot>

            </table>
          </div>

          {/* Statement Footer Authorization */}
          <div className="pt-6 border-t border-slate-300 flex justify-between items-end text-xs text-slate-600 print:pt-10">
            <div>
              <p className="font-semibold text-slate-800">EstateSync Real Estate ERP</p>
              <p className="text-[10px] text-slate-400">Statement Generated on: {new Date().toLocaleDateString("en-IN")}</p>
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
