import dotenv = require("dotenv");

dotenv.config();

import express = require("express");
import cors = require("cors");
import http = require("http");
import { Server } from "socket.io";

import supabaseConfig = require("./config/supabase");
import deviceRoutes = require("./routes/device.routes");
import contentRoutes = require("./routes/content.routes");
import authRoutes = require("./routes/auth.routes");
import deviceSocket = require("./sockets/device.socket");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/contents", contentRoutes);

// API health check
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Signage Control Panel API is running",
    timestamp: new Date().toISOString(),
  });
});

// Database health check
app.get("/api/health/db", async (_req, res) => {
  const { error } = await supabaseConfig.supabaseAdmin
    .from("devices")
    .select("id")
    .limit(1);

  if (error) {
    console.error("Supabase connection error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Supabase connection failed",
      error: error.message,
    });
  }

  return res.status(200).json({
    success: true,
    message: "Supabase PostgreSQL connection successful",
  });
});

// Create HTTP server
const httpServer = http.createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.WEB_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

deviceSocket.registerDeviceSocket(io);

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log("Socket.IO server is ready");
});
