import type { Role } from "@/lib/constants/roles";

export type Profile = {
  id: string;
  full_name: string | null;
  whatsapp: string | null;
  role: Role;
  is_active: boolean;
  staff_all_events: boolean;
};
