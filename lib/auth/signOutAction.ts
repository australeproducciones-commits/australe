"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "global" });

  if (error) {
    throw new Error("No se pudo cerrar sesión. Intentá de nuevo.");
  }

  revalidatePath("/", "layout");
}
