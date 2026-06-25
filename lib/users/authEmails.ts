import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Obtiene emails de auth.users para IDs dados (solo servidor / service_role).
 */
export async function fetchAuthEmailsByIds(
  userIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  if (userIds.length === 0) {
    return map;
  }

  try {
    const admin = createAdminClient();
    const idSet = new Set(userIds);

    let page = 1;
    const perPage = 200;

    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage,
      });

      if (error) {
        console.error("fetchAuthEmailsByIds:", error);
        break;
      }

      for (const user of data.users) {
        if (idSet.has(user.id) && user.email) {
          map.set(user.id, user.email);
        }
      }

      if (data.users.length < perPage) {
        break;
      }

      if (map.size >= idSet.size) {
        break;
      }

      page += 1;
    }
  } catch (error) {
    console.error("fetchAuthEmailsByIds:", error);
  }

  return map;
}
