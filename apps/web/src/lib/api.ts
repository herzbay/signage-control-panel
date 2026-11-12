const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not configured");
}

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

type ApiListResponse<T> = {
  success: boolean;
  message: string;
  data: T[];
};

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

async function authenticatedFetch<T>(
  endpoint: string,
  token: string
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to fetch data");
  }

  return result as T;
}

export async function getDevices(
  token: string
): Promise<Device[]> {
  const result = await authenticatedFetch<ApiListResponse<Device>>(
    "/api/devices",
    token
  );

  return result.data;
}

export async function getContents(
  token: string
): Promise<Content[]> {
  const result = await authenticatedFetch<ApiListResponse<Content>>(
    "/api/contents",
    token
  );

  return result.data;
}