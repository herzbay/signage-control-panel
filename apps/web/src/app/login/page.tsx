"use client";

import { useState } from "react";
import type { ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail, MonitorPlay } from "lucide-react";
import { loginAdmin } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin: NonNullable<ComponentProps<"form">["onSubmit"]> = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const result = await loginAdmin(email, password);

      sessionStorage.setItem("admin_token", result.data.token);
      sessionStorage.setItem(
        "admin_data",
        JSON.stringify(result.data.admin)
      );

      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan yang tidak terduga."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F2F6F6] px-4 py-3">
      {/* Dekorasi latar */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#17CBB7]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-[#527279]/15 blur-3xl" />

      <div className="relative w-full max-w-sm">
        {/* Kartu login */}
        <div className="overflow-hidden rounded-3xl border border-[#DCE7E7] bg-white shadow-[0_20px_60px_rgba(52,82,87,0.10)]">
          {/* Bagian atas */}
          <div className="relative overflow-hidden bg-[#527279] px-6 pb-5 pt-6 text-center">
            <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full border-[24px] border-white/5" />
            <div className="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full border-[24px] border-[#17CBB7]/10" />

            <div className="relative mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-lg backdrop-blur-sm">
              <MonitorPlay size={32} className="text-[#17CBB7]" />
            </div>

            <h1 className="relative text-xl font-bold tracking-tight text-white">
              Signage Control Panel
            </h1>

            <p className="relative mt-2 text-sm text-white/75">
              Sistem Pengelolaan Digital Signage
            </p>

            <div className="relative mx-auto mt-5 h-1 w-12 rounded-full bg-[#17CBB7]" />
          </div>

          {/* Formulir */}
          <div className="px-6 py-5">
            <div className="mb-7">
              <p className="mt-1.5 text-sm leading-relaxed text-[#718489]">
                Masuk menggunakan akun administrator untuk mengelola perangkat dan konten.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-[#405D63]"
                >
                  Alamat Email
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#82979A]"
                  />

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@signage.local"
                    required
                    autoComplete="username"
                    className="w-full rounded-xl border border-[#D8E3E4] bg-[#FAFCFC] py-3.5 pl-11 pr-4 text-sm text-[#344F55] outline-none transition placeholder:text-[#91A2A5] hover:border-[#A8BDBF] focus:border-[#17CBB7] focus:bg-white focus:ring-4 focus:ring-[#17CBB7]/10"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-[#405D63]"
                >
                  Kata Sandi
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#82979A]"
                  />

                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Masukkan kata sandi"
                    required
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-[#D8E3E4] bg-[#FAFCFC] py-3.5 pl-11 pr-4 text-sm text-[#344F55] outline-none transition placeholder:text-[#91A2A5] hover:border-[#A8BDBF] focus:border-[#17CBB7] focus:bg-white focus:ring-4 focus:ring-[#17CBB7]/10"
                  />
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#17CBB7] px-4 py-3.5 text-sm font-bold text-[#183D3D] shadow-md shadow-[#17CBB7]/20 transition hover:bg-[#12B6A4] hover:shadow-lg hover:shadow-[#17CBB7]/25 focus:outline-none focus:ring-4 focus:ring-[#17CBB7]/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sedang Masuk..." : "Masuk ke Dashboard"}
              </button>
            </form>
          </div>
        </div>

        <p className="mt-6 text-center text-xs font-medium text-[#829397]">
          Signage Control Panel &copy; 2026
        </p>
      </div>
    </main>
  );
}
