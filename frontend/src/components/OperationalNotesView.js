"use client";

import { useState, useEffect, useMemo } from "react";
import {
  NotebookPen,
  Plus,
  Search,
  RefreshCw,
  Calendar,
  IndianRupee,
  User,
  Tag,
  FileText,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit3,
  Eye,
  X,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Filter,
} from "lucide-react";
import { API_URL } from "@/config/api";
import { formatINR, formatDateTime, toISTDateInputString } from "@/utils/formatters";

const NOTE_CATEGORIES = [
  {
    id: "ALL",
    label: "All Notes",
    description: "All operational records",
  },
  {
    id: "CASH_RECEIVED_CUSTOMER",
    label: "Cash Received (Customer)",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: ArrowDownLeft,
    description: "Customer cash collection memo",
  },
  {
    id: "CASH_PAID_LAND",
    label: "Cash Paid (Land / Owner)",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: ArrowUpRight,
    description: "Land acquisition token / cash payment",
  },
  {
    id: "CASH_PAID_EXPENSE",
    label: "Cash Paid (Site / Expense)",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    icon: IndianRupee,
    description: "Field / site immediate cash expense",
  },
  {
    id: "CASH_HANDOVER",
    label: "Cash Handover / Internal",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    icon: ArrowRightLeft,
    description: "Internal staff cash handover record",
  },
  {
    id: "GENERAL_NOTE",
    label: "General Operational Note",
    badge: "bg-zinc-100 text-zinc-700 border-zinc-200",
    icon: FileText,
    description: "General observation or memo",
  },
];

