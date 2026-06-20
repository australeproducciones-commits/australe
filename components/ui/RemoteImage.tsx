import { cn } from "@/lib/utils/cn";

type RemoteImageProps = {
  src: string;
  alt: string;
  className?: string;
  objectFit?: "contain" | "cover";
  fill?: boolean;
};

/** Imagen externa configurable desde admin (sin allowlist de host en next/image). */
export function RemoteImage({
  src,
  alt,
  className,
  objectFit = "contain",
  fill = false,
}: RemoteImageProps) {
  const fitClass = objectFit === "cover" ? "object-cover" : "object-contain";

  if (fill) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cn("absolute inset-0 h-full w-full", fitClass, className)}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn(fitClass, className)}
      loading="lazy"
      decoding="async"
    />
  );
}
