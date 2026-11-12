"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Images,
  LogOut,
  Monitor,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";

import {
  getDevices,
  getContents,
  type Admin,
  type Device,
  type Content,
} from "@/lib/api";

import { socket } from "@/lib/socket";
import DeviceManagement from "@/components/device-management";
import ContentManagement from "@/components/content-management";

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

  const loadDashboardData = useCallback(
    async (token: string) => {
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
          err instanceof Error ? err.message : "";

        if (
          message.toLowerCase().includes("token") ||
          message.toLowerCase().includes("unauthorized")
        ) {
          sessionStorage.removeItem("admin_token");
          sessionStorage.removeItem("admin_data");
          router.replace("/login");
          return;
        }

        setError("Gagal memuat data dashboard. Silakan coba kembali.");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

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
          Memeriksa sesi masuk...
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

  const handleRefresh = () => {
    const token = sessionStorage.getItem("admin_token");

    if (token) {
      void loadDashboardData(token);
    }
  };

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
                Panel Pengelolaan Signage
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
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
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        <section className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-500">Ringkasan</p>
            <h2 className="mt-1 text-2xl font-bold text-zinc-900">
              Selamat datang, {admin?.full_name}!
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Pantau perangkat signage dan kelola konten yang ditampilkan.
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Muat Ulang
          </button>
        </section>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Perangkat"
            value={loading ? "..." : devices.length}
            description="Perangkat terdaftar"
            icon={<Monitor size={20} />}
          />

          <StatCard
            title="Perangkat Daring"
            value={loading ? "..." : onlineCount}
            description="Sedang terhubung"
            icon={<Wifi size={20} />}
          />

          <StatCard
            title="Perangkat Luring"
            value={loading ? "..." : offlineCount}
            description="Tidak terhubung"
            icon={<WifiOff size={20} />}
          />

          <StatCard
            title="Total Konten"
            value={loading ? "..." : contents.length}
            description="Konten tersimpan"
            icon={<Images size={20} />}
          />
        </section>

        <DeviceManagement
          devices={devices}
          setDevices={setDevices}
          contents={contents}
          loading={loading}
          onRefresh={handleRefresh}
        />

        <ContentManagement
          contents={contents}
          setContents={setContents}
          loading={loading}
          onRefresh={handleRefresh}
        />
      </main>
    </div>
  );
}

type StatCardProps = {
  title: string;
  value: string | number;
  description: string;
  icon: ReactNode;
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