export default function OperationalNotesView({ userRole = "ADMIN" }) {
  const [notes, setNotes] = useState([]);
  const [stats, setStats] = useState({
    totalNotes: 0,
    totalCashReceived: 0,
    totalCashPaidLand: 0,
    totalCashPaidExpense: 0,
    totalCashHandover: 0,
    generalNotesCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [toastMessage, setToastMessage] = useState(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [inspectingNote, setInspectingNote] = useState(null);
  const [deletingNoteId, setDeletingNoteId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    category: "CASH_RECEIVED_CUSTOMER",
    partyName: "",
    amount: "",
    referenceNo: "",
    description: "",
    noteDate: "",
  });

  // Current logged in user info
  const currentUser = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const userStr = localStorage.getItem("user");
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }, []);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== "ALL") {
        params.append("category", selectedCategory);
      }
      if (search.trim()) {
        params.append("search", search.trim());
      }
      if (startDate) {
        params.append("startDate", startDate);
      }
      if (endDate) {
        params.append("endDate", endDate);
      }
      params.append("limit", "100");

      const [notesRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/notes?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/v1/notes/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const notesData = await notesRes.json();
      const statsData = await statsRes.json();

      if (notesData.success) {
        setNotes(notesData.notes || []);
      }
      if (statsData.success) {
        setStats(statsData.stats || {});
      }
    } catch (err) {
      console.error("Failed to load operational notes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [selectedCategory, startDate, endDate]);

  const showToast = (msg, type = "success") => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleOpenCreate = () => {
    setFormData({
      title: "",
      category: "CASH_RECEIVED_CUSTOMER",
      partyName: "",
      amount: "",
      referenceNo: "",
      description: "",
      noteDate: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm
    });
    setFormError("");
    setEditingNote(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (note) => {
    const localDateStr = note.noteDate
      ? new Date(note.noteDate).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16);

    setFormData({
      title: note.title || "",
      category: note.category || "GENERAL_NOTE",
      partyName: note.partyName || "",
      amount: note.amount ? String(note.amount) : "",
      referenceNo: note.referenceNo || "",
      description: note.description || "",
      noteDate: localDateStr,
    });
    setFormError("");
    setEditingNote(note);
    setIsCreateModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError("Please enter a note title or subject.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const token = localStorage.getItem("accessToken");
      const url = editingNote
        ? `${API_URL}/api/v1/notes/${editingNote.id}`
        : `${API_URL}/api/v1/notes`;
      const method = editingNote ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          amount: formData.amount !== "" ? parseFloat(formData.amount) : 0,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save note");
      }

      showToast(
        editingNote
          ? "Operational note updated successfully."
          : "Operational note recorded successfully (Informational Record)."
      );
      setIsCreateModalOpen(false);
      fetchNotes();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (noteId) => {
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/api/v1/notes/${noteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to delete note");
      }
      showToast("Operational note deleted successfully.");
      setDeletingNoteId(null);
      fetchNotes();
    } catch (err) {
      alert("Error deleting note: " + err.message);
    }
  };

  const getCategoryMeta = (catId) => {
    return (
      NOTE_CATEGORIES.find((c) => c.id === catId) || {
        id: catId,
        label: catId,
        badge: "bg-zinc-100 text-zinc-700 border-zinc-200",
        icon: FileText,
      }
    );
  };

  const canModify = (note) => {
    if (userRole === "ADMIN") return true;
    const myId = currentUser?.id || currentUser?.userId;
    return myId && note.createdById === myId;
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Prominent Knowledge Notice Banner */}
      <div className="bg-linear-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 rounded-2xl border border-amber-200/80 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-800 shrink-0">
              <NotebookPen className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-zinc-950">
                  Operational Cash Diary & Knowledge Records
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  Zero Ledger Impact
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
                  Knowledge Only
                </span>
              </div>
              <p className="text-xs text-zinc-600 mt-1 max-w-3xl leading-relaxed">
                Entries recorded here are purely for memory and record-keeping (e.g. cash received from customers, cash paid for land tokens, immediate site expenses, handovers).{" "}
                <strong className="text-zinc-900">
                  No system calculations, ledger postings, or treasury balance adjustments will occur.
                </strong>
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff6b12] hover:bg-[#e05b0c] text-white text-xs font-bold shadow-md shadow-orange-500/20 transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            + Record Cash / Note
          </button>
        </div>
      </div>

      {/* KPI Informational Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Notes */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Total Recorded Notes
            </span>
            <span className="p-2 rounded-xl bg-zinc-100 text-zinc-600">
              <FileText className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-zinc-900">
              {stats.totalNotes || 0}
            </span>
            <span className="text-[11px] text-zinc-400 font-medium">memos</span>
          </div>
          <p className="text-[10px] text-zinc-400 mt-1">
            Informational entries in diary
          </p>
        </div>

        {/* Cash Received Logged */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
              Cash Received (Memo)
            </span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <ArrowDownLeft className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">
              {formatINR(stats.totalCashReceived || 0)}
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 mt-1">
            Customer cash logged (Knowledge only)
          </p>
        </div>

        {/* Cash Paid for Land */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
              Land Cash Paid (Memo)
            </span>
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-700">
              {formatINR(stats.totalCashPaidLand || 0)}
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 mt-1">
            Land owner cash payouts logged
          </p>
        </div>

        {/* Site Cash Expenses */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
              Site Cash / Handover (Memo)
            </span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <IndianRupee className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700">
              {formatINR(
                (stats.totalCashPaidExpense || 0) +
                  (stats.totalCashHandover || 0)
              )}
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 mt-1">
            Field expenses & handovers logged
          </p>
        </div>
      </div>

      {/* Main List Card with Filters */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
        {/* Filter Controls Bar */}
        <div className="p-5 border-b border-zinc-100 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search party name, subject, reference, or note description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") fetchNotes();
                }}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-zinc-50 border border-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-[#ff6b12]/20 focus:border-[#ff6b12] transition"
              />
            </div>

            {/* Date Filters & Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 focus:outline-hidden focus:border-[#ff6b12]"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <span>To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 focus:outline-hidden focus:border-[#ff6b12]"
                />
              </div>

              {(search || startDate || endDate || selectedCategory !== "ALL") && (
                <button
                  onClick={() => {
                    setSearch("");
                    setStartDate("");
                    setEndDate("");
                    setSelectedCategory("ALL");
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition"
                >
                  Clear
                </button>
              )}

              <button
                onClick={fetchNotes}
                disabled={loading}
                className="p-2 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl border border-zinc-200 transition"
                title="Refresh notes list"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>

          {/* Category Tabs / Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {NOTE_CATEGORIES.map((cat) => {
              const Icon = cat.icon || Tag;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-medium shrink-0 flex items-center gap-1.5 transition ${
                    isActive
                      ? "bg-zinc-900 text-white shadow-xs font-bold"
                      : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 border border-zinc-200"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Table / Feed Content */}
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 animate-spin text-[#ff6b12] mx-auto mb-3" />
            <p className="text-xs font-semibold text-zinc-500">
              Loading operational notes...
            </p>
          </div>
        ) : notes.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
              <NotebookPen className="w-6 h-6" />
            </div>
            <h5 className="text-sm font-bold text-zinc-900">
              No Operational Notes Found
            </h5>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              No cash records or operational diary entries match your filter.
              Click the button below to add your first knowledge record.
            </p>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ff6b12] text-white text-xs font-bold hover:bg-[#e05b0c] transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              + Add Note Now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 text-zinc-500 font-semibold border-b border-zinc-200">
                <tr>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Party / Contact</th>
                  <th className="py-3.5 px-4">Subject & Reference</th>
                  <th className="py-3.5 px-4 text-right">Cash Amount (₹)</th>
                  <th className="py-3.5 px-4">Logged By</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {notes.map((note) => {
                  const catMeta = getCategoryMeta(note.category);
                  const CatIcon = catMeta.icon || Tag;
                  const numAmt = note.amount ? parseFloat(note.amount) : 0;

                  return (
                    <tr
                      key={note.id}
                      className="hover:bg-zinc-50/70 transition group"
                    >
                      {/* Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="font-semibold text-zinc-900">
                            {formatDateTime(note.noteDate)}
                          </span>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${catMeta.badge}`}
                        >
                          <CatIcon className="w-3 h-3" />
                          {catMeta.label}
                        </span>
                      </td>

                      {/* Party / Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {note.partyName
                              ? note.partyName.charAt(0).toUpperCase()
                              : "—"}
                          </div>
                          <div>
                            <span className="font-bold text-zinc-900 block">
                              {note.partyName || "—"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Subject & Reference */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-bold text-zinc-900 truncate">
                          {note.title}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                          {note.referenceNo && (
                            <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 font-mono text-[10px]">
                              Ref: {note.referenceNo}
                            </span>
                          )}
                          {note.description && (
                            <span className="truncate max-w-[200px] text-zinc-400">
                              {note.description}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cash Amount (Informational Only) */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {numAmt > 0 ? (
                          <div>
                            <span
                              className={`font-black text-sm ${
                                note.category === "CASH_RECEIVED_CUSTOMER"
                                  ? "text-emerald-600"
                                  : note.category === "CASH_PAID_LAND"
                                  ? "text-indigo-600"
                                  : "text-zinc-900"
                              }`}
                            >
                              {formatINR(numAmt)}
                            </span>
                            <span className="block text-[9px] font-medium text-zinc-400">
                              (Knowledge Memo)
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-400 font-medium">—</span>
                        )}
                      </td>

                      {/* Logged By */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div>
                          <span className="font-medium text-zinc-900 block text-[11px]">
                            {note.createdByName || "Staff"}
                          </span>
                          <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-zinc-100 text-zinc-600">
                            {note.createdByRole}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setInspectingNote(note)}
                            className="p-1.5 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition"
                            title="View Full Note"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {canModify(note) && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(note)}
                                className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Edit Note"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingNoteId(note.id)}
                                className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Delete Note"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-100 text-[#ff6b12]">
                  <NotebookPen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">
                    {editingNote
                      ? "Edit Operational Note"
                      : "Record New Operational Note"}
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Informational memory log (Zero ledger calculations)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#ff6b12]/20 focus:border-[#ff6b12]"
                >
                  {NOTE_CATEGORIES.filter((c) => c.id !== "ALL").map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title / Subject */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Note Title / Subject *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cash token received from Suresh for Plot #24"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-[#ff6b12]/20 focus:border-[#ff6b12]"
                />
              </div>

              {/* Date & Time and Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.noteDate}
                    onChange={(e) =>
                      setFormData({ ...formData, noteDate: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-[#ff6b12]/20 focus:border-[#ff6b12]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Cash Amount (₹) <span className="text-zinc-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 50000"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-[#ff6b12]/20 focus:border-[#ff6b12]"
                  />
                </div>
              </div>

              {/* Party Name & Reference No */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Party / Person Name <span className="text-zinc-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar / Land Owner"
                    value={formData.partyName}
                    onChange={(e) =>
                      setFormData({ ...formData, partyName: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-[#ff6b12]/20 focus:border-[#ff6b12]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Slip / Reference No. <span className="text-zinc-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Receipt #401 / Memo-A"
                    value={formData.referenceNo}
                    onChange={(e) =>
                      setFormData({ ...formData, referenceNo: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-[#ff6b12]/20 focus:border-[#ff6b12]"
                  />
                </div>
              </div>

              {/* Description / Narration */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Detailed Note / Observation
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter any additional details, conditions, witness names, or site notes..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-[#ff6b12]/20 focus:border-[#ff6b12]"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 rounded-xl hover:bg-zinc-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#ff6b12] hover:bg-[#e05b0c] rounded-xl shadow-md shadow-orange-500/20 transition flex items-center gap-2"
                >
                  {isSubmitting && (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>{editingNote ? "Save Changes" : "Save Record"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECT DETAIL MODAL */}
      {inspectingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-100 text-[#ff6b12]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">
                    Operational Note Details
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    ID: {inspectingNote.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingNote(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Subject
                </span>
                <h4 className="text-base font-bold text-zinc-950 mt-0.5">
                  {inspectingNote.title}
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-zinc-50 border border-zinc-100 text-xs">
                <div>
                  <span className="text-zinc-400 block text-[10px]">Category</span>
                  <span className="font-bold text-zinc-900">
                    {getCategoryMeta(inspectingNote.category).label}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">
                    Cash Amount (Informational)
                  </span>
                  <span className="font-bold text-zinc-900">
                    {inspectingNote.amount
                      ? formatINR(inspectingNote.amount)
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">
                    Date & Time
                  </span>
                  <span className="font-bold text-zinc-900">
                    {formatDateTime(inspectingNote.noteDate)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">
                    Party / Person
                  </span>
                  <span className="font-bold text-zinc-900">
                    {inspectingNote.partyName || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">
                    Reference / Slip #
                  </span>
                  <span className="font-mono text-zinc-800">
                    {inspectingNote.referenceNo || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">
                    Logged By
                  </span>
                  <span className="font-bold text-zinc-900">
                    {inspectingNote.createdByName} ({inspectingNote.createdByRole})
                  </span>
                </div>
              </div>

              {inspectingNote.description && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Description & Observations
                  </span>
                  <div className="mt-1 p-3 rounded-xl bg-zinc-50 text-xs text-zinc-800 leading-relaxed whitespace-pre-wrap border border-zinc-100">
                    {inspectingNote.description}
                  </div>
                </div>
              )}

              <div className="pt-2 text-[10px] text-zinc-400 text-center">
                Strictly Informational Record • Zero Calculations or Accounting Ledger Impact
              </div>
            </div>

            <div className="px-6 py-3 bg-zinc-50/50 border-t border-zinc-100 flex justify-end">
              <button
                onClick={() => setInspectingNote(null)}
                className="px-4 py-2 text-xs font-bold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-100 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingNoteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-zinc-200 p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-sm font-bold text-zinc-950">
                Delete Operational Note?
              </h4>
              <p className="text-xs text-zinc-500">
                Are you sure you want to delete this informational diary record? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingNoteId(null)}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 rounded-xl hover:bg-zinc-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingNoteId)}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-xs"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
