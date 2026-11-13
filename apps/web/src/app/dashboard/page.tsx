"use client";

import Image from "next/image";
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
import ToastProvider from "@/components/toast-provider";

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
      <main className="flex min-h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-[#17CBB7]" />
          <p className="text-sm font-medium text-white">
            Memeriksa sesi masuk...
          </p>
        </div>
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
    <ToastProvider>
      <div className="min-h-screen bg-[#527279]">
        {/* Top Navbar */}
        <header className="sticky top-0 z-40 border-b border-[#405D63] bg-[#527279] shadow-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              {/* Logo Signage Control Panel */}
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white ring-2 ring-white/70 shadow-md">
                <Image
                  src="/logoscp.png"
                  alt="Logo Signage Control Panel"
                  width={44}
                  height={44}
                  priority
                  className="h-full w-full object-cover"
                />
              </div>

              <div>
                <h1 className="font-bold text-white">
                  Signage Control Panel
                </h1>
                <p className="text-xs text-white/75">
                  Panel Pengelolaan Signage
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-white">
                  {admin?.full_name}
                </p>
                <p className="text-xs text-white/75">
                  {admin?.email}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/20"
              >
                <LogOut size={16} />
                Keluar
              </button>
            </div>
          </div>
        </header>

        {/* Konten Dashboard */}
        <main className="mx-auto max-w-7xl space-y-7 px-4 py-7 sm:px-6 sm:py-8">
          {/* Ringkasan */}
          <section className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">
                Selamat datang, {admin?.full_name}!
              </h2>

              <p className="mt-2 text-sm text-white/75">
                Pantau perangkat signage dan kelola konten yang ditampilkan.
              </p>
            </div>

            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-[#17CBB7] px-4 py-2.5 text-sm font-semibold text-[#24383C] shadow-sm transition hover:bg-[#0DA995] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Muat Ulang
            </button>
          </section>

          {/* Pesan Kesalahan */}
          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-950 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {/* Statistik */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Perangkat"
              value={loading ? "..." : devices.length}
              description="Perangkat terdaftar"
              icon={<Monitor size={21} />}
            />

            <StatCard
              title="Perangkat Daring"
              value={loading ? "..." : onlineCount}
              description="Sedang terhubung"
              icon={<Wifi size={21} />}
            />

            <StatCard
              title="Perangkat Luring"
              value={loading ? "..." : offlineCount}
              description="Tidak terhubung"
              icon={<WifiOff size={21} />}
            />

            <StatCard
              title="Total Konten"
              value={loading ? "..." : contents.length}
              description="Konten tersimpan"
              icon={<Images size={21} />}
            />
          </section>

          {/* Pengelolaan Perangkat */}
          <DeviceManagement
            devices={devices}
            setDevices={setDevices}
            contents={contents}
            loading={loading}
            onRefresh={handleRefresh}
          />

          {/* Pengelolaan Konten */}
          <ContentManagement
            contents={contents}
            setContents={setContents}
            loading={loading}
            onRefresh={handleRefresh}
          />
        </main>
      </div>
    </ToastProvider>
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
    <div className="rounded-xl border border-[#17CBB7] bg-[#17CBB7] p-5 shadow-lg transition hover:-translate-y-1 hover:shadow-xl">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#24383C]">
          {title}
        </p>

        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#527279] text-white">
          {icon}
        </span>
      </div>

      <p className="mt-4 text-3xl font-bold tracking-tight text-[#24383C]">
        {value}
      </p>

      <p className="mt-1 text-xs font-medium text-[#405D63]">
        {description}
      </p>
    </div>
  );
}
