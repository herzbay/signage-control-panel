"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Images,
  LogOut,
  Monitor,
  Wifi,
  WifiOff,
  RefreshCw,
  LayoutDashboard,
  UserRound,
} from "lucide-react";

import {
  getDevices,
  getContents,
  type Admin,
  type Device,
  type Content,
} from "@/lib/api";

import { socket } from "@/lib/socket";

export default function DashboardPage() {
  const router = useRouter();

  const [admin, setAdmin] = useState<Admin | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const handleLogout = () => {
    socket.disconnect();
    sessionStorage.removeItem("admin_token");
    sessionStorage.removeItem("admin_data");
    router.replace("/login");
  };

  const loadDashboardData = useCallback(async (token: string) => {
    setLoading(true);
    setError("");

    try {
      const [deviceData, contentData] = await Promise.all([
        getDevices(token),
        getContents(token),
      ]);

      setDevices(deviceData);
      setContents(contentData);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load dashboard data";

      if (message.toLowerCase().includes("token") ||
          message.toLowerCase().includes("unauthorized")) {
        sessionStorage.removeItem("admin_token");
        sessionStorage.removeItem("admin_data");
        router.replace("/login");
        return;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = sessionStorage.getItem("admin_token");
    const adminData = sessionStorage.getItem("admin_data");

    if (!token || !adminData) {
      router.replace("/login");
      return;
    }

    try {
      setAdmin(JSON.parse(adminData) as Admin);
    } catch {
      sessionStorage.removeItem("admin_token");
      sessionStorage.removeItem("admin_data");
      router.replace("/login");
      return;
    }

    setCheckingAuth(false);
    void loadDashboardData(token);
  }, [loadDashboardData, router]);

  useEffect(() => {
    const handleDeviceStatus = (event: {
      deviceId: string;
      status: "online" | "offline";
      last_seen: string | null;
    }) => {
      setDevices((previousDevices) =>
        previousDevices.map((device) =>
          device.id === event.deviceId
            ? {
                ...device,
                status: event.status,
                last_seen: event.last_seen,
              }
            : device
        )
      );
    };

    socket.on("device:status", handleDeviceStatus);
    socket.connect();

    return () => {
      socket.off("device:status", handleDeviceStatus);
      socket.disconnect();
    };
  }, []);

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100">
        <p className="text-sm text-zinc-500">
          Checking authentication...
        </p>
      </main>
    );
  }

  const onlineCount = devices.filter(
    (device) => device.status === "online"
  ).length;

  const offlineCount = devices.filter(
    (device) => device.status === "offline"
  ).length;

  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-lg font-bold text-white">
              S
            </div>

            <div>
              <h1 className="font-bold text-zinc-900">
                Signage Control Panel
              </h1>
              <p className="text-xs text-zinc-500">
                Administration Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-zinc-900">
                {admin?.full_name}
              </p>
              <p className="text-xs text-zinc-500">
                {admin?.email}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        <section className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-500">Overview</p>
            <h2 className="mt-1 text-2xl font-bold text-zinc-900">
              Welcome back, {admin?.full_name}!
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Monitor your signage devices and manage display content.
            </p>
          </div>

          <button
            onClick={() => {
              const token = sessionStorage.getItem("admin_token");
              if (token) void loadDashboardData(token);
            }}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </section>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Devices"
            value={loading ? "..." : devices.length}
            description="Registered devices"
            icon={<Monitor size={20} />}
          />

          <StatCard
            title="Online Devices"
            value={loading ? "..." : onlineCount}
            description="Currently connected"
            icon={<Wifi size={20} />}
          />

          <StatCard
            title="Offline Devices"
            value={loading ? "..." : offlineCount}
            description="Currently disconnected"
            icon={<WifiOff size={20} />}
          />

          <StatCard
            title="Total Contents"
            value={loading ? "..." : contents.length}
            description="Uploaded contents"
            icon={<Images size={20} />}
          />
        </section>

        <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-6 py-5">
            <div>
              <div className="flex items-center gap-2">
                <LayoutDashboard size={19} className="text-zinc-500" />
                <h3 className="font-semibold text-zinc-900">
                  Device Management
                </h3>
              </div>
              <p className="mt-1 text-sm text-zinc-500">
                Monitor registered signage devices and their connection status.
              </p>
            </div>

            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
              {devices.length} devices
            </span>
          </div>

          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-zinc-500">
              Loading devices...
            </div>
          ) : devices.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <Monitor className="mx-auto text-zinc-300" size={32} />
              <p className="mt-3 text-sm font-medium text-zinc-700">
                No devices found
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Registered devices will appear here.
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <UserRound size={19} className="text-zinc-500" />
            <h3 className="font-semibold text-zinc-900">
              Admin Information
            </h3>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-zinc-400">Full Name</p>
              <p className="mt-1 text-sm font-medium text-zinc-800">
                {admin?.full_name}
              </p>
            </div>

            <div>
              <p className="text-xs text-zinc-400">Email</p>
              <p className="mt-1 text-sm font-medium text-zinc-800">
                {admin?.email}
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

type StatCardProps = {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
};

function StatCard({
  title,
  value,
  description,
  icon,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{title}</p>
        <span className="text-zinc-400">{icon}</span>
      </div>

      <p className="mt-4 text-3xl font-bold text-zinc-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-zinc-400">
        {description}
      </p>
    </div>
  );
}