import express = require("express");
import zod = require("zod");
import supabaseConfig = require("../config/supabase");

const { z } = zod;
const supabase = supabaseConfig.supabaseAdmin;

// Validation schemas
const createContentSchema = z.object({
  judul: z.string().trim().min(1).max(200),
  tipe: z.enum(["image", "video", "text"]),
  url: z.string().url().optional(),
  storage_path: z.string().trim().min(1).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
}).superRefine((data, ctx) => {
  if (data.tipe === "text" && !data.payload) {
    ctx.addIssue({
      code: "custom",
      message: "Payload is required for text content",
      path: ["payload"],
    });
  }

  if (
    (data.tipe === "image" || data.tipe === "video") &&
    !data.url &&
    !data.storage_path
  ) {
    ctx.addIssue({
      code: "custom",
      message: "URL or storage_path is required for image/video content",
      path: ["url"],
    });
  }
});

const updateContentSchema = z.object({
  judul: z.string().trim().min(1).max(200).optional(),
  tipe: z.enum(["image", "video", "text"]).optional(),
  url: z.string().url().nullable().optional(),
  storage_path: z.string().trim().min(1).nullable().optional(),
  payload: z.record(z.string(), z.unknown()).nullable().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided" }
);

// GET /api/contents
const getContents: express.RequestHandler = async (_req, res) => {
  const { data, error } = await supabase
    .from("contents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Get contents error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve contents",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data,
  });
};

// GET /api/contents/:id
const getContentById: express.RequestHandler = async (req, res) => {
  const idResult = z.string().uuid().safeParse(req.params.id);

  if (!idResult.success) {
    res.status(400).json({
      success: false,
      message: "Invalid content ID",
    });
    return;
  }

  const { data, error } = await supabase
    .from("contents")
    .select("*")
    .eq("id", idResult.data)
    .maybeSingle();

  if (error) {
    console.error("Get content error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve content",
    });
    return;
  }

  if (!data) {
    res.status(404).json({
      success: false,
      message: "Content not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data,
  });
};

// POST /api/contents
const createContent: express.RequestHandler = async (req, res) => {
  const validation = createContentSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid content data",
      errors: validation.error.issues,
    });
    return;
  }

  const { data, error } = await supabase
    .from("contents")
    .insert(validation.data)
    .select()
    .single();

  if (error) {
    console.error("Create content error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to create content",
    });
    return;
  }

  res.status(201).json({
    success: true,
    message: "Content created successfully",
    data,
  });
};

// PUT /api/contents/:id
const updateContent: express.RequestHandler = async (req, res) => {
  const idResult = z.string().uuid().safeParse(req.params.id);
  const validation = updateContentSchema.safeParse(req.body);

  if (!idResult.success) {
    res.status(400).json({
      success: false,
      message: "Invalid content ID",
    });
    return;
  }

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid content data",
      errors: validation.error.issues,
    });
    return;
  }

  const { data, error } = await supabase
    .from("contents")
    .update(validation.data)
    .eq("id", idResult.data)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Update content error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update content",
    });
    return;
  }

  if (!data) {
    res.status(404).json({
      success: false,
      message: "Content not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Content updated successfully",
    data,
  });
};

// DELETE /api/contents/:id
const deleteContent: express.RequestHandler = async (req, res) => {
  const idResult = z.string().uuid().safeParse(req.params.id);

  if (!idResult.success) {
    res.status(400).json({
      success: false,
      message: "Invalid content ID",
    });
    return;
  }

  const { data, error } = await supabase
    .from("contents")
    .delete()
    .eq("id", idResult.data)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Delete content error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete content",
    });
    return;
  }

  if (!data) {
    res.status(404).json({
      success: false,
      message: "Content not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Content deleted successfully",
  });
};

export = {
  getContents,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
};
