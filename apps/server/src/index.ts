import dotenv = require("dotenv");

dotenv.config();

import express = require("express");
import cors = require("cors");
import supabaseConfig = require("./config/supabase");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

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

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});