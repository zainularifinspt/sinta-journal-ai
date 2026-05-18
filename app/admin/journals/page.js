"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import DashboardPageShell from "@/app/components/DashboardPageShell";
import SintaBadge, { normalizeSinta } from "@/app/components/SintaBadge";
import { supabase } from "@/lib/supabase";

const emptyForm = {
  nama: "",
  sinta: "SINTA 1",
  issn: "",
  eissn: "",
  publisher: "",
  bidang: "",
  jadwal: "",
  website: "",
  scope: "",
  catatan_ai: "",
};

const fields = [
  { name: "nama", label: "Nama" },
  { name: "sinta", label: "SINTA", type: "select" },
  { name: "issn", label: "ISSN" },
  { name: "eissn", label: "E-ISSN" },
  { name: "publisher", label: "Publisher" },
  { name: "bidang", label: "Bidang" },
  { name: "jadwal", label: "Jadwal" },
  { name: "website", label: "Website" },
  { name: "scope", label: "Scope", type: "textarea" },
  { name: "catatan_ai", label: "Catatan AI", type: "textarea" },
];
const excelHeaders = [
  "nama",
  "sinta",
  "issn",
  "eissn",
  "publisher",
  "bidang",
  "jadwal",
  "website",
  "scope",
  "catatan_ai",
];

const duplicateIdentifierMessage = "Jurnal dengan ISSN/e-ISSN ini sudah terdaftar.";

function normalizeIdentifier(value) {
  return String(value ?? "")
    .replace(/[^0-9xX]/g, "")
    .toUpperCase();
}

function getJournalIdentifiers(journal) {
  return [journal.issn, journal.eissn].map(normalizeIdentifier).filter(Boolean);
}

function hasDuplicateIdentifier(journals, payload, ignoredId = null) {
  const identifiers = getJournalIdentifiers(payload);

  if (identifiers.length === 0) {
    return false;
  }

  return journals.some((journal) => {
    if (ignoredId && journal.id === ignoredId) {
      return false;
    }

    const existingIdentifiers = getJournalIdentifiers(journal);
    return identifiers.some((identifier) => existingIdentifiers.includes(identifier));
  });
}

