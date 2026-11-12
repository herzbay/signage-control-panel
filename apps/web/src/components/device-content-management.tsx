"use client";

import { useEffect, useState } from "react";
import {
  X,
  Plus,
  Trash2,
  RefreshCw,
  Monitor,
  Image as ImageIcon,
  Video,
  Type,
  Save,
  Power,
} from "lucide-react";

import {
  getDeviceContents,
  assignContentToDevice,
  updateDeviceContent,
  removeContentFromDevice,
  type Device,
  type Content,
  type DeviceContent,
} from "@/lib/api";

type DeviceContentManagementProps = {
  device: Device;
  contents: Content[];
  onClose: () => void;
};

export default function DeviceContentManagement({
  device,
  contents,
  onClose,
}: DeviceContentManagementProps) {
  const [assignments, setAssignments] = useState<DeviceContent[]>([]);
  const [selectedContentId, setSelectedContentId] = useState("");
  const [positions, setPositions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadAssignments = async () => {
    const token = sessionStorage.getItem("admin_token");

    if (!token) {
      setError("Sesi telah berakhir. Silakan masuk kembali.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await getDeviceContents(token, device.id);

      setAssignments(data);

      const positionData: Record<string, string> = {};

      data.forEach((assignment) => {
        positionData[assignment.content_id] = String(
          assignment.position
        );
      });

      setPositions(positionData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil data konten perangkat."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device.id]);

  const assignedContentIds = assignments.map(
    (assignment) => assignment.content_id
  );

  const availableContents = contents.filter(
    (content) => !assignedContentIds.includes(content.id)
  );

  const handleAssign = async () => {
    if (!selectedContentId) return;

    const token = sessionStorage.getItem("admin_token");

    if (!token) {
      setError("Sesi telah berakhir. Silakan masuk kembali.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await assignContentToDevice(token, device.id, {
        content_id: selectedContentId,
        is_active: true,
      });

      setSelectedContentId("");
      setSuccess("Konten berhasil dihubungkan ke perangkat.");
      await loadAssignments();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menghubungkan konten."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePosition = async (assignment: DeviceContent) => {
    const token = sessionStorage.getItem("admin_token");
    const position = Number(positions[assignment.content_id]);

    if (!token) {
      setError("Sesi telah berakhir. Silakan masuk kembali.");
      return;
    }

    if (!Number.isInteger(position) || position < 1) {
      setError("Urutan penayangan harus berupa angka minimal 1.");
      return;
    }

    setProcessingId(assignment.content_id);
    setError("");
    setSuccess("");

    try {
      await updateDeviceContent(
        token,
        device.id,
        assignment.content_id,
        { position }
      );

      setSuccess("Urutan penayangan berhasil diperbarui.");
      await loadAssignments();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memperbarui urutan penayangan."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleActive = async (assignment: DeviceContent) => {
    const token = sessionStorage.getItem("admin_token");

    if (!token) {
      setError("Sesi telah berakhir. Silakan masuk kembali.");
      return;
    }

    setProcessingId(assignment.content_id);
    setError("");
    setSuccess("");

    try {
      await updateDeviceContent(
        token,
        device.id,
        assignment.content_id,
        { is_active: !assignment.is_active }
      );

      setSuccess(
        assignment.is_active
          ? "Konten berhasil dinonaktifkan."
          : "Konten berhasil diaktifkan."
      );

      await loadAssignments();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengubah status konten."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemove = async (assignment: DeviceContent) => {
    const contentName =
      assignment.contents?.judul ?? "konten ini";

    const confirmed = window.confirm(
      `Lepaskan "${contentName}" dari perangkat ini? Konten aslinya tidak akan dihapus.`
    );

    if (!confirmed) return;

    const token = sessionStorage.getItem("admin_token");

    if (!token) {
      setError("Sesi telah berakhir. Silakan masuk kembali.");
      return;
    }

    setProcessingId(assignment.content_id);
    setError("");
    setSuccess("");

    try {
      await removeContentFromDevice(
        token,
        device.id,
        assignment.content_id
      );

      setSuccess("Konten berhasil dilepaskan dari perangkat.");
      await loadAssignments();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal melepaskan konten."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const getContentIcon = (type: Content["tipe"] | undefined) => {
    switch (type) {
      case "image":
        return <ImageIcon size={18} />;
      case "video":
        return <Video size={18} />;
      default:
        return <Type size={18} />;
    }
  };

  const getContentTypeLabel = (
    type: Content["tipe"] | undefined
  ) => {
    switch (type) {
      case "image":
        return "Gambar";
      case "video":
        return "Video";
      case "text":
        return "Teks";
      default:
        return "Tidak diketahui";
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-200 px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <Monitor size={19} className="text-zinc-600" />
              <h3 className="text-lg font-semibold text-zinc-900">
                Kelola Konten Perangkat
              </h3>
            </div>

            <p className="mt-1 text-sm text-zinc-500">
              {device.nama} · {device.lokasi}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Tutup"
          >
            <X size={19} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 overflow-y-auto p-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}

          {/* Assign content */}
          <section>
            <h4 className="font-semibold text-zinc-900">
              Hubungkan Konten
            </h4>

            <p className="mt-1 text-sm text-zinc-500">
              Pilih konten yang ingin ditampilkan pada perangkat ini.
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <select
                value={selectedContentId}
                onChange={(event) =>
                  setSelectedContentId(event.target.value)
                }
                disabled={saving || availableContents.length === 0}
                className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:bg-zinc-100"
              >
                <option value="">
                  {availableContents.length === 0
                    ? "Tidak ada konten tersedia"
                    : "Pilih konten"}
                </option>

                {availableContents.map((content) => (
                  <option key={content.id} value={content.id}>
                    {content.judul} (
                    {getContentTypeLabel(content.tipe)})
                  </option>
                ))}
              </select>

              <button
                onClick={handleAssign}
                disabled={!selectedContentId || saving}
                className="flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Plus size={17} />
                )}
                Hubungkan
              </button>
            </div>
          </section>

          <div className="border-t border-zinc-200" />

          {/* Assigned contents */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="font-semibold text-zinc-900">
                  Konten Terhubung
                </h4>

                <p className="mt-1 text-sm text-zinc-500">
                  {assignments.length} konten terhubung ke perangkat ini.
                </p>
              </div>

              <button
                onClick={() => void loadAssignments()}
                disabled={loading}
                title="Muat ulang daftar konten"
                className="rounded-lg border border-zinc-200 p-2.5 text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={loading ? "animate-spin" : ""}
                />
              </button>
            </div>

            {loading ? (
              <div className="py-10 text-center text-sm text-zinc-500">
                Memuat daftar konten...
              </div>
            ) : assignments.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-zinc-300 px-5 py-10 text-center">
                <Monitor
                  size={30}
                  className="mx-auto text-zinc-300"
                />
                <p className="mt-3 text-sm font-medium text-zinc-700">
                  Belum ada konten terhubung
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Hubungkan konten menggunakan pilihan di atas.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.content_id}
                    className="rounded-lg border border-zinc-200 p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                          {getContentIcon(
                            assignment.contents?.tipe
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-900">
                            {assignment.contents?.judul ??
                              "Konten tidak ditemukan"}
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            {getContentTypeLabel(
                              assignment.contents?.tipe
                            )}
                            {" · "}
                            Urutan {assignment.position}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() =>
                            void handleToggleActive(assignment)
                          }
                          disabled={
                            processingId === assignment.content_id
                          }
                          title={
                            assignment.is_active
                              ? "Nonaktifkan konten"
                              : "Aktifkan konten"
                          }
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition disabled:opacity-50 ${
                            assignment.is_active
                              ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                              : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
                          }`}
                        >
                          <Power size={14} />
                          {assignment.is_active
                            ? "Aktif"
                            : "Nonaktif"}
                        </button>

                        <button
                          onClick={() => void handleRemove(assignment)}
                          disabled={
                            processingId === assignment.content_id
                          }
                          title="Lepaskan konten"
                          className="rounded-lg border border-red-100 p-2 text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          {processingId === assignment.content_id ? (
                            <RefreshCw
                              size={15}
                              className="animate-spin"
                            />
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-zinc-100 pt-3">
                      <div className="flex-1 sm:max-w-40">
                        <label
                          htmlFor={`position-${assignment.content_id}`}
                          className="mb-1.5 block text-xs font-medium text-zinc-600"
                        >
                          Urutan penayangan
                        </label>

                        <input
                          id={`position-${assignment.content_id}`}
                          type="number"
                          min="1"
                          step="1"
                          value={
                            positions[assignment.content_id] ??
                            String(assignment.position)
                          }
                          onChange={(event) =>
                            setPositions((previous) => ({
                              ...previous,
                              [assignment.content_id]:
                                event.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                        />
                      </div>

                      <button
                        onClick={() =>
                          void handleUpdatePosition(assignment)
                        }
                        disabled={
                          processingId === assignment.content_id ||
                          Number(positions[assignment.content_id]) ===
                            assignment.position
                        }
                        className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Save size={14} />
                        Simpan Urutan
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-zinc-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
