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
  [ROLES.DOOR]: "Puerta",
  [ROLES.CUSTOMER]: "Cliente",
};
