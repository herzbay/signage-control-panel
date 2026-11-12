const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not configured");
}

// Types
export type Admin = {
  id: string;
  email: string;
  full_name: string;
};

export type LoginResponse = {
  success: boolean;
  message: string;
  data: {
    token: string;
    token_type: "Bearer";
    expires_in: number;
    admin: Admin;
  };
};

export type Device = {
  id: string;
  nama: string;
  lokasi: string;
  status: "online" | "offline";
  last_seen: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Content = {
  id: string;
  judul: string;
  tipe: "image" | "video" | "text";
  url: string | null;
  storage_path: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string;
};

export type ContentUrl = {
  id: string;
  judul: string;
  tipe: "image" | "video" | "text";
  url: string;
  expires_in: number;
};

// Relasi perangkat dan konten
export type DeviceContent = {
  device_id: string;
  content_id: string;
  position: number;
  is_active: boolean;
  assigned_at: string;
  updated_at: string;
  contents: Content | null;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

// Generic API request
async function apiRequest<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    cache: "no-store",
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "API request failed");
  }

  return result as ApiResponse<T>;
}

// Authentication
export async function loginAdmin(
  email: string,
  password: string
): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Login failed");
  }

  return result as LoginResponse;
}

// Devices
export async function getDevices(token: string): Promise<Device[]> {
  const result = await apiRequest<Device[]>("/api/devices", token);
  return result.data;
}

export async function createDevice(
  token: string,
  data: { nama: string; lokasi: string }
): Promise<Device> {
  const result = await apiRequest<Device>("/api/devices", token, {
    method: "POST",
    body: JSON.stringify(data),
  });

  return result.data;
}

export async function updateDevice(
  token: string,
  id: string,
  data: { nama: string; lokasi: string }
): Promise<Device> {
  const result = await apiRequest<Device>(`/api/devices/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(data),
  });

  return result.data;
}

export async function deleteDevice(
  token: string,
  id: string
): Promise<void> {
  await apiRequest<unknown>(`/api/devices/${id}`, token, {
    method: "DELETE",
  });
}

// Contents
export async function getContents(token: string): Promise<Content[]> {
  const result = await apiRequest<Content[]>("/api/contents", token);
  return result.data;
}

export async function createTextContent(
  token: string,
  data: {
    judul: string;
    tipe: "text";
    payload: Record<string, unknown>;
  }
): Promise<Content> {
  const result = await apiRequest<Content>("/api/contents", token, {
    method: "POST",
    body: JSON.stringify(data),
  });

  return result.data;
}

export async function updateContent(
  token: string,
  id: string,
  data: {
    judul?: string;
    tipe?: "image" | "video" | "text";
    url?: string | null;
    storage_path?: string | null;
    payload?: Record<string, unknown> | null;
  }
): Promise<Content> {
  const result = await apiRequest<Content>(`/api/contents/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(data),
  });

  return result.data;
}

export async function deleteContent(
  token: string,
  id: string
): Promise<void> {
  await apiRequest<unknown>(`/api/contents/${id}`, token, {
    method: "DELETE",
  });
}

// Upload image/video
export async function uploadContent(
  token: string,
  judul: string,
  file: File
): Promise<Content> {
  const formData = new FormData();

  formData.append("judul", judul);
  formData.append("file", file);

  const response = await fetch(`${API_URL}/api/contents/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Content upload failed");
  }

  return result.data as Content;
}

// Get signed URL for private media
export async function getContentUrl(
  token: string,
  id: string
): Promise<ContentUrl> {
  const result = await apiRequest<ContentUrl>(
    `/api/contents/${id}/url`,
    token
  );

  return result.data;
}

// Device Content Management
export async function getDeviceContents(
  token: string,
  deviceId: string
): Promise<DeviceContent[]> {
  const result = await apiRequest<DeviceContent[]>(
    `/api/devices/${deviceId}/contents`,
    token
  );

  return result.data;
}

export async function assignContentToDevice(
  token: string,
  deviceId: string,
  data: {
    content_id: string;
    position?: number;
    is_active?: boolean;
  }
): Promise<DeviceContent> {
  const result = await apiRequest<DeviceContent>(
    `/api/devices/${deviceId}/contents`,
    token,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );

  return result.data;
}

export async function updateDeviceContent(
  token: string,
  deviceId: string,
  contentId: string,
  data: {
    position?: number;
    is_active?: boolean;
  }
): Promise<DeviceContent> {
  const result = await apiRequest<DeviceContent>(
    `/api/devices/${deviceId}/contents/${contentId}`,
    token,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );

  return result.data;
}

export async function removeContentFromDevice(
  token: string,
  deviceId: string,
  contentId: string
): Promise<void> {
  await apiRequest<unknown>(
    `/api/devices/${deviceId}/contents/${contentId}`,
    token,
    {
      method: "DELETE",
    }
  );
}
