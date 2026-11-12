"use client";

import { FormEvent, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Monitor,
  X,
  RefreshCw,
} from "lucide-react";

import {
  createDevice,
  updateDevice,
  deleteDevice,
  type Device,
} from "@/lib/api";

type DeviceManagementProps = {
  devices: Device[];
  setDevices: React.Dispatch<React.SetStateAction<Device[]>>;
  loading: boolean;
  onRefresh: () => void;
};

export default function DeviceManagement({
  devices,
  setDevices,
  loading,
  onRefresh,
}: DeviceManagementProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const token = sessionStorage.getItem("admin_token");

    if (!token) {
      setError("Session expired. Please log in again.");
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
            device.id === updatedDevice.id
              ? updatedDevice
              : device
          )
        );
      } else {
        const newDevice = await createDevice(token, formData);

        setDevices((previous) => [newDevice, ...previous]);
      }

      setModalOpen(false);
      setEditingDevice(null);
      setNama("");
      setLokasi("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save device"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (device: Device) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${device.nama}"?`
    );

    if (!confirmed) return;

    const token = sessionStorage.getItem("admin_token");

    if (!token) {
      setError("Session expired. Please log in again.");
      return;
    }

    setDeletingId(device.id);
    setError("");

    try {
      await deleteDevice(token, device.id);

      setDevices((previous) =>
        previous.filter((item) => item.id !== device.id)
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete device"
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-6 py-5">
        <div>
          <h3 className="font-semibold text-zinc-900">
            Device Management
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            Manage and monitor your signage devices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            title="Refresh devices"
            className="rounded-lg border border-zinc-200 p-2.5 text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700"
          >
            <Plus size={17} />
            Add Device
          </button>
        </div>
      </div>

      {error && !modalOpen && (
        <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="px-6 py-10 text-center text-sm text-zinc-500">
          Loading devices...
        </div>
      ) : devices.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <Monitor className="mx-auto text-zinc-300" size={34} />
          <p className="mt-3 text-sm font-medium text-zinc-700">
            No devices found
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Add your first signage device to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-6 py-4 font-medium">Device</th>
                <th className="px-6 py-4 font-medium">Location</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Last Seen</th>
                <th className="px-6 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100">
              {devices.map((device) => (
                <tr key={device.id} className="hover:bg-zinc-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-zinc-900">
                      {device.nama}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {device.id}
                    </p>
                  </td>

                  <td className="px-6 py-4 text-zinc-600">
                    {device.lokasi}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                        device.status === "online"
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          device.status === "online"
                            ? "bg-green-500"
                            : "bg-red-500"
                        }`}
                      />
                      {device.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-zinc-500">
                    {device.last_seen
                      ? new Date(device.last_seen).toLocaleString("id-ID")
                      : "Never connected"}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(device)}
                        title="Edit device"
                        className="rounded-lg border border-zinc-200 p-2 text-zinc-600 transition hover:bg-zinc-100"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => handleDelete(device)}
                        disabled={deletingId === device.id}
                        title="Delete device"
                        className="rounded-lg border border-red-100 p-2 text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === device.id ? (
                          <RefreshCw size={16} className="animate-spin" />
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">
                  {editingDevice ? "Edit Device" : "Add New Device"}
                </h3>
                <p className="mt-1 text-sm text-zinc-500">
                  {editingDevice
                    ? "Update device information."
                    : "Register a new signage device."}
                </p>
              </div>

              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="device-name"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Device Name
                </label>

                <input
                  id="device-name"
                  type="text"
                  value={nama}
                  onChange={(event) => setNama(event.target.value)}
                  placeholder="e.g. Smart TV Lobby"
                  required
                  maxLength={100}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>

              <div>
                <label
                  htmlFor="device-location"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Location
                </label>

                <input
                  id="device-location"
                  type="text"
                  value={lokasi}
                  onChange={(event) => setLokasi(event.target.value)}
                  placeholder="e.g. Floor 1 - Lobby"
                  required
                  maxLength={150}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || !nama.trim() || !lokasi.trim()}
                  className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingDevice
                      ? "Save Changes"
                      : "Create Device"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
