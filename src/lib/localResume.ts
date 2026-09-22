import { ResumeValues } from "./validation";

const LOCAL_RESUME_KEY = "anonymous-resume";

// Base64 adds ~33% overhead over the raw file, and it has to share the
// ~5-10MB per-origin localStorage quota with the rest of the resume, so
// this stays well under the 4MB server-side cap in validation.ts.
export const MAX_LOCAL_PHOTO_BYTES = 1024 * 1024;

export class LocalPhotoTooLargeError extends Error {
  constructor() {
    super("Photo is too large to store locally.");
    this.name = "LocalPhotoTooLargeError";
  }
}

export function readLocalResume(): ResumeValues | null {
  try {
    const raw = localStorage.getItem(LOCAL_RESUME_KEY);
    return raw ? (JSON.parse(raw) as ResumeValues) : null;
  } catch {
    // Unavailable or corrupted (private browsing, disabled storage, bad
    // JSON) — fail soft into a blank resume rather than crash the editor.
    return null;
  }
}

export async function writeLocalResume(values: ResumeValues): Promise<void> {
  if (
    values.photo instanceof File &&
    values.photo.size > MAX_LOCAL_PHOTO_BYTES
  ) {
    throw new LocalPhotoTooLargeError();
  }

  const photo =
    values.photo instanceof File
      ? await fileToBase64(values.photo)
      : values.photo;

  localStorage.setItem(LOCAL_RESUME_KEY, JSON.stringify({ ...values, photo }));
}

export function clearLocalResume(): void {
  try {
    localStorage.removeItem(LOCAL_RESUME_KEY);
  } catch {
    // Nothing to clean up if storage isn't available.
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
