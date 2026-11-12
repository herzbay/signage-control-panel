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
