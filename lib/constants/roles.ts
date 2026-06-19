export const ROLES = {
  ADMIN: "admin",
  CASHIER: "cashier",
  DOOR: "door",
  CUSTOMER: "customer",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.ADMIN]: "Administrador",
  [ROLES.CASHIER]: "Cajero",
  [ROLES.DOOR]: "Portero",
  [ROLES.CUSTOMER]: "Cliente",
};

/** Etiquetas para usuarios internos (excluye customer). */
export const INTERNAL_ROLE_LABELS: Record<
  typeof ROLES.ADMIN | typeof ROLES.CASHIER | typeof ROLES.DOOR,
  string
> = {
  [ROLES.ADMIN]: "Administrador",
  [ROLES.CASHIER]: "Cajero",
  [ROLES.DOOR]: "Portero",
};
