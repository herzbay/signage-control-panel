import express = require("express");
import zod = require("zod");
import supabaseConfig = require("../config/supabase");

const { z } = zod;
const supabase = supabaseConfig.supabaseAdmin;

const deviceIdSchema = z.string().uuid();

const contentIdSchema = z.string().uuid();

const assignContentSchema = z.object({
  content_id: contentIdSchema,
  position: z.number().int().min(1).optional(),
  is_active: z.boolean().optional(),
});

const updateAssignmentSchema = z.object({
  position: z.number().int().min(1).optional(),
  is_active: z.boolean().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided" }
);

// GET /api/devices/:id/contents
const getDeviceContents: express.RequestHandler = async (req, res) => {
  const deviceValidation = deviceIdSchema.safeParse(req.params.id);

  if (!deviceValidation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid device ID",
    });
    return;
  }

  const deviceId = deviceValidation.data;

  const { data: device, error: deviceError } = await supabase
    .from("devices")
    .select("id")
    .eq("id", deviceId)
    .maybeSingle();

  if (deviceError) {
    console.error("Check device error:", deviceError.message);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve device",
    });
    return;
  }

  if (!device) {
    res.status(404).json({
      success: false,
      message: "Device not found",
    });
    return;
  }

  const { data, error } = await supabase
    .from("device_contents")
    .select(`
      device_id,
      content_id,
      position,
      is_active,
      assigned_at,
      updated_at,
      contents (
        id,
        judul,
        tipe,
        url,
        storage_path,
        payload,
        created_at
      )
    `)
    .eq("device_id", deviceId)
    .order("position", { ascending: true });

  if (error) {
    console.error("Get device contents error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve device contents",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data,
  });
};

// POST /api/devices/:id/contents
const assignContent: express.RequestHandler = async (req, res) => {
  const deviceValidation = deviceIdSchema.safeParse(req.params.id);
  const validation = assignContentSchema.safeParse(req.body);

  if (!deviceValidation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid device ID",
    });
    return;
  }

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid assignment data",
      errors: validation.error.issues,
    });
    return;
  }

  const deviceId = deviceValidation.data;
  const { content_id, position, is_active } = validation.data;

  const { data: device, error: deviceError } = await supabase
    .from("devices")
    .select("id")
    .eq("id", deviceId)
    .maybeSingle();

  if (deviceError) {
    console.error("Check device error:", deviceError.message);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve device",
    });
    return;
  }

  if (!device) {
    res.status(404).json({
      success: false,
      message: "Device not found",
    });
    return;
  }

  const { data: content, error: contentError } = await supabase
    .from("contents")
    .select("id")
    .eq("id", content_id)
    .maybeSingle();

  if (contentError) {
    console.error("Check content error:", contentError.message);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve content",
    });
    return;
  }

  if (!content) {
    res.status(404).json({
      success: false,
      message: "Content not found",
    });
    return;
  }

  const { data: existing, error: existingError } = await supabase
    .from("device_contents")
    .select("device_id, content_id")
    .eq("device_id", deviceId)
    .eq("content_id", content_id)
    .maybeSingle();

  if (existingError) {
    console.error("Check assignment error:", existingError.message);
    res.status(500).json({
      success: false,
      message: "Failed to check content assignment",
    });
    return;
  }

  if (existing) {
    res.status(409).json({
      success: false,
      message: "Content is already assigned to this device",
    });
    return;
  }

  let assignedPosition = position;

  if (assignedPosition === undefined) {
    const { data: lastAssignment, error: positionError } = await supabase
      .from("device_contents")
      .select("position")
      .eq("device_id", deviceId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (positionError) {
      console.error("Get last position error:", positionError.message);
      res.status(500).json({
        success: false,
        message: "Failed to determine content position",
      });
      return;
    }

    assignedPosition = (lastAssignment?.position ?? 0) + 1;
  }

  const { data, error } = await supabase
    .from("device_contents")
    .insert({
      device_id: deviceId,
      content_id,
      position: assignedPosition,
      is_active: is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    console.error("Assign content error:", error.message);

    if (error.code === "23505") {
      res.status(409).json({
        success: false,
        message: "Content is already assigned to this device",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Failed to assign content",
    });
    return;
  }

  res.status(201).json({
    success: true,
    message: "Content assigned successfully",
    data,
  });
};

// PUT /api/devices/:id/contents/:contentId
const updateAssignment: express.RequestHandler = async (req, res) => {
  const deviceValidation = deviceIdSchema.safeParse(req.params.id);
  const contentValidation = contentIdSchema.safeParse(req.params.contentId);
  const validation = updateAssignmentSchema.safeParse(req.body);

  if (!deviceValidation.success || !contentValidation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid device or content ID",
    });
    return;
  }

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid assignment data",
      errors: validation.error.issues,
    });
    return;
  }

  const { data, error } = await supabase
    .from("device_contents")
    .update(validation.data)
    .eq("device_id", deviceValidation.data)
    .eq("content_id", contentValidation.data)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Update assignment error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update content assignment",
    });
    return;
  }

  if (!data) {
    res.status(404).json({
      success: false,
      message: "Content assignment not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Content assignment updated successfully",
    data,
  });
};

