import Image from "next/image";
import type { ReactNode } from "react";
import {
  getStreamBannerAlt,
  resolveStreamBannerDesktop,
  resolveStreamBannerMobile,
} from "@/lib/streaming/utils";
import type { EventStream, EventStreamEventInfo } from "@/lib/streaming/types";
import { cn } from "@/lib/utils/cn";

type StreamingBannerImageProps = {
  stream: Pick<EventStream, "title" | "stream_banner_url" | "stream_banner_mobile_url">;
  event: EventStreamEventInfo;
  priority?: boolean;
  className?: string;
  overlay?: ReactNode;
};

export function StreamingBannerImage({
  stream,
  event,
  priority = false,
  className,
  overlay,
}: StreamingBannerImageProps) {
  const desktopSrc = resolveStreamBannerDesktop(stream, event);
  const mobileSrc = resolveStreamBannerMobile(stream, event);
  const alt = getStreamBannerAlt(stream, event.name);

  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-purple-50", className)}>
      <picture>
        <source media="(max-width: 767px)" srcSet={mobileSrc} />
        <Image
          src={desktopSrc}
          alt={alt}
          width={2400}
          height={1000}
          priority={priority}
          className="h-full w-full object-cover object-center"
          sizes="(max-width: 768px) 100vw, 1200px"
        />
      </picture>
      {overlay ? (
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-5 sm:p-8">
          {overlay}
        </div>
      ) : null}
    </div>
  );
}
