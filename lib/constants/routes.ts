export const ROUTES = {
  home: "/",
  eventos: "/eventos",
  evento: (slug: string) => `/eventos/${slug}`,
  eventoEntradas: (slug: string) => `/eventos/${slug}/entradas`,
  eventoListaPrecios: (slug: string) => `/eventos/${slug}/lista-precios`,
  comunidad: "/comunidad",
  login: "/login",
  miCuenta: "/mi-cuenta",
  miCuentaEntradas: "/mi-cuenta/entradas",
  admin: "/admin",
  adminEventos: "/admin/eventos",
  adminEventosCrear: "/admin/eventos/crear",
  adminEvento: (id: string) => `/admin/eventos/${id}`,
  adminComunidad: "/admin/comunidad",
  adminProductos: "/admin/productos",
  adminVentas: "/admin/ventas",
  adminCaja: "/admin/caja",
  adminCajero: "/admin/cajero",
  adminPuerta: "/admin/puerta",
  adminUsuarios: "/admin/usuarios",
} as const;

export const PUBLIC_NAV_LINKS = [
  { href: ROUTES.eventos, label: "Eventos" },
  { href: ROUTES.comunidad, label: "Comunidad" },
  { href: ROUTES.login, label: "Ingresar" },
] as const;

export const ADMIN_NAV_LINKS = [
  { href: ROUTES.admin, label: "Inicio" },
  { href: ROUTES.adminEventos, label: "Eventos" },
  { href: ROUTES.adminComunidad, label: "Comunidad" },
  { href: ROUTES.adminProductos, label: "Productos" },
  { href: ROUTES.adminVentas, label: "Ventas" },
  { href: ROUTES.adminCaja, label: "Caja" },
  { href: ROUTES.adminCajero, label: "Cajero" },
  { href: ROUTES.adminPuerta, label: "Puerta" },
  { href: ROUTES.adminUsuarios, label: "Usuarios" },
] as const;
