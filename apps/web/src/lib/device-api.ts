const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type DisplayDevice = {
  id: string;
  nama: string;
  lokasi: string;
  status: "online" | "offline";
};

export type DisplayContent = {
  id: string;
  judul: string;
  tipe: "image" | "video" | "text";
  url: string | null;
  payload: {
    text?: string;
  } | null;
  position: number;
};

export type DeviceDisplayResponse = {
  device: DisplayDevice;
  contents: DisplayContent[];
};

type ApiResponse = {
  success: boolean;
  message?: string;
  data?: DeviceDisplayResponse;
};

export async function getDeviceDisplay(
  deviceId: string
): Promise<DeviceDisplayResponse> {
  if (!API_URL) {
    throw new Error("Alamat API belum dikonfigurasi");
  }

  const response = await fetch(
    `${API_URL}/api/devices/${deviceId}/display`,
    {
      method: "GET",
      cache: "no-store",
    }
  );

  const result: ApiResponse = await response.json();

  if (!response.ok || !result.success || !result.data) {
    throw new Error(
      result.message || "Gagal mengambil data tampilan perangkat"
    );
  }

  return result.data;
}