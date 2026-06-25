export const ROUTES = {
  home: "/",
  sobre: "/sobre",
  contacto: "/contacto",
  eventos: "/eventos",
  evento: (slug: string) => `/eventos/${slug}`,
  eventoEntradas: (slug: string) => `/eventos/${slug}/entradas`,
  eventoEntradasCanal: (slug: string, canal: "web" | "reserva") =>
    `/eventos/${slug}/entradas?canal=${canal}`,
  eventoEntradasTipo: (slug: string, ticketTypeId: string) =>
    `/eventos/${slug}/entradas?ticketType=${encodeURIComponent(ticketTypeId)}`,
  eventoEntradaDirecta: (slug: string, entradaSlug: string) =>
    `/eventos/${slug}?entrada=${encodeURIComponent(entradaSlug)}`,
  eventoListaPrecios: (slug: string) => `/eventos/${slug}/lista-precios`,
  ventaEvento: (code: string) => `/venta/e/${code}`,
  invitacion: (token: string) => `/invitacion/${token}`,
  comunidad: "/comunidad",
  login: "/login",
  miCuenta: "/mi-cuenta",
  miCuentaEntradas: "/mi-cuenta/entradas",
  admin: "/admin",
  adminEventos: "/admin/eventos",
  adminEventosCrear: "/admin/eventos/crear",
  adminEvento: (id: string) => `/admin/eventos/${id}`,
  adminEventoEntradas: (id: string) => `/admin/eventos/${id}/entradas`,
  adminEventoVentas: (id: string) => `/admin/eventos/${id}/ventas`,
  adminEventoKiosco: (id: string) => `/admin/eventos/${id}/kiosco`,
  adminEventoGestion: (id: string) => `/admin/eventos/${id}/gestion`,
  adminComunidad: "/admin/comunidad",
  adminComunidadPublicidad: "/admin/comunidad/publicidad",
  adminProductos: "/admin/productos",
  adminVentas: "/admin/ventas",
  adminCaja: "/admin/caja",
  adminCajero: "/admin/cajero",
  adminPuerta: "/admin/puerta",
  cajero: "/cajero",
  portero: "/portero",
  adminUsuarios: "/admin/usuarios",
  adminUsuarioNuevo: "/admin/usuarios/nuevo",
  adminUsuario: (id: string) => `/admin/usuarios/${id}`,
  adminConfiguracion: "/admin/configuracion",
  adminPartners: "/admin/partners",
  adminPublicidad: "/admin/publicidad",
} as const;

/** Enlaces del header público (sin Contacto; el contacto vive en el footer). */
export const PUBLIC_HEADER_LINKS = [
  { href: ROUTES.home, label: "Inicio" },
  { href: ROUTES.eventos, label: "Eventos" },
  { href: ROUTES.comunidad, label: "Comunidad" },
] as const;

export const PUBLIC_NAV_LINKS = [
  ...PUBLIC_HEADER_LINKS,
  { href: ROUTES.contacto, label: "Contacto" },
] as const;

export const INSTAGRAM_URL = "https://www.instagram.com/australeproducciones/";
export const INSTAGRAM_HANDLE = "@australeproducciones";

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
