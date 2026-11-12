"use client";

import {
  useState,
  type ComponentProps,
} from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Monitor,
  X,
  RefreshCw,
  Images,
} from "lucide-react";

import {
  createDevice,
  updateDevice,
  deleteDevice,
  type Device,
  type Content,
} from "@/lib/api";

import DeviceContentManagement from "@/components/device-content-management";
import { useToast } from "@/components/toast-provider";

type DeviceManagementProps = {
  devices: Device[];
  setDevices: React.Dispatch<React.SetStateAction<Device[]>>;
  contents: Content[];
  loading: boolean;
  onRefresh: () => void;
};

export default function DeviceManagement({
  devices,
  setDevices,
  contents,
  loading,
  onRefresh,
}: DeviceManagementProps) {
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [managingDevice, setManagingDevice] = useState<Device | null>(null);

  const [nama, setNama] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const openCreateModal = () => {
    setEditingDevice(null);
    setNama("");
    setLokasi("");
    setError("");
    setModalOpen(true);
  };

  const openEditModal = (device: Device) => {
    setEditingDevice(device);
    setNama(device.nama);
    setLokasi(device.lokasi);
    setError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingDevice(null);
    setNama("");
    setLokasi("");
    setError("");
  };

  const handleSubmit: NonNullable<
    ComponentProps<"form">["onSubmit"]
  > = async (event) => {
    event.preventDefault();

    const token = sessionStorage.getItem("admin_token");

    if (!token) {
      const message = "Sesi telah berakhir. Silakan masuk kembali.";
      setError(message);
      showToast(message, "error");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const formData = {
        nama: nama.trim(),
        lokasi: lokasi.trim(),
      };

      if (editingDevice) {
        const updatedDevice = await updateDevice(
          token,
          editingDevice.id,
          formData
        );

        setDevices((previous) =>
          previous.map((device) =>
            device.id === updatedDevice.id ? updatedDevice : device
          )
        );
      } else {
        const newDevice = await createDevice(token, formData);

        setDevices((previous) => [newDevice, ...previous]);
      }

      showToast(
        editingDevice
          ? "Perangkat berhasil diperbarui."
          : "Perangkat berhasil ditambahkan."
      );

      setModalOpen(false);
      setEditingDevice(null);
      setNama("");
      setLokasi("");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Gagal menyimpan data perangkat.";

      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (device: Device) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus perangkat "${device.nama}"?`
    );

    if (!confirmed) return;

    const token = sessionStorage.getItem("admin_token");

    if (!token) {
      const message = "Sesi telah berakhir. Silakan masuk kembali.";
      setError(message);
      showToast(message, "error");
      return;
    }

    setDeletingId(device.id);
    setError("");

    try {
      await deleteDevice(token, device.id);

      setDevices((previous) =>
        previous.filter((item) => item.id !== device.id)
      );

      showToast("Perangkat berhasil dihapus.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Gagal menghapus perangkat.";

      setError(message);
      showToast(message, "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-zinc-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Pengelolaan Perangkat
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Kelola dan pantau perangkat penampil digital.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Muat Ulang
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <Plus size={17} />
            Tambah Perangkat
          </button>
        </div>
      </div>

      {/* Pesan kesalahan */}
      {error && !modalOpen && (
        <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Daftar perangkat */}
      <div className="p-5">
        {loading ? (
          <div className="py-12 text-center text-sm text-zinc-500">
            Memuat daftar perangkat...
          </div>
        ) : devices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Monitor size={36} className="mb-3 text-zinc-400" />
            <p className="font-medium text-zinc-700 dark:text-zinc-200">
              Belum ada perangkat
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Tambahkan perangkat pertama untuk memulai.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Perangkat</th>
                  <th className="px-6 py-4 font-medium">Lokasi</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">
                    Terakhir Terhubung
                  </th>
                  <th className="px-6 py-4 text-right font-medium">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {devices.map((device) => (
                  <tr
                    key={device.id}
                    className="transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-zinc-900 dark:text-white">
                        {device.nama}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        {device.id}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">
                      {device.lokasi}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                          device.status === "online"
                            ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300"
                            : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            device.status === "online"
                              ? "bg-green-500"
                              : "bg-red-500"
                          }`}
                        />
                        {device.status === "online" ? "Online" : "Offline"}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                      {device.last_seen
                        ? new Date(device.last_seen).toLocaleString("id-ID")
                        : "Belum pernah terhubung"}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setManagingDevice(device)}
                          title="Kelola konten perangkat"
                          className="rounded-lg border border-zinc-300 p-2 text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          <Images size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(device)}
                          title="Ubah perangkat"
                          className="rounded-lg border border-zinc-300 p-2 text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleDelete(device)}
                          disabled={deletingId === device.id}
                          title="Hapus perangkat"
                          className="rounded-lg border border-red-200 p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950/30"
                        >
                          {deletingId === device.id ? (
                            <RefreshCw
                              size={16}
                              className="animate-spin"
                            />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal tambah dan ubah perangkat */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  {editingDevice
                    ? "Ubah Perangkat"
                    : "Tambah Perangkat"}
                </h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {editingDevice
                    ? "Perbarui informasi perangkat."
                    : "Daftarkan perangkat penampil digital baru."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="device-name"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Nama Perangkat
                </label>

                <input
                  id="device-name"
                  type="text"
                  value={nama}
                  onChange={(event) => setNama(event.target.value)}
                  placeholder="Contoh: Smart TV Lobby"
                  required
                  maxLength={100}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="device-location"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Lokasi Perangkat
                </label>

                <input
                  id="device-location"
                  type="text"
                  value={lokasi}
                  onChange={(event) => setLokasi(event.target.value)}
                  placeholder="Contoh: Lantai 1 - Lobi"
                  required
                  maxLength={150}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving || !nama.trim() || !lokasi.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Menyimpan..."
                    : editingDevice
                      ? "Simpan Perubahan"
                      : "Tambah Perangkat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal pengelolaan konten perangkat */}
      {managingDevice && (
        <DeviceContentManagement
          device={managingDevice}
          contents={contents}
          onClose={() => setManagingDevice(null)}
        />
      )}
    </section>
  );
}
