import "server-only";

/**
 * Google Drive helper untuk Cloudflare Worker / Node runtime.
 * Autentikasi Service Account via JWT RS256 yang ditandatangani WebCrypto.
 * Tidak memakai library `googleapis` (tidak kompatibel Worker).
 *
 * ENV yang dibutuhkan:
 *  - GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON : isi file JSON service account (string)
 *  - GOOGLE_DRIVE_LEAVE_FOLDER_ID      : folder root bukti izin
 *  - GOOGLE_DRIVE_CORRECTION_FOLDER_ID : folder root bukti koreksi presensi
 */

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

export type DriveUploadResult = {
  driveFileId: string;
  driveViewLink: string;
  fileName: string;
  mimeType: string;
};

const GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token";
const DRIVE_UPLOAD_URL =
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true";
const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";

function getServiceAccount(): ServiceAccount {
  const raw = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON belum dikonfigurasi.");
  const parsed = JSON.parse(raw) as ServiceAccount;
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("Service account JSON tidak valid (client_email/private_key hilang).");
  }
  return parsed;
}

function base64url(input: ArrayBuffer | string): string {
  const bytes =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : new Uint8Array(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

async function signJwt(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/drive",
    aud: sa.token_uri ?? GOOGLE_TOKEN_URI,
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned)
  );
  return `${unsigned}.${base64url(signature)}`;
}

async function getAccessToken(): Promise<string> {
  const sa = getServiceAccount();
  const jwt = await signJwt(sa);
  const res = await fetch(sa.token_uri ?? GOOGLE_TOKEN_URI, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error(`Gagal mendapatkan access token Drive: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

async function ensureFolder(
  token: string,
  name: string,
  parentId: string
): Promise<string> {
  const safeName = name.replace(/'/g, "");
  const q = encodeURIComponent(
    `name='${safeName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const listRes = await fetch(
    `${DRIVE_FILES_URL}?q=${q}&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (listRes.ok) {
    const data = (await listRes.json()) as { files: { id: string }[] };
    if (data.files?.[0]?.id) return data.files[0].id;
  }
  const createRes = await fetch(`${DRIVE_FILES_URL}?fields=id&supportsAllDrives=true`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: safeName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });
  if (!createRes.ok) {
    throw new Error(`Gagal membuat folder Drive: ${createRes.status} ${await createRes.text()}`);
  }
  const created = (await createRes.json()) as { id: string };
  return created.id;
}

async function resolveSubfolder(
  token: string,
  rootId: string,
  segments: string[]
): Promise<string> {
  let parent = rootId;
  for (const seg of segments) {
    parent = await ensureFolder(token, seg, parent);
  }
  return parent;
}

async function uploadOnce(
  token: string,
  folderId: string,
  file: File
): Promise<DriveUploadResult> {
  const metadata = { name: file.name, parents: [folderId] };
  const boundary = `nsh-${crypto.randomUUID()}`;
  const enc = new TextEncoder();
  const pre = enc.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n--${boundary}\r\n` +
      `Content-Type: ${file.type || "application/octet-stream"}\r\n\r\n`
  );
  const post = enc.encode(`\r\n--${boundary}--`);
  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const body = new Uint8Array(pre.length + fileBytes.length + post.length);
  body.set(pre, 0);
  body.set(fileBytes, pre.length);
  body.set(post, pre.length + fileBytes.length);

  const res = await fetch(DRIVE_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`Upload Drive gagal: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { id: string; webViewLink: string };
  return {
    driveFileId: data.id,
    driveViewLink: data.webViewLink,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
  };
}

/**
 * Upload satu file ke Drive di dalam subfolder {rootFolderId}/{...segments}/.
 * Retry sekali bila gagal.
 */
export async function uploadToDrive(
  rootFolderId: string,
  subfolderSegments: string[],
  file: File
): Promise<DriveUploadResult> {
  const token = await getAccessToken();
  const folderId = await resolveSubfolder(token, rootFolderId, subfolderSegments);
  try {
    return await uploadOnce(token, folderId, file);
  } catch {
    return await uploadOnce(token, folderId, file);
  }
}

export function leaveRootFolderId(): string {
  const id = process.env.GOOGLE_DRIVE_LEAVE_FOLDER_ID;
  if (!id) throw new Error("GOOGLE_DRIVE_LEAVE_FOLDER_ID belum dikonfigurasi.");
  return id;
}

export function correctionRootFolderId(): string {
  const id = process.env.GOOGLE_DRIVE_CORRECTION_FOLDER_ID;
  if (!id) throw new Error("GOOGLE_DRIVE_CORRECTION_FOLDER_ID belum dikonfigurasi.");
  return id;
}

// Registration document helpers
// Buat folder di bawah root, upload beberapa file, kembalikan folderId + hasil.
export async function uploadFilesToNewFolder(
  rootFolderId: string,
  folderName: string,
  files: { field: string; file: File }[]
): Promise<{ folderId: string; uploaded: (DriveUploadResult & { field: string })[] }> {
  const token = await getAccessToken();
  const folderId = await ensureFolder(token, folderName, rootFolderId);
  const uploaded: (DriveUploadResult & { field: string })[] = [];
  for (const { field, file } of files) {
    let res: DriveUploadResult;
    try {
      res = await uploadOnce(token, folderId, file);
    } catch {
      res = await uploadOnce(token, folderId, file);
    }
    uploaded.push({ ...res, field });
  }
  return { folderId, uploaded };
}

// Pindahkan folder ke parent baru sekaligus ganti nama.
export async function moveAndRenameFolder(
  folderId: string,
  newParentId: string,
  newName: string
): Promise<void> {
  const token = await getAccessToken();

  // Ambil parent lama untuk removeParents.
  const metaRes = await fetch(
    `${DRIVE_FILES_URL}/${folderId}?fields=parents&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!metaRes.ok) {
    throw new Error(`Gagal membaca folder Drive: ${metaRes.status} ${await metaRes.text()}`);
  }
  const meta = (await metaRes.json()) as { parents?: string[] };
  const removeParents = (meta.parents ?? []).join(",");

  const params = new URLSearchParams({
    addParents: newParentId,
    supportsAllDrives: "true",
    fields: "id",
  });
  if (removeParents) params.set("removeParents", removeParents);

  const res = await fetch(`${DRIVE_FILES_URL}/${folderId}?${params.toString()}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: newName }),
  });
  if (!res.ok) {
    throw new Error(`Gagal memindahkan folder Drive: ${res.status} ${await res.text()}`);
  }
}

export function tempRootFolderId(): string {
  const id = process.env.GOOGLE_DRIVE_TEMP;
  if (!id) throw new Error("GOOGLE_DRIVE_TEMP belum dikonfigurasi.");
  return id;
}

export function employeeDocumentRootFolderId(): string {
  const id = process.env.GOOGLE_DRIVE_EMPLOYEE_DOCUMENT_FOLDER_ID;
  if (!id) throw new Error("GOOGLE_DRIVE_EMPLOYEE_DOCUMENT_FOLDER_ID belum dikonfigurasi.");
  return id;
}

/** Segmen bulan: 2026-07 */
export function monthSegment(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
