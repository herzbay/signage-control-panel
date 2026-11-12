import express = require("express");
import zod = require("zod");
import supabaseConfig = require("../config/supabase");
import storageService = require("../services/storage.service");

const { z } = zod;
const supabase = supabaseConfig.supabaseAdmin;

// Mengambil daftar perangkat yang menggunakan suatu konten.
const getAssignedDeviceIds = async (
  contentId: string
): Promise<string[]> => {
  const { data, error } = await supabase
    .from("device_contents")
    .select("device_id")
    .eq("content_id", contentId);

  if (error) {
    throw new Error(error.message);
  }

  return [
    ...new Set((data ?? []).map((item) => item.device_id)),
  ];
};

// Mengirim pemberitahuan perubahan playlist ke perangkat terkait.
const notifyDevices = (
  req: express.Request,
  deviceIds: string[]
) => {
  const io = req.app.get("io");

  if (!io) {
    console.warn("Socket.IO instance is not available");
    return;
  }

  for (const deviceId of deviceIds) {
    io.to(`device:${deviceId}`).emit("device:playlist:updated", {
      deviceId,
    });
  }
};

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

  // Beri tahu perangkat yang menggunakan konten ini.
  try {
    const deviceIds = await getAssignedDeviceIds(idResult.data);
    notifyDevices(req, deviceIds);
  } catch (error) {
    console.error("Notify updated content error:", error);
  }

  res.status(200).json({
    success: true,
    message: "Content updated successfully",
    data,
  });
};

 // POST /api/contents/upload
const uploadContent: express.RequestHandler = async (req, res) => {
  const file = (req as express.Request & {
    file?: Express.Multer.File;
  }).file;

  if (!file) {
    res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
    return;
  }

  const titleSchema = z.object({
    judul: z.string().trim().min(1).max(200),
  });

  const validation = titleSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid content title",
      errors: validation.error.issues,
    });
    return;
  }

  const tipe = file.mimetype.startsWith("image/")
    ? "image"
    : "video";

  let storagePath: string | null = null;

  try {
    // Upload file to Supabase Storage
    const uploadedFile = await storageService.uploadFile(file);
    storagePath = uploadedFile.storagePath;

    // Save metadata to database
    const { data, error } = await supabase
      .from("contents")
      .insert({
        judul: validation.data.judul,
        tipe,
        storage_path: storagePath,
      })
      .select()
      .single();

    if (error) {
      console.error("Create content metadata error:", error.message);

      // Remove uploaded file if database insertion fails
      await storageService.deleteFile(storagePath);
      storagePath = null;

      res.status(500).json({
        success: false,
        message: "Failed to save content metadata",
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: "Content uploaded successfully",
      data: {
        ...data,
        file_size: uploadedFile.size,
        mime_type: uploadedFile.mimeType,
      },
    });
  } catch (error) {
    console.error("Upload content error:", error);

    // Attempt cleanup if upload succeeded but a later step failed
    if (storagePath) {
      try {
        await storageService.deleteFile(storagePath);
      } catch (cleanupError) {
        console.error("Storage cleanup error:", cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: "Failed to upload content",
    });
  }
};

 // GET /api/contents/:id/url
const getContentUrl: express.RequestHandler = async (req, res) => {
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
    .select("id, judul, tipe, storage_path")
    .eq("id", idResult.data)
    .maybeSingle();

  if (error) {
    console.error("Get content URL error:", error.message);
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

  if (!data.storage_path) {
    res.status(400).json({
      success: false,
      message: "Content does not have a storage file",
    });
    return;
  }

  try {
    const signedUrl = await storageService.createSignedUrl(
      data.storage_path
    );

    res.status(200).json({
      success: true,
      data: {
        id: data.id,
        judul: data.judul,
        tipe: data.tipe,
        url: signedUrl,
        expires_in: 3600,
      },
    });
  } catch (error) {
    console.error("Generate signed URL error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate content URL",
    });
  }
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

  try {
    // Ambil data konten sebelum dihapus.
    const { data: content, error: findError } = await supabase
      .from("contents")
      .select("id, storage_path")
      .eq("id", idResult.data)
      .maybeSingle();

    if (findError) {
      console.error("Find content error:", findError.message);
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

    // Ambil perangkat yang menggunakan konten ini.
    const deviceIds = await getAssignedDeviceIds(idResult.data);

    // Hapus hubungan konten dengan perangkat.
    const { error: assignmentError } = await supabase
      .from("device_contents")
      .delete()
      .eq("content_id", idResult.data);

    if (assignmentError) {
      console.error(
        "Delete content assignments error:",
        assignmentError.message
      );

      res.status(500).json({
        success: false,
        message: "Failed to remove content assignments",
      });
      return;
    }

    // Hapus metadata konten dari database.
    const { error: deleteError } = await supabase
      .from("contents")
      .delete()
      .eq("id", idResult.data);

    if (deleteError) {
      console.error("Delete content error:", deleteError.message);

      res.status(500).json({
        success: false,
        message: "Failed to delete content",
      });
      return;
    }

    // Beri tahu perangkat agar memperbarui playlist.
    notifyDevices(req, deviceIds);

    // Hapus file terkait dari Supabase Storage.
    if (content.storage_path) {
      try {
        await storageService.deleteFile(content.storage_path);
      } catch (storageError) {
        console.error("Storage cleanup error:", storageError);

        res.status(200).json({
          success: true,
          message: "Content deleted, but storage file cleanup failed",
          warning: "The associated storage file may need manual cleanup",
        });
        return;
      }
    }

    res.status(200).json({
      success: true,
      message: "Content deleted successfully",
    });
  } catch (error) {
    console.error("Delete content error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete content",
    });
  }
};

export = {
  getContents,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
  uploadContent,
  getContentUrl,
};