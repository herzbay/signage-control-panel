"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Monitor,
  Images,
  LogOut,
  UserRound,
  Wifi,
} from "lucide-react";
import type { Admin } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();

  const [admin, setAdmin] = useState<Admin | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

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
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem("admin_token");
    sessionStorage.removeItem("admin_data");
    router.replace("/login");
  };

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100">
        <p className="text-sm text-zinc-500">Checking authentication...</p>
      </main>
    );
  }

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
        <section>
          <p className="text-sm text-zinc-500">Overview</p>
          <h2 className="mt-1 text-2xl font-bold text-zinc-900">
            Welcome back, {admin?.full_name}!
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Manage your signage devices and display content from one place.
          </p>
        </section>

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-500">Total Devices</p>
              <Monitor className="text-zinc-400" size={20} />
            </div>
            <p className="mt-4 text-3xl font-bold text-zinc-900">-</p>
            <p className="mt-1 text-xs text-zinc-400">
              Registered devices
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-500">Online Devices</p>
              <Wifi className="text-green-500" size={20} />
            </div>
            <p className="mt-4 text-3xl font-bold text-zinc-900">-</p>
            <p className="mt-1 text-xs text-zinc-400">
              Currently connected
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-500">Offline Devices</p>
              <Monitor className="text-red-400" size={20} />
            </div>
            <p className="mt-4 text-3xl font-bold text-zinc-900">-</p>
            <p className="mt-1 text-xs text-zinc-400">
              Currently disconnected
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-500">Total Contents</p>
              <Images className="text-zinc-400" size={20} />
            </div>
            <p className="mt-4 text-3xl font-bold text-zinc-900">-</p>
            <p className="mt-1 text-xs text-zinc-400">
              Uploaded contents
            </p>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 lg:col-span-2">
            <div className="flex items-center gap-2">
              <LayoutDashboard size={20} className="text-zinc-500" />
              <h3 className="font-semibold text-zinc-900">
                Device Management
              </h3>
            </div>

            <p className="mt-2 text-sm text-zinc-500">
              View, register, update, and monitor your signage devices.
            </p>

            <p className="mt-6 text-sm text-zinc-400">
              Device data integration is coming next.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-6">
            <div className="flex items-center gap-2">
              <UserRound size={20} className="text-zinc-500" />
              <h3 className="font-semibold text-zinc-900">
                Admin Information
              </h3>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <div>
                <p className="text-zinc-400">Full Name</p>
                <p className="mt-1 font-medium text-zinc-800">
                  {admin?.full_name}
                </p>
              </div>

              <div>
                <p className="text-zinc-400">Email</p>
                <p className="mt-1 font-medium text-zinc-800">
                  {admin?.email}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
