import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Emails de auth.users para IDs concretos (solo servidor / service_role).
 * Una sola ola paginada por listUsers; se detiene al resolver todos los IDs pedidos.
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
    const perPage = 1000;

    while (map.size < idSet.size) {
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

      page += 1;
      if (page > 200) {
        break;
      }
    }
  } catch (error) {
    console.error("fetchAuthEmailsByIds:", error);
  }

  return map;
}

/**
 * Busca IDs de auth cuyo email coincide (ilike). Escaneo paginado; usar solo con término acotado.
 */
export async function findAuthUserIdsByEmailSearch(
  emailTerm: string,
): Promise<string[]> {
  const needle = emailTerm.trim().toLowerCase();
  if (!needle.includes("@")) {
    return [];
  }

  const admin = createAdminClient();
  const matches: string[] = [];
  let page = 1;
  const perPage = 1000;

  while (page <= 50) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || data.users.length === 0) {
      break;
    }

    for (const user of data.users) {
      if (user.email?.toLowerCase().includes(needle)) {
        matches.push(user.id);
      }
    }

    if (data.users.length < perPage) {
      break;
    }
    page += 1;
  }

  return matches;
}
