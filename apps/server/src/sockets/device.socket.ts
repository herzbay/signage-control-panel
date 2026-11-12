import { Server, Socket } from "socket.io";
import supabaseConfig = require("../config/supabase");

const supabase = supabaseConfig.supabaseAdmin;

// Menyimpan daftar koneksi aktif untuk setiap perangkat
const deviceConnections = new Map<string, Set<string>>();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Update device status in Supabase
const updateDeviceStatus = async (
  io: Server,
  deviceId: string,
  status: "online" | "offline"
) => {
  const updates =
    status === "online"
      ? {
          status,
          last_seen: new Date().toISOString(),
        }
      : { status };

  const { data, error } = await supabase
    .from("devices")
    .update(updates)
    .eq("id", deviceId)
    .select("id, status, last_seen")
    .maybeSingle();

  if (error || !data) {
    console.error(
      "Failed to update device status:",
      error?.message || "Device not found"
    );
    return false;
  }

  // Notify all connected clients about status changes
  io.emit("device:status", {
    deviceId: data.id,
    status: data.status,
    last_seen: data.last_seen,
  });

  return true;
};

// Register device socket events
const registerDeviceSocket = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Register device
    socket.on(
      "device:register",
      async (
        payload: { deviceId?: string },
        acknowledge?: (response: {
          success: boolean;
          message: string;
        }) => void
      ) => {
        const deviceId = payload?.deviceId;

        if (!deviceId || !UUID_REGEX.test(deviceId)) {
          acknowledge?.({
            success: false,
            message: "Invalid device ID",
          });
          return;
        }

        if (socket.data.deviceId) {
          acknowledge?.({
            success: false,
            message: "Socket is already registered",
          });
          return;
        }

        try {
          const { data: device, error } = await supabase
            .from("devices")
            .select("id")
            .eq("id", deviceId)
            .maybeSingle();

          if (error || !device) {
            acknowledge?.({
              success: false,
              message: "Device not found",
            });
            return;
          }

          // Add socket to active device connections
          let connections = deviceConnections.get(deviceId);

          if (!connections) {
            connections = new Set<string>();
            deviceConnections.set(deviceId, connections);
          }

          connections.add(socket.id);
          socket.data.deviceId = deviceId;

          // Join device-specific room for future commands
          socket.join(`device:${deviceId}`);

          const updated = await updateDeviceStatus(
            io,
            deviceId,
            "online"
          );

          if (!updated) {
            connections.delete(socket.id);
            socket.data.deviceId = undefined;
            socket.leave(`device:${deviceId}`);

            if (connections.size === 0) {
              deviceConnections.delete(deviceId);
            }

            acknowledge?.({
              success: false,
              message: "Failed to register device",
            });
            return;
          }

          console.log(`Device registered: ${deviceId}`);

          acknowledge?.({
            success: true,
            message: "Device registered successfully",
          });
        } catch (error) {
          console.error("Device registration error:", error);

          acknowledge?.({
            success: false,
            message: "Failed to register device",
          });
        }
      }
    );

    // Device heartbeat
    socket.on(
    "device:heartbeat",
    (
        _payload: Record<string, never>,
        acknowledge?: (response: {
        success: boolean;
        message: string;
        }) => void
    ) => {
        const deviceId = socket.data.deviceId as string | undefined;

        if (!deviceId) {
        acknowledge?.({
            success: false,
            message: "Device is not registered",
        });
        return;
        }

        const processHeartbeat = async () => {
        try {
            const { error } = await supabase
            .from("devices")
            .update({
                status: "online",
                last_seen: new Date().toISOString(),
            })
            .eq("id", deviceId);

            if (error) {
            console.error("Heartbeat error:", error.message);

            acknowledge?.({
                success: false,
                message: "Failed to update heartbeat",
            });
            return;
            }

            acknowledge?.({
            success: true,
            message: "Heartbeat received",
            });
        } catch (error) {
            console.error("Heartbeat error:", error);

            acknowledge?.({
            success: false,
            message: "Failed to process heartbeat",
            });
          }
        };

        void processHeartbeat();
      }
    );

    // Handle device disconnection
    socket.on("disconnect", async (reason) => {
      const deviceId = socket.data.deviceId as string | undefined;

      console.log(`Socket disconnected: ${socket.id} - ${reason}`);

      if (!deviceId) {
        return;
      }

      const connections = deviceConnections.get(deviceId);

      if (!connections) {
        return;
      }

      connections.delete(socket.id);

      // Only mark offline when all device connections are disconnected
      if (connections.size === 0) {
        deviceConnections.delete(deviceId);

        await updateDeviceStatus(io, deviceId, "offline");

        console.log(`Device disconnected: ${deviceId}`);
      }
    });
  });
};

export = { registerDeviceSocket };