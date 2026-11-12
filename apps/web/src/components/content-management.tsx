"use client";

import {
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  Image as ImageIcon,
  Video,
  FileText,
  Upload,
} from "lucide-react";

import {
  createTextContent,
  deleteContent,
  getContentUrl,
  updateContent,
  uploadContent,
  type Content,
} from "@/lib/api";

type ContentManagementProps = {
  contents: Content[];
  setContents: Dispatch<SetStateAction<Content[]>>;
  loading: boolean;
  onRefresh: () => void;
};

type ContentType = "image" | "video" | "text";

export default function ContentManagement({
  contents,
  setContents,
  loading,
  onRefresh,
}: ContentManagementProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);

  const [judul, setJudul] = useState("");
  const [tipe, setTipe] = useState<ContentType>("image");
  const [textContent, setTextContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Mengambil URL sementara untuk pratinjau media.
  useEffect(() => {
    let active = true;

    async function loadPreviewUrls() {
      const token = sessionStorage.getItem("admin_token");

      if (!token) return;

      const mediaContents = contents.filter(
        (content) =>
          (content.tipe === "image" || content.tipe === "video") &&
          content.storage_path
      );

      const entries = await Promise.all(
        mediaContents.map(async (content) => {
          try {
            const result = await getContentUrl(token, content.id);
            return [content.id, result.url] as const;
          } catch {
            return null;
          }
        })
      );

      if (!active) return;

      const urls: Record<string, string> = {};

      entries.forEach((entry) => {
        if (entry) {
          urls[entry[0]] = entry[1];
        }
      });

      setPreviewUrls(urls);
    }

    void loadPreviewUrls();

    return () => {
      active = false;
    };
  }, [contents]);

  function resetForm() {
    setJudul("");
    setTipe("image");
    setTextContent("");
    setSelectedFile(null);
    setEditingContent(null);
    setError("");
  }

  function openCreateModal() {
    resetForm();
    setModalOpen(true);
  }

  function openEditModal(content: Content) {
    resetForm();

    setEditingContent(content);
    setJudul(content.judul);
    setTipe(content.tipe);

    if (content.tipe === "text") {
      setTextContent(
        typeof content.payload?.text === "string"
          ? content.payload.text
          : ""
      );
    }

    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    resetForm();
  }

  async function handleSubmit(
    event: Parameters<
        NonNullable<React.ComponentProps<"form">["onSubmit"]>
    >[0]
    ) {
    event.preventDefault();

    const token = sessionStorage.getItem("admin_token");

    if (!token) {
      setError("Sesi masuk tidak ditemukan. Silakan masuk kembali.");
      return;
    }

    if (!judul.trim()) {
      setError("Judul konten wajib diisi.");
      return;
    }

    if (!editingContent && tipe !== "text" && !selectedFile) {
      setError("Silakan pilih berkas yang akan diunggah.");
      return;
    }

    if (tipe === "text" && !textContent.trim()) {
      setError("Isi konten teks wajib diisi.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (editingContent) {
        const updatedContent = await updateContent(
          token,
          editingContent.id,
          tipe === "text"
            ? {
                judul: judul.trim(),
                payload: {
                  text: textContent.trim(),
                },
              }
            : {
                judul: judul.trim(),
              }
        );

        setContents((current) =>
          current.map((item) =>
            item.id === updatedContent.id ? updatedContent : item
          )
        );
      } else if (tipe === "text") {
        const newContent = await createTextContent(token, {
          judul: judul.trim(),
          tipe: "text",
          payload: {
            text: textContent.trim(),
          },
        });

        setContents((current) => [newContent, ...current]);
      } else if (selectedFile) {
        const newContent = await uploadContent(
          token,
          judul.trim(),
          selectedFile
        );

        setContents((current) => [newContent, ...current]);
      }

      setModalOpen(false);
      resetForm();
    } catch {
      setError("Gagal menyimpan konten. Silakan periksa kembali data dan koneksi Anda.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(content: Content) {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus konten "${content.judul}"?`
    );

    if (!confirmed) return;

    const token = sessionStorage.getItem("admin_token");

    if (!token) {
      setError("Sesi masuk tidak ditemukan. Silakan masuk kembali.");
      return;
    }

    setDeletingId(content.id);
    setError("");

    try {
      await deleteContent(token, content.id);

      setContents((current) =>
        current.filter((item) => item.id !== content.id)
      );

      setPreviewUrls((current) => {
        const updated = { ...current };
        delete updated[content.id];
        return updated;
      });
    } catch {
      setError("Gagal menghapus konten. Silakan coba kembali.");
    } finally {
      setDeletingId(null);
    }
  }

  function getContentIcon(contentType: ContentType) {
    if (contentType === "image") return <ImageIcon size={18} />;
    if (contentType === "video") return <Video size={18} />;
    return <FileText size={18} />;
  }

  function getContentTypeLabel(contentType: ContentType) {
    if (contentType === "image") return "Gambar";
    if (contentType === "video") return "Video";
    return "Teks";
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3 border-b border-zinc-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Pengelolaan Konten
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Kelola gambar, video, dan teks untuk ditampilkan pada perangkat signage.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Muat Ulang
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              <Plus size={17} />
              Tambah Konten
            </button>
          </div>
        </div>

        {error && !modalOpen && (
          <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="p-5">
          {loading ? (
            <div className="py-12 text-center text-sm text-zinc-500">
              Memuat data konten...
            </div>
          ) : contents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText size={36} className="mb-3 text-zinc-400" />
              <p className="font-medium text-zinc-700 dark:text-zinc-200">
                Belum ada konten
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Tambahkan gambar, video, atau teks untuk memulai.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {contents.map((content) => (
                <article
                  key={content.id}
                  className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700"
                >
                  <div className="flex aspect-video items-center justify-center overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    {content.tipe === "image" && previewUrls[content.id] ? (
                      <img
                        src={previewUrls[content.id]}
                        alt={content.judul}
                        className="h-full w-full object-contain"
                      />
                    ) : content.tipe === "video" &&
                      previewUrls[content.id] ? (
                      <video
                        src={previewUrls[content.id]}
                        controls
                        className="h-full w-full object-contain"
                      />
                    ) : content.tipe === "text" ? (
                      <div className="max-h-full w-full overflow-hidden p-5 text-center">
                        <FileText
                          size={28}
                          className="mx-auto mb-2 text-zinc-400"
                        />
                        <p className="line-clamp-4 whitespace-pre-wrap break-words text-sm text-zinc-700 dark:text-zinc-200">
                          {typeof content.payload?.text === "string"
                            ? content.payload.text
                            : "Tidak ada isi teks."}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-zinc-400">
                        {getContentIcon(content.tipe)}
                        <span className="text-xs">
                          Pratinjau tidak tersedia
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-zinc-900 dark:text-white">
                          {content.judul}
                        </h3>
                        <p className="mt-1 text-xs text-zinc-500">
                          {formatDate(content.created_at)}
                        </p>
                      </div>

                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {getContentIcon(content.tipe)}
                        {getContentTypeLabel(content.tipe)}
                      </span>
                    </div>

                    <div className="flex gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={() => openEditModal(content)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        <Pencil size={15} />
                        Ubah
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDelete(content)}
                        disabled={deletingId === content.id}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950/30"
                      >
                        <Trash2 size={15} />
                        {deletingId === content.id ? "Menghapus..." : "Hapus"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  {editingContent ? "Ubah Konten" : "Tambah Konten"}
                </h3>
                <p className="mt-1 text-sm text-zinc-500">
                  {editingContent
                    ? "Perbarui informasi konten."
                    : "Tambahkan konten baru ke sistem signage."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="content-title"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Judul Konten
                </label>
                <input
                  id="content-title"
                  type="text"
                  value={judul}
                  onChange={(event) => setJudul(event.target.value)}
                  maxLength={200}
                  required
                  placeholder="Masukkan judul konten"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                />
              </div>

              {!editingContent && (
                <div>
                  <label
                    htmlFor="content-type"
                    className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Jenis Konten
                  </label>
                  <select
                    id="content-type"
                    value={tipe}
                    onChange={(event) =>
                      setTipe(event.target.value as ContentType)
                    }
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                  >
                    <option value="image">Gambar</option>
                    <option value="video">Video</option>
                    <option value="text">Teks</option>
                  </select>
                </div>
              )}

              {tipe === "text" ? (
                <div>
                  <label
                    htmlFor="content-text"
                    className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Isi Konten
                  </label>
                  <textarea
                    id="content-text"
                    value={textContent}
                    onChange={(event) => setTextContent(event.target.value)}
                    rows={5}
                    required
                    placeholder="Masukkan teks yang akan ditampilkan pada perangkat signage..."
                    className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                  />
                </div>
              ) : !editingContent ? (
                <div>
                  <label
                    htmlFor="content-file"
                    className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Berkas {tipe === "image" ? "Gambar" : "Video"}
                  </label>

                  <label
                    htmlFor="content-file"
                    className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 px-4 py-8 text-center transition hover:border-blue-500 dark:border-zinc-700"
                  >
                    <Upload size={26} className="mb-2 text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                      {selectedFile
                        ? selectedFile.name
                        : "Klik untuk memilih berkas"}
                    </span>
                    <span className="mt-1 text-xs text-zinc-500">
                      {tipe === "image"
                        ? "JPEG, PNG, WEBP, atau GIF"
                        : "MP4, WEBM, atau MOV"}
                    </span>
                  </label>

                  <input
                    id="content-file"
                    type="file"
                    accept={
                      tipe === "image"
                        ? "image/jpeg,image/png,image/webp,image/gif"
                        : "video/mp4,video/webm,video/quicktime"
                    }
                    onChange={(event) =>
                      setSelectedFile(event.target.files?.[0] ?? null)
                    }
                    className="sr-only"
                  />
                </div>
              ) : (
                <p className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-500 dark:bg-zinc-800">
                  Berkas media tidak diganti. Hanya judul konten yang dapat diperbarui.
                </p>
              )}

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving
                    ? "Menyimpan..."
                    : editingContent
                      ? "Simpan Perubahan"
                      : "Tambah Konten"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
