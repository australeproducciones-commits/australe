const NEXT_IMAGE_HOSTS = [
  "i.postimg.cc",
  "postimg.cc",
  "res.cloudinary.com",
];

function getSupabaseStorageHostname(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    return null;
  }

  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function isNextImageOptimizable(url: string): boolean {
  if (url.startsWith("/")) {
    return true;
  }

  try {
    const { hostname } = new URL(url);
    const supabaseHost = getSupabaseStorageHostname();

    if (supabaseHost && hostname === supabaseHost) {
      return true;
    }

    return NEXT_IMAGE_HOSTS.some(
      (host) => hostname === host || hostname.endsWith(".postimg.cc"),
    );
  } catch {
    return false;
  }
}

export function getNextImageRemotePatterns() {
  const patterns: Array<{
    protocol: "https";
    hostname: string;
    pathname?: string;
  }> = [
    { protocol: "https", hostname: "i.postimg.cc" },
    { protocol: "https", hostname: "postimg.cc" },
    { protocol: "https", hostname: "**.postimg.cc" },
    { protocol: "https", hostname: "res.cloudinary.com" },
  ];

  const supabaseHost = getSupabaseStorageHostname();
  if (supabaseHost) {
    patterns.push({
      protocol: "https",
      hostname: supabaseHost,
      pathname: "/storage/v1/object/public/**",
    });
  }

  return patterns;
}
