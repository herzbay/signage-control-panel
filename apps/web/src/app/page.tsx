"use client";

import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";

type DeviceStatusEvent = {
  deviceId: string;
  status: "online" | "offline";
  last_seen: string | null;
};

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<DeviceStatusEvent[]>([]);

  useEffect(() => {
    const handleConnect = () => {
      setConnected(true);
      console.log("Connected to Socket.IO server:", socket.id);
    };

    const handleDisconnect = () => {
      setConnected(false);
      console.log("Disconnected from Socket.IO server");
    };

    const handleDeviceStatus = (data: DeviceStatusEvent) => {
      console.log("Device status received:", data);

      setEvents((previousEvents) => [
        data,
        ...previousEvents,
      ]);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("device:status", handleDeviceStatus);

    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("device:status", handleDeviceStatus);
      socket.disconnect();
    };
  }, []);

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            Signage Control Panel
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Socket.IO Realtime Connection Test
          </p>
        </div>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold">Server Connection</h2>

          <div className="mt-3 flex items-center gap-2">
            <span
              className={`h-3 w-3 rounded-full ${
                connected ? "bg-green-500" : "bg-red-500"
              }`}
            />

            <span className="text-sm">
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Device Status Events</h2>

            <span className="text-sm text-zinc-500">
              {events.length} event(s)
            </span>
          </div>

          {events.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              Waiting for device status events...
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {events.map((event, index) => (
                <div
                  key={`${event.deviceId}-${event.last_seen}-${index}`}
                  className="rounded-lg border border-zinc-200 p-3"
                >
                  <p className="break-all text-sm font-medium">
                    Device ID: {event.deviceId}
                  </p>

                  <p className="mt-1 text-sm">
                    Status:{" "}
                    <span
                      className={
                        event.status === "online"
                          ? "font-semibold text-green-600"
                          : "font-semibold text-red-600"
                      }
                    >
                      {event.status}
                    </span>
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    Last seen:{" "}
                    {event.last_seen
                      ? new Date(event.last_seen).toLocaleString("id-ID")
                      : "-"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
