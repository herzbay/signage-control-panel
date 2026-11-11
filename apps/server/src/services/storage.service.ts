import crypto = require("crypto");
import supabaseConfig = require("../config/supabase");

const supabase = supabaseConfig.supabaseAdmin;

const BUCKET_NAME = "signage-content";
const SIGNED_URL_EXPIRY = 60 * 60; // 1 hour

const mimeExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

// Upload file to Supabase Storage
const uploadFile = async (file: Express.Multer.File) => {
  const extension = mimeExtensions[file.mimetype];

  if (!extension) {
    throw new Error("Unsupported file type");
  }

  const storagePath = `${crypto.randomUUID()}.${extension}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    console.error("Storage upload error:", error.message);
    throw new Error("Failed to upload file to storage");
  }

  return {
    storagePath: data.path,
    size: file.size,
    mimeType: file.mimetype,
  };
};

// Generate temporary signed URL
const createSignedUrl = async (storagePath: string) => {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

  if (error) {
    console.error("Create signed URL error:", error.message);
    throw new Error("Failed to generate signed URL");
  }

  return data.signedUrl;
};

// Delete file from Supabase Storage
const deleteFile = async (storagePath: string) => {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath]);

  if (error) {
    console.error("Storage delete error:", error.message);
    throw new Error("Failed to delete file from storage");
  }
};

export = {
  uploadFile,
  createSignedUrl,
  deleteFile,
};