async function fetchJournalIdentifiers() {
  const { data, error } = await supabase
    .from("journals")
    .select("id, issn, eissn");

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export default function AdminJournalsPage() {
  const [journals, setJournals] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState("");
  const [sintaModalOpen, setSintaModalOpen] = useState(false);
  const [sintaUrl, setSintaUrl] = useState("");
  const [sintaPreview, setSintaPreview] = useState(null);
  const [manualSintaData, setManualSintaData] = useState(emptyForm);
  const [showManualSintaForm, setShowManualSintaForm] = useState(false);
  const [sintaLoading, setSintaLoading] = useState(false);
  const [sintaSaving, setSintaSaving] = useState(false);
  const [sintaError, setSintaError] = useState("");
  const [sintaSuccess, setSintaSuccess] = useState("");
  const [journalToDelete, setJournalToDelete] = useState(null);
  const [deletingJournal, setDeletingJournal] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    sinta: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const filteredJournals = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase();

    return journals.filter((journal) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          journal.nama,
          journal.issn,
          journal.eissn,
          journal.publisher,
        ]
          .map((value) => String(value ?? "").toLowerCase())
          .some((value) => value.includes(normalizedSearch));
      const matchesSinta = !filters.sinta || normalizeSinta(journal.sinta) === filters.sinta;

      return matchesSearch && matchesSinta;
    });
  }, [filters, journals]);

  useEffect(() => {
    fetchJournals();
  }, []);

  async function fetchJournals() {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("journals")
      .select("*")
      .order("nama", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setJournals([]);
    } else {
      setJournals(data ?? []);
    }

    setLoading(false);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
    setError("");
    setSuccess("");
  }

  function startEdit(journal) {
    setEditingId(journal.id);
    setFormOpen(true);
    setForm({
      nama: journal.nama ?? "",
      sinta: normalizeSinta(journal.sinta ?? "SINTA 1"),
      issn: journal.issn ?? "",
      eissn: journal.eissn ?? "",
      publisher: journal.publisher ?? "",
      bidang: journal.bidang ?? "",
      jadwal: journal.jadwal ?? "",
      website: journal.website ?? "",
      scope: journal.scope ?? "",
      catatan_ai: journal.catatan_ai ?? journal.catatanAI ?? "",
    });
    setError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      ...form,
      nama: form.nama.trim(),
      sinta: normalizeSinta(form.sinta),
      issn: form.issn.trim(),
      eissn: form.eissn.trim(),
    };

    if (!payload.nama || !payload.sinta) {
      setError("Nama dan SINTA wajib diisi.");
      toast.error("Nama dan SINTA wajib diisi");
      setSaving(false);
      return;
    }

    let identifierJournals = journals;

    try {
      identifierJournals = await fetchJournalIdentifiers();
    } catch (identifierError) {
      setError(identifierError.message);
      toast.error("Gagal memeriksa duplikat jurnal", { description: identifierError.message });
      setSaving(false);
      return;
    }

    if (hasDuplicateIdentifier(identifierJournals, payload, editingId)) {
      setError(duplicateIdentifierMessage);
      toast.error(duplicateIdentifierMessage);
      setSaving(false);
      return;
    }

    const query = editingId
      ? supabase.from("journals").update(payload).eq("id", editingId)
      : supabase.from("journals").insert(payload);
    const { error: saveError } = await query;

    if (saveError) {
      setError(saveError.message);
      toast.error("Gagal menyimpan jurnal", { description: saveError.message });
    } else {
      setForm(emptyForm);
      setEditingId(null);
      setFormOpen(false);
      setSuccess(editingId ? "Perubahan jurnal berhasil disimpan." : "Jurnal baru berhasil ditambahkan.");
      toast.success(editingId ? "Jurnal berhasil diperbarui" : "Jurnal berhasil ditambahkan");
      await fetchJournals();
    }

    setSaving(false);
  }

  async function confirmDeleteJournal() {
    if (!journalToDelete?.id) {
      return;
    }

    setDeletingJournal(true);
    setError("");
    const { error: deleteError } = await supabase
      .from("journals")
      .delete()
      .eq("id", journalToDelete.id);

    if (deleteError) {
      setError(deleteError.message);
      toast.error("Gagal menghapus jurnal", { description: deleteError.message });
    } else {
      setSuccess("Jurnal berhasil dihapus.");
      toast.success("Jurnal berhasil dihapus");
      setJournalToDelete(null);
      await fetchJournals();
    }

    setDeletingJournal(false);
  }

  function downloadTemplate() {
    const worksheet = XLSX.utils.aoa_to_sheet([excelHeaders]);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "journals");
    XLSX.writeFile(workbook, "template-import-jurnal.xlsx");
  }

  function getExportRows() {
    return filteredJournals.map((journal) =>
      excelHeaders.reduce((row, header) => {
        row[header] = journal[header] ?? "";
        return row;
      }, {})
    );
  }

  function exportExcel() {
    const worksheet = XLSX.utils.json_to_sheet(getExportRows(), { header: excelHeaders });
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "journals");
    XLSX.writeFile(workbook, "data-jurnal.xlsx");
  }

  function exportCsv() {
    const worksheet = XLSX.utils.json_to_sheet(getExportRows(), { header: excelHeaders });
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "data-jurnal.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function normalizeImportRow(row) {
    return excelHeaders.reduce((payload, header) => {
      payload[header] = String(row[header] ?? "").trim();
      return payload;
    }, {});
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setImporting(true);
    setImportError("");
    setImportResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        throw new Error("File Excel tidak memiliki sheet.");
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      const existingJournals = await fetchJournalIdentifiers();
      const existingIdentifiers = new Set((existingJournals ?? []).flatMap(getJournalIdentifiers));
      const importedIdentifiers = new Set();
      const rowsToImport = [];
      let duplicateCount = 0;
      let incompleteCount = 0;

      rows.forEach((row) => {
        const payload = normalizeImportRow(row);

        if (!payload.nama || !payload.sinta) {
          incompleteCount += 1;
          return;
        }

        const identifiers = getJournalIdentifiers(payload);
        const isDuplicate = identifiers.some(
          (identifier) => existingIdentifiers.has(identifier) || importedIdentifiers.has(identifier)
        );

        if (isDuplicate) {
          duplicateCount += 1;
          return;
        }

        identifiers.forEach((identifier) => importedIdentifiers.add(identifier));
        rowsToImport.push(payload);
      });

      let successCount = 0;
      let saveFailedCount = 0;

      for (const payload of rowsToImport) {
        const { error: insertError } = await supabase
          .from("journals")
          .insert(payload);

        if (insertError) {
          saveFailedCount += 1;
        } else {
          successCount += 1;
          getJournalIdentifiers(payload).forEach((identifier) => existingIdentifiers.add(identifier));
        }
      }

      setImportResult({
        success: successCount,
        duplicate: duplicateCount,
        incomplete: incompleteCount,
        saveFailed: saveFailedCount,
      });

      if (successCount > 0) {
        toast.success(`${successCount} jurnal berhasil diimport`);
        await fetchJournals();
      } else {
        toast.info("Tidak ada jurnal baru yang diimport");
      }
    } catch (importException) {
      setImportError(importException.message ?? "Gagal membaca file Excel.");
    }

    event.target.value = "";
    setImporting(false);
  }

  function isValidSintaUrl(value) {
    try {
      const url = new URL(value);

      return (
        url.protocol === "https:" &&
        url.hostname === "sinta.kemdiktisaintek.go.id" &&
        /^\/journals\/profile\/\d+\/?$/.test(url.pathname)
      );
    } catch {
      return false;
    }
  }

  async function handleFetchSinta(event) {
    event.preventDefault();
    setSintaError("");
    setSintaSuccess("");
    setSintaPreview(null);
    setShowManualSintaForm(false);

    if (!isValidSintaUrl(sintaUrl)) {
      setSintaError("URL SINTA tidak valid. Gunakan format https://sinta.kemdiktisaintek.go.id/journals/profile/1234");
      setShowManualSintaForm(true);
      return;
    }

    setSintaLoading(true);

    try {
      const response = await fetch("/api/import-sinta", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: sintaUrl }),
      });
      const result = await response.json();

      if (!response.ok) {
        const causes = Array.isArray(result.kemungkinanPenyebab)
          ? `\n\nKemungkinan penyebab:\n- ${result.kemungkinanPenyebab.join("\n- ")}`
          : "";
        const detail = result.detail ? `\nDetail: ${result.detail}` : "";

        throw new Error(`${result.error ?? "Gagal mengambil data dari SINTA."}${detail}${causes}`);
      }

      setSintaPreview(result.journal);
      setManualSintaData({ ...emptyForm, ...result.journal });
    } catch (fetchError) {
      setSintaError(fetchError.message ?? "Gagal mengambil data dari SINTA.");
      setShowManualSintaForm(true);
    }

    setSintaLoading(false);
  }

  function handleManualSintaChange(event) {
    const { name, value } = event.target;

    setManualSintaData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  async function saveSintaJournal(payload) {
    const cleanPayload = {
      ...payload,
      nama: String(payload.nama ?? "").trim(),
      sinta: normalizeSinta(payload.sinta),
      issn: String(payload.issn ?? "").trim(),
      eissn: String(payload.eissn ?? "").trim(),
    };

    if (!cleanPayload.nama || !cleanPayload.sinta) {
      setSintaError("Nama dan SINTA wajib tersedia sebelum disimpan.");
      return;
    }

    let identifierJournals = journals;

    try {
      identifierJournals = await fetchJournalIdentifiers();
    } catch (identifierError) {
      setSintaError(identifierError.message);
      toast.error("Gagal memeriksa duplikat jurnal", { description: identifierError.message });
      return;
    }

    if (hasDuplicateIdentifier(identifierJournals, cleanPayload)) {
      setSintaError(duplicateIdentifierMessage);
      toast.error(duplicateIdentifierMessage);
      return;
    }

    setSintaSaving(true);
    setSintaError("");
    setSintaSuccess("");

    const { error: insertError } = await supabase
      .from("journals")
      .insert(cleanPayload);

    if (insertError) {
      setSintaError(insertError.message);
    } else {
      setSintaSuccess("Jurnal berhasil disimpan ke database.");
      toast.success("Jurnal berhasil disimpan");
      await fetchJournals();
    }

    setSintaSaving(false);
  }

  async function handleSaveSintaPreview() {
    if (!sintaPreview) {
      return;
    }

    await saveSintaJournal(sintaPreview);
  }

  async function handleSaveManualSinta() {
    await saveSintaJournal(manualSintaData);
  }

  return (
    <DashboardPageShell title="Kelola Jurnal" allowedRoles={["admin"]}>
      <div className="grid gap-6">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/10 md:p-6">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                Data Jurnal
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">
                Menampilkan {filteredJournals.length} dari {journals.length} jurnal.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={startCreate}
                className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
              >
                Tambah Jurnal
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportModalOpen(true);
                  setImportError("");
                  setImportResult(null);
                }}
                className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
              >
                Import Excel
              </button>
              <button
                type="button"
                onClick={downloadTemplate}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              >
                Download Template Excel
              </button>
              <button
                type="button"
                onClick={() => {
                  setSintaModalOpen(true);
                  setSintaError("");
                  setSintaSuccess("");
                  setSintaPreview(null);
                  setManualSintaData(emptyForm);
                  setShowManualSintaForm(false);
                }}
                className="rounded-xl bg-teal-600 px-4 py-2 font-semibold text-white transition hover:bg-teal-700"
              >
                Import dari URL SINTA
              </button>
              <button
                type="button"
                onClick={exportExcel}
                disabled={filteredJournals.length === 0}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              >
                Export Excel
              </button>
              <button
                type="button"
                onClick={exportCsv}
                disabled={filteredJournals.length === 0}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              >
                Export CSV
              </button>
            </div>
          </div>

          {success && (
            <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
              {success}
            </p>
          )}

          {error && (
            <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </p>
          )}

          <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/40 md:grid-cols-[minmax(0,1fr)_180px]">
            <label className="grid min-w-0 gap-2">
              <span className="text-sm font-semibold text-slate-600 dark:text-gray-300">
                Cari nama, ISSN/e-ISSN, atau publisher
              </span>
              <input
                value={filters.search}
                onChange={(event) =>
                  setFilters((currentFilters) => ({
                    ...currentFilters,
                    search: event.target.value,
                  }))
                }
                placeholder="Ketik nama jurnal, ISSN, e-ISSN, publisher..."
                className="min-w-0 rounded-xl bg-white p-3 text-black outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:ring-0"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-600 dark:text-gray-300">
                Filter SINTA
              </span>
              <select
                value={filters.sinta}
                onChange={(event) =>
                  setFilters((currentFilters) => ({
                    ...currentFilters,
                    sinta: event.target.value,
                  }))
                }
                className="rounded-xl bg-white p-3 text-black outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:ring-0"
              >
                <option value="">Semua SINTA</option>
                <option>SINTA 1</option>
                <option>SINTA 2</option>
                <option>SINTA 3</option>
                <option>SINTA 4</option>
                <option>SINTA 5</option>
                <option>SINTA 6</option>
              </select>
            </label>
          </div>

          {loading && (
            <p className="rounded-xl bg-slate-100 p-4 font-semibold text-slate-700 dark:bg-slate-950/40 dark:text-gray-200">
              Memuat data jurnal...
            </p>
          )}

          {!loading && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
              <table className="w-full min-w-[980px] table-fixed text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-slate-950/40 dark:text-gray-400">
                  <tr>
                    <th className="w-[34%] px-4 py-3">Nama</th>
                    <th className="w-[110px] px-4 py-3">SINTA</th>
                    <th className="w-[150px] px-4 py-3">ISSN/e-ISSN</th>
                    <th className="w-[22%] px-4 py-3">Publisher</th>
                    <th className="w-[16%] px-4 py-3">Bidang</th>
                    <th className="w-[150px] px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                  {filteredJournals.map((journal) => (
                    <tr key={journal.id} className="align-top">
                      <td className="break-words px-4 py-4 font-semibold leading-6">{journal.nama}</td>
                      <td className="px-4 py-4"><SintaBadge value={journal.sinta} /></td>
                      <td className="px-4 py-4 text-slate-600 dark:text-gray-300">
                        <div className="break-words">{journal.issn || "-"}</div>
                        <div className="break-words text-xs text-slate-500 dark:text-gray-400">{journal.eissn || "-"}</div>
                      </td>
                      <td className="break-words px-4 py-4 text-slate-600 dark:text-gray-300">{journal.publisher ?? "-"}</td>
                      <td className="break-words px-4 py-4 text-slate-600 dark:text-gray-300">{journal.bidang ?? "-"}</td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(journal)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setJournalToDelete(journal)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredJournals.length === 0 && (
                <p className="bg-slate-50 p-5 text-center font-semibold text-slate-600 dark:bg-slate-950/40 dark:text-gray-300">
                  Tidak ada jurnal yang cocok dengan filter.
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-8">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">
                  {editingId ? "Edit Jurnal" : "Tambah Jurnal"}
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-gray-300">
                  Data akan disimpan ke tabel journals Supabase.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setFormOpen(false)}
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
              {fields.map((field) => (
                <label
                  key={field.name}
                  className={`grid gap-2 ${field.type === "textarea" ? "md:col-span-2" : ""}`}
                >
                  <span className="font-semibold">
                    {field.label}
                  </span>
                  {field.type === "textarea" ? (
                    <textarea
                      name={field.name}
                      value={form[field.name]}
                      onChange={handleChange}
                      rows={4}
                      className="resize-none rounded-xl bg-white p-3 text-black outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:ring-0"
                    />
                  ) : field.type === "select" ? (
                    <select
                      name={field.name}
                      value={form[field.name]}
                      onChange={handleChange}
                      className="rounded-xl bg-white p-3 text-black outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:ring-0"
                    >
                      <option>SINTA 1</option>
                      <option>SINTA 2</option>
                      <option>SINTA 3</option>
                      <option>SINTA 4</option>
                      <option>SINTA 5</option>
                      <option>SINTA 6</option>
                    </select>
                  ) : (
                    <input
                      name={field.name}
                      value={form[field.name]}
                      onChange={handleChange}
                      required={field.name === "nama"}
                      className="rounded-xl bg-white p-3 text-black outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:ring-0"
                    />
                  )}
                </label>
              ))}

              <div className="flex flex-wrap gap-3 md:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="mt-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Tambah Jurnal"}
                </button>

                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  disabled={saving}
                  className="mt-2 rounded-xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {journalToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-red-600 dark:text-red-300">
                Konfirmasi
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                Hapus Jurnal?
              </h2>
              <p className="mt-3 break-words text-slate-600 dark:text-gray-300">
                Data jurnal <span className="font-semibold text-slate-950 dark:text-white">{journalToDelete.nama}</span> akan dihapus permanen.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setJournalToDelete(null)}
                disabled={deletingJournal}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteJournal}
                disabled={deletingJournal}
                className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
              >
                {deletingJournal ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-8">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">
                  Import Jurnal dari Excel
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-gray-300">
                  Upload file .xlsx dengan header sesuai template. Kolom nama dan sinta wajib diisi.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                disabled={importing}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              >
                Tutup
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              <input
                type="file"
                accept=".xlsx"
                onChange={handleImportFile}
                disabled={importing}
                className="block w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-semibold file:text-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-gray-200"
              />

              <button
                type="button"
                onClick={downloadTemplate}
                className="w-fit rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              >
                Download Template Excel
              </button>

              {importing && (
                <div className="rounded-xl bg-slate-100 p-4 font-semibold text-slate-700 dark:bg-slate-950/40 dark:text-gray-200">
                  Mengimport data jurnal...
                </div>
              )}

              {importError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
                  {importError}
                </div>
              )}

              {importResult && (
                <div className="grid gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                  <p>Berhasil diimport: {importResult.success} data.</p>
                  <p>Dilewati karena duplikat: {importResult.duplicate} data.</p>
                  <p>Gagal karena data tidak lengkap: {importResult.incomplete} data.</p>
                  {importResult.saveFailed > 0 && (
                    <p>Gagal disimpan karena error database: {importResult.saveFailed} data.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {sintaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-8">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">
                  Import dari URL SINTA
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-gray-300">
                  Masukkan satu URL profil jurnal SINTA. Proses ini hanya mengambil satu halaman, tanpa crawling.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSintaModalOpen(false)}
                disabled={sintaLoading || sintaSaving}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleFetchSinta} className="mt-6 grid gap-4">
              <label className="grid gap-2">
                <span className="font-semibold">
                  URL SINTA
                </span>
                <input
                  type="url"
                  value={sintaUrl}
                  onChange={(event) => setSintaUrl(event.target.value)}
                  placeholder="https://sinta.kemdiktisaintek.go.id/journals/profile/1234"
                  className="rounded-xl bg-white p-3 text-black outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:ring-0"
                />
              </label>

              <button
                type="submit"
                disabled={sintaLoading}
                className="w-fit rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
              >
                {sintaLoading ? "Mengambil data..." : "Ambil Data"}
              </button>
            </form>

            {sintaError && (
              <div className="mt-5 whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
                {sintaError}
              </div>
            )}

            {sintaSuccess && (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                {sintaSuccess}
              </div>
            )}

            {sintaPreview && (
              <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/40">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                      Preview Data
                    </p>
                    <h3 className="mt-1 text-2xl font-bold">
                      {sintaPreview.nama}
                    </h3>
                  </div>
                  <SintaBadge value={sintaPreview.sinta} />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {excelHeaders.map((field) => (
                    <div
                      key={field}
                      className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/10"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                        {field}
                      </p>
                      <p className="mt-1 break-words font-semibold">
                        {sintaPreview[field] || "-"}
                      </p>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleSaveSintaPreview}
                  disabled={sintaSaving}
                  className="mt-5 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
                >
                  {sintaSaving ? "Menyimpan..." : "Simpan ke Database"}
                </button>
              </section>
            )}

            {showManualSintaForm && (
              <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/40">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                    Input Manual
                  </p>
                  <h3 className="mt-1 text-2xl font-bold">
                    Lengkapi Data Jurnal
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-gray-300">
                    Jika halaman SINTA tidak bisa diambil otomatis, isi data dasar jurnal di sini lalu simpan.
                  </p>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {[
                    { name: "nama", label: "Nama Jurnal", required: true },
                    { name: "sinta", label: "SINTA", type: "select", required: true },
                    { name: "issn", label: "ISSN" },
                    { name: "eissn", label: "E-ISSN" },
                    { name: "publisher", label: "Publisher" },
                    { name: "bidang", label: "Bidang" },
                    { name: "website", label: "Website" },
                  ].map((field) => (
                    <label key={field.name} className="grid gap-2">
                      <span className="font-semibold">
                        {field.label}
                      </span>
                      {field.type === "select" ? (
                        <select
                          name={field.name}
                          value={manualSintaData[field.name]}
                          onChange={handleManualSintaChange}
                          className="rounded-xl bg-white p-3 text-black outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:ring-0"
                        >
                          <option>SINTA 1</option>
                          <option>SINTA 2</option>
                          <option>SINTA 3</option>
                          <option>SINTA 4</option>
                          <option>SINTA 5</option>
                          <option>SINTA 6</option>
                        </select>
                      ) : (
                        <input
                          name={field.name}
                          value={manualSintaData[field.name]}
                          onChange={handleManualSintaChange}
                          required={field.required}
                          className="rounded-xl bg-white p-3 text-black outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:ring-0"
                        />
                      )}
                    </label>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleSaveManualSinta}
                  disabled={sintaSaving}
                  className="mt-5 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
                >
                  {sintaSaving ? "Menyimpan..." : "Simpan Manual ke Database"}
                </button>
              </section>
            )}
          </div>
        </div>
      )}
    </DashboardPageShell>
  );
}
