"use client";

import { useCallback, useEffect, useState } from "react";
import { RemoteImage } from "@/components/ui/RemoteImage";
import {
  fetchPostLoginAdvertisingAction,
  recordAdvertisingClickAction,
  recordAdvertisingDismissAction,
  recordAdvertisingViewAction,
} from "@/lib/site/actions";
import { POST_LOGIN_AD_SESSION_KEY } from "@/lib/auth/loginRedirect";
import { PublicButton } from "@/components/ui/public/PublicButton";
import { cn } from "@/lib/utils/cn";

const SESSION_SEEN_PREFIX = "australe:ad-seen:";

export function PostLoginAdModal() {
  const [campaign, setCampaign] = useState<{
    id: string;
    title: string | null;
    body: string | null;
    image_url: string | null;
    button_label: string | null;
    destination_url: string | null;
    frequency: string;
    open_in_new_tab: boolean;
  } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const shouldShow = sessionStorage.getItem(POST_LOGIN_AD_SESSION_KEY);

    if (!shouldShow) {
      return;
    }

    sessionStorage.removeItem(POST_LOGIN_AD_SESSION_KEY);

    void fetchPostLoginAdvertisingAction().then(({ campaign: active }) => {
      if (!active) {
        return;
      }

      if (active.frequency === "once_per_session") {
        const sessionKey = `${SESSION_SEEN_PREFIX}${active.id}`;
        if (sessionStorage.getItem(sessionKey)) {
          return;
        }
        sessionStorage.setItem(sessionKey, "1");
      }

      setCampaign(active);
      setOpen(true);
      void recordAdvertisingViewAction(active.id, active.frequency);
    });
  }, []);

  const handleClose = useCallback(() => {
    if (campaign) {
      void recordAdvertisingDismissAction(campaign.id);
    }
    setOpen(false);
  }, [campaign]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, handleClose]);

  function handleClick() {
    if (!campaign?.destination_url) {
      return;
    }

    void recordAdvertisingClickAction(campaign.id);
  }

  if (!open || !campaign) {
    return null;
  }

  const hasBody = Boolean(campaign.body?.trim());
  const hasTitle = Boolean(campaign.title?.trim());
  const hasCta = Boolean(campaign.destination_url && campaign.button_label);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
      <button
        type="button"
        aria-label="Cerrar publicidad"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={hasTitle ? "post-login-ad-title" : undefined}
        className={cn(
          "relative z-10 flex w-[min(92vw,32.5rem)] min-w-0 max-w-[32.5rem] flex-col overflow-y-auto overscroll-contain",
          "max-h-[min(90dvh,44rem)] rounded-[1.375rem] border shadow-2xl public-card",
        )}
        style={{ borderColor: "var(--public-border)" }}
      >
        {campaign.image_url ? (
          <div
            className="relative w-full shrink-0 overflow-hidden bg-neutral-100/95"
            style={{
              height: "clamp(14rem, calc(min(90dvh, 44rem) - 9.5rem), 25.625rem)",
            }}
          >
            <RemoteImage
              src={campaign.image_url}
              alt={campaign.title ?? "Publicidad"}
              fill
              objectFit="contain"
            />
            <button
              type="button"
              onClick={handleClose}
              aria-label="Cerrar publicidad"
              className="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-lg leading-none text-white backdrop-blur-sm transition hover:bg-black/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        ) : null}

        <div className="flex shrink-0 flex-col px-4 pb-4 pt-3.5 sm:px-5 sm:pb-5 sm:pt-4">
          {hasTitle ? (
            <h2
              id="post-login-ad-title"
              className="public-heading line-clamp-2 text-[clamp(1.25rem,4.2vw,1.5rem)] font-bold leading-tight"
              style={{ fontWeight: 650 }}
            >
              {campaign.title}
            </h2>
          ) : null}
          {hasBody ? (
            <p className="mt-1 line-clamp-2 text-[0.9375rem] leading-snug public-text-muted">
              {campaign.body}
            </p>
          ) : null}

          <div
            className={cn(
              "flex flex-row flex-wrap gap-2 max-[360px]:flex-col",
              hasTitle || hasBody ? "mt-3" : "mt-0",
            )}
          >
            {hasCta ? (
              <PublicButton
                href={campaign.destination_url!}
                target={campaign.open_in_new_tab ? "_blank" : undefined}
                rel={campaign.open_in_new_tab ? "noopener noreferrer" : undefined}
                onClick={handleClick}
                size="sm"
                className="h-11 min-h-[2.5rem] flex-1 px-4 text-sm sm:flex-[1.4]"
              >
                {campaign.button_label}
              </PublicButton>
            ) : null}
            <PublicButton
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              className="h-11 min-h-[2.5rem] px-4 text-sm sm:flex-1"
            >
              Cerrar
            </PublicButton>
          </div>
        </div>
      </div>
    </div>
  );
}