// DELETE /api/devices/:id/contents/:contentId
const removeAssignment: express.RequestHandler = async (req, res) => {
  const deviceValidation = deviceIdSchema.safeParse(req.params.id);
  const contentValidation = contentIdSchema.safeParse(req.params.contentId);

  if (!deviceValidation.success || !contentValidation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid device or content ID",
    });
    return;
  }

  const { data, error } = await supabase
    .from("device_contents")
    .delete()
    .eq("device_id", deviceValidation.data)
    .eq("content_id", contentValidation.data)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Remove assignment error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to remove content assignment",
    });
    return;
  }

  if (!data) {
    res.status(404).json({
      success: false,
      message: "Content assignment not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Content assignment removed successfully",
  });
};

// GET /api/devices/:id/display
const getDeviceDisplay: express.RequestHandler = async (req, res) => {
  const validation = deviceIdSchema.safeParse(req.params.id);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid device ID",
    });
    return;
  }

  const deviceId = validation.data;

  // Ambil informasi perangkat
  const { data: device, error: deviceError } = await supabase
    .from("devices")
    .select("id, nama, lokasi, status")
    .eq("id", deviceId)
    .maybeSingle();

  if (deviceError) {
    console.error("Get display device error:", deviceError.message);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve device",
    });
    return;
  }

  if (!device) {
    res.status(404).json({
      success: false,
      message: "Device not found",
    });
    return;
  }

  // Ambil konten aktif berdasarkan urutan penayangan
  const { data: assignments, error: assignmentError } = await supabase
    .from("device_contents")
    .select(`
      position,
      contents (
        id,
        judul,
        tipe,
        url,
        storage_path,
        payload
      )
    `)
    .eq("device_id", deviceId)
    .eq("is_active", true)
    .order("position", { ascending: true });

  if (assignmentError) {
    console.error("Get display contents error:", assignmentError.message);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve display contents",
    });
    return;
  }

  // Siapkan URL konten agar dapat ditampilkan oleh perangkat
  const displayContents = await Promise.all(
    (assignments ?? []).map(async (assignment) => {
    const content = Array.isArray(assignment.contents)
        ? assignment.contents[0]
        : assignment.contents;

    if (!content) {
        return null;
    }

      let contentUrl = content.url;

      if (content.storage_path) {
        const { data, error } = await supabase.storage
          .from("signage-content")
          .createSignedUrl(content.storage_path, 3600);

        if (error || !data) {
          console.error("Create display URL error:", error?.message);
          return null;
        }

        contentUrl = data.signedUrl;
      }

      return {
        id: content.id,
        judul: content.judul,
        tipe: content.tipe,
        url: contentUrl,
        payload: content.payload,
        position: assignment.position,
      };
    })
  );

  res.status(200).json({
    success: true,
    data: {
      device,
      contents: displayContents.filter(Boolean),
    },
  });
};

export = {
  getDeviceContents,
  assignContent,
  updateAssignment,
  removeAssignment,
  getDeviceDisplay,
};