import express = require("express");
import zod = require("zod");
import supabaseConfig = require("../config/supabase");

const { z } = zod;
const supabase = supabaseConfig.supabaseAdmin;

// Validation schemas
const createDeviceSchema = z.object({
  nama: z.string().trim().min(1).max(150),
  lokasi: z.string().trim().min(1).max(255),
  status: z.enum(["online", "offline"]).optional(),
});

const updateDeviceSchema = createDeviceSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided" }
);

// GET /api/devices
const getDevices: express.RequestHandler = async (_req, res) => {
  const { data, error } = await supabase
    .from("devices")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Get devices error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve devices",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data,
  });
};

// GET /api/devices/:id
const getDeviceById: express.RequestHandler = async (req, res) => {
  const idSchema = z.string().uuid();
  const idResult = idSchema.safeParse(req.params.id);

  if (!idResult.success) {
    res.status(400).json({
      success: false,
      message: "Invalid device ID",
    });
    return;
  }

  const { data, error } = await supabase
    .from("devices")
    .select("*")
    .eq("id", idResult.data)
    .maybeSingle();

  if (error) {
    console.error("Get device error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve device",
    });
    return;
  }

  if (!data) {
    res.status(404).json({
      success: false,
      message: "Device not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data,
  });
};

// POST /api/devices
const createDevice: express.RequestHandler = async (req, res) => {
  const validation = createDeviceSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid device data",
      errors: validation.error.issues,
    });
    return;
  }

  const { data, error } = await supabase
    .from("devices")
    .insert(validation.data)
    .select()
    .single();

  if (error) {
    console.error("Create device error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to create device",
    });
    return;
  }

  res.status(201).json({
    success: true,
    message: "Device created successfully",
    data,
  });
};

// PUT /api/devices/:id
const updateDevice: express.RequestHandler = async (req, res) => {
  const idResult = z.string().uuid().safeParse(req.params.id);
  const validation = updateDeviceSchema.safeParse(req.body);

  if (!idResult.success) {
    res.status(400).json({
      success: false,
      message: "Invalid device ID",
    });
    return;
  }

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid device data",
      errors: validation.error.issues,
    });
    return;
  }

  const { data, error } = await supabase
    .from("devices")
    .update(validation.data)
    .eq("id", idResult.data)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Update device error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update device",
    });
    return;
  }

  if (!data) {
    res.status(404).json({
      success: false,
      message: "Device not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Device updated successfully",
    data,
  });
};

// DELETE /api/devices/:id
const deleteDevice: express.RequestHandler = async (req, res) => {
  const idResult = z.string().uuid().safeParse(req.params.id);

  if (!idResult.success) {
    res.status(400).json({
      success: false,
      message: "Invalid device ID",
    });
    return;
  }

  const { data, error } = await supabase
    .from("devices")
    .delete()
    .eq("id", idResult.data)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Delete device error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete device",
    });
    return;
  }

  if (!data) {
    res.status(404).json({
      success: false,
      message: "Device not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Device deleted successfully",
  });
};

export = {
  getDevices,
  getDeviceById,
  createDevice,
  updateDevice,
  deleteDevice,
};