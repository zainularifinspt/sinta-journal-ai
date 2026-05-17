"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import DashboardPageShell from "@/app/components/DashboardPageShell";
import SintaBadge from "@/app/components/SintaBadge";
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

export default function AdminJournalsPage() {
  const [journals, setJournals] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
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
  const [error, setError] = useState("");

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
    setError("");
  }

  function startEdit(journal) {
    setEditingId(journal.id);
    setForm({
      nama: journal.nama ?? "",
      sinta: journal.sinta ?? "SINTA 1",
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
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      ...form,
      nama: form.nama.trim(),
    };
    const query = editingId
      ? supabase.from("journals").update(payload).eq("id", editingId)
      : supabase.from("journals").insert(payload);
    const { error: saveError } = await query;

    if (saveError) {
      setError(saveError.message);
    } else {
      setForm(emptyForm);
      setEditingId(null);
      await fetchJournals();
    }

    setSaving(false);
  }

  async function handleDelete(journal) {
    const confirmed = window.confirm(`Hapus jurnal "${journal.nama}"?`);

    if (!confirmed) {
      return;
    }

    setError("");
    const { error: deleteError } = await supabase
      .from("journals")
      .delete()
      .eq("id", journal.id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      await fetchJournals();
    }
  }

  function downloadTemplate() {
    const worksheet = XLSX.utils.aoa_to_sheet([excelHeaders]);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "journals");
    XLSX.writeFile(workbook, "template-import-jurnal.xlsx");
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
      const validRows = [];
      let failedCount = 0;

      rows.forEach((row) => {
        const payload = normalizeImportRow(row);

        if (!payload.nama || !payload.sinta) {
          failedCount += 1;
          return;
        }

        validRows.push(payload);
      });

      let successCount = 0;

      for (const payload of validRows) {
        const { error: insertError } = await supabase
          .from("journals")
          .insert(payload);

        if (insertError) {
          failedCount += 1;
        } else {
          successCount += 1;
        }
      }

      setImportResult({
        success: successCount,
        failed: failedCount,
      });

      if (successCount > 0) {
        await fetchJournals();
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
    if (!payload.nama || !payload.sinta) {
      setSintaError("Nama dan SINTA wajib tersedia sebelum disimpan.");
      return;
    }

    setSintaSaving(true);
    setSintaError("");
    setSintaSuccess("");

    const { error: insertError } = await supabase
      .from("journals")
      .insert(payload);

    if (insertError) {
      setSintaError(insertError.message);
    } else {
      setSintaSuccess("Jurnal berhasil disimpan ke database.");
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
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.4fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">
                {editingId ? "Edit Jurnal" : "Tambah Jurnal"}
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">
                Data akan disimpan ke tabel journals Supabase.
              </p>
            </div>

            <button
              type="button"
              onClick={startCreate}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              Tambah
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            {fields.map((field) => (
              <label key={field.name} className="grid gap-2">
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

            <button
              type="submit"
              disabled={saving}
              className="mt-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Tambah Jurnal"}
            </button>
          </form>
        </section>

        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                Data Jurnal
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">
                Total {journals.length} jurnal.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
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
                  setImportModalOpen(true);
                  setImportError("");
                  setImportResult(null);
                }}
                className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
              >
                Import Excel
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
                className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
              >
                Import dari URL SINTA
              </button>
            </div>
          </div>

          {loading && (
            <p className="rounded-xl bg-slate-100 p-4 font-semibold text-slate-700 dark:bg-slate-950/40 dark:text-gray-200">
              Memuat data jurnal...
            </p>
          )}

          {error && (
            <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </p>
          )}

          {!loading && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500 dark:border-white/10 dark:text-gray-400">
                  <tr>
                    <th className="py-3 pr-4">Nama</th>
                    <th className="py-3 pr-4">SINTA</th>
                    <th className="py-3 pr-4">ISSN</th>
                    <th className="py-3 pr-4">Publisher</th>
                    <th className="py-3 pr-4">Bidang</th>
                    <th className="py-3 pr-4">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                  {journals.map((journal) => (
                    <tr key={journal.id}>
                      <td className="py-4 pr-4 font-semibold">{journal.nama}</td>
                      <td className="py-4 pr-4"><SintaBadge value={journal.sinta} /></td>
                      <td className="py-4 pr-4 text-slate-600 dark:text-gray-300">{journal.issn ?? "-"}</td>
                      <td className="py-4 pr-4 text-slate-600 dark:text-gray-300">{journal.publisher ?? "-"}</td>
                      <td className="py-4 pr-4 text-slate-600 dark:text-gray-300">{journal.bidang ?? "-"}</td>
                      <td className="py-4 pr-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(journal)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(journal)}
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
            </div>
          )}
        </section>
      </div>

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
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                  Berhasil import {importResult.success} data. Gagal {importResult.failed} data.
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
