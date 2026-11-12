"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getDeviceDisplay } from "@/lib/device-api";
import { socket } from "@/lib/socket";
import type {
  DeviceDisplayResponse,
  DisplayContent,
} from "@/lib/device-api";

function DeviceClientContent() {
  const params = useParams<{ id: string }>();
  const deviceId = params.id;

  const [display, setDisplay] = useState<DeviceDisplayResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDisplay() {
      try {
        setLoading(true);
        setError("");

        const result = await getDeviceDisplay(deviceId);

        if (isMounted) {
          setDisplay(result);
          setCurrentIndex(0);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Gagal memuat tampilan perangkat"
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDisplay();

    return () => {
      isMounted = false;
    };
  }, [deviceId]);

  const contents = display?.contents ?? [];
  const currentContent: DisplayContent | undefined =
    contents[currentIndex];

    useEffect(() => {
    if (contents.length <= 1 || currentContent?.tipe === "video") {
        return;
    }

    const interval = setInterval(() => {
        setCurrentIndex((previousIndex) =>
        (previousIndex + 1) % contents.length
        );
    }, 10000);

    return () => clearInterval(interval);
    }, [contents.length, currentContent?.tipe]);

    useEffect(() => {
    // Mendaftarkan perangkat ke Socket.IO
    const registerDevice = () => {
        socket.emit(
        "device:register",
        { deviceId },
        (response: { success: boolean; message: string }) => {
            if (response.success) {
            console.log("Perangkat berhasil terhubung ke server realtime");
            } else {
            console.error(
                "Pendaftaran perangkat gagal:",
                response.message
            );
            }
        }
        );
    };

    // Mengambil ulang playlist ketika ada perubahan
    const handlePlaylistUpdated = async (payload: {
        deviceId: string;
    }) => {
        if (payload.deviceId !== deviceId) {
        return;
        }

        console.log("Perubahan playlist diterima");

        try {
        const result = await getDeviceDisplay(deviceId);

        setDisplay(result);
        setCurrentIndex(0);

        console.log("Playlist berhasil diperbarui");
        } catch (error) {
        console.error("Gagal memperbarui playlist:", error);
        }
    };

    // Daftarkan event sebelum menghubungkan socket
    socket.on("connect", registerDevice);
    socket.on("device:playlist:updated", handlePlaylistUpdated);

    // Hubungkan socket
    if (!socket.connected) {
        socket.connect();
    } else {
        registerDevice();
    }

    return () => {
        socket.off("connect", registerDevice);
        socket.off("device:playlist:updated", handlePlaylistUpdated);
        socket.disconnect();
    };
    }, [deviceId]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-lg">Memuat tampilan perangkat...</p>
      </main>
    );
  }

  if (error || !display) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
        <h1 className="text-2xl font-semibold">
          Tampilan Tidak Tersedia
        </h1>

        <p className="max-w-md text-sm text-gray-400">
          {error || "Data perangkat tidak dapat ditemukan."}
        </p>

        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-gray-200"
        >
          Coba Lagi
        </button>
      </main>
    );
  }

  if (contents.length === 0 || !currentContent) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-black px-6 text-center text-white">
        <h1 className="text-2xl font-semibold">
          {display.device.nama}
        </h1>

        <p className="text-gray-400">
          Belum ada konten aktif untuk ditampilkan.
        </p>

        <p className="text-sm text-gray-500">
          {display.device.lokasi}
        </p>
      </main>
    );
  }

  function renderContent(content: DisplayContent) {
    switch (content.tipe) {
      case "image":
        return content.url ? (
          <img
            src={content.url}
            alt={content.judul}
            className="h-full w-full object-contain"
          />
        ) : (
          <p className="text-white">Gambar tidak tersedia.</p>
        );

      case "video":
        return content.url ? (
            <video
            key={content.id}
            src={content.url}
            autoPlay
            muted
            loop={contents.length === 1}
            playsInline
            onEnded={() => {
                setCurrentIndex(
                (previousIndex) => (previousIndex + 1) % contents.length
                );
            }}
            className="h-full w-full object-contain"
            />
        ) : (
            <p className="text-white">Video tidak tersedia.</p>
      );

      case "text":
        return (
          <div className="flex h-full w-full items-center justify-center px-8 py-12">
            <p className="max-w-5xl whitespace-pre-wrap text-center text-3xl font-semibold leading-relaxed text-white md:text-5xl">
              {content.payload?.text || content.judul}
            </p>
          </div>
        );

      default:
        return (
          <p className="text-white">Jenis konten tidak dikenali.</p>
        );
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-black">
      <header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-6 py-5 text-white">
        <div>
          <h1 className="text-lg font-semibold">
            {display.device.nama}
          </h1>
          <p className="text-sm text-gray-300">
            {display.device.lokasi}
          </p>
        </div>

        <span className="text-sm text-gray-300">
          {currentIndex + 1} / {contents.length}
        </span>
      </header>

      <section className="flex min-h-screen flex-1 items-center justify-center">
        {renderContent(currentContent)}
      </section>

      <footer className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-6 py-5 text-sm text-gray-300">
        <span>{currentContent.judul}</span>
        <span>Signage Control Panel</span>
      </footer>
    </main>
  );
}

export default function DeviceClientPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-black text-white">
          <p className="text-lg">Memuat tampilan perangkat...</p>
        </main>
      }
    >
      <DeviceClientContent />
    </Suspense>
  );
}