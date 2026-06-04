import type { drive_v3 } from "googleapis";
import { createAdminClient } from "@/lib/supabase/admin";

const FOLDER_MIME = "application/vnd.google-apps.folder";
const ROOT_NAME = "홈노트";

/** Drive 검색 쿼리용 작은따옴표/역슬래시 이스케이프. */
function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/**
 * 연동 계정의 "홈노트" 최상위 폴더 id를 보장.
 * google_tokens.drive_root_folder_id에 캐시 → 이후엔 Drive 호출 없이 재사용.
 */
export async function ensureRootFolder(drive: drive_v3.Drive, userId: string): Promise<string> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("google_tokens")
    .select("drive_root_folder_id")
    .eq("user_id", userId)
    .single();
  if (row?.drive_root_folder_id) return row.drive_root_folder_id;

  // 이미 만든 게 있으면 재사용(중복 방지), 없으면 생성.
  const found = await drive.files.list({
    q: `name='${ROOT_NAME}' and mimeType='${FOLDER_MIME}' and trashed=false`,
    fields: "files(id)",
    spaces: "drive",
    pageSize: 1,
  });
  let id = found.data.files?.[0]?.id ?? null;
  if (!id) {
    const created = await drive.files.create({
      requestBody: { name: ROOT_NAME, mimeType: FOLDER_MIME },
      fields: "id",
    });
    id = created.data.id ?? null;
  }
  if (id) await admin.from("google_tokens").update({ drive_root_folder_id: id }).eq("user_id", userId);
  return id!;
}

/**
 * 카테고리 이름에 대응하는 Drive 하위 폴더 id를 보장(현재 사용자 Drive 기준).
 * 배우자마다 Drive가 다르므로 전역 캐시 없이 본인 root 아래에서 이름으로
 * find-or-create 합니다. (drive.file 권한은 본인이 만든 폴더만 보이므로 안전)
 */
export async function ensureCategoryFolder(
  drive: drive_v3.Drive,
  rootId: string,
  name: string
): Promise<string> {
  const found = await drive.files.list({
    q: `name='${esc(name)}' and '${rootId}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`,
    fields: "files(id)",
    spaces: "drive",
    pageSize: 1,
  });
  let id = found.data.files?.[0]?.id ?? null;
  if (!id) {
    const created = await drive.files.create({
      requestBody: { name, mimeType: FOLDER_MIME, parents: [rootId] },
      fields: "id",
    });
    id = created.data.id ?? null;
  }
  return id!;
}
