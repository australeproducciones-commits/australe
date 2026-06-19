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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar publicidad"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-login-ad-title"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border shadow-2xl public-card"
        style={{ borderColor: "var(--public-border)" }}
      >
        {campaign.image_url ? (
          <div className="relative aspect-[16/9] w-full">
            <RemoteImage
              src={campaign.image_url}
              alt={campaign.title ?? "Publicidad"}
              fill
              objectFit="cover"
            />
          </div>
        ) : null}

        <div className="p-5 sm:p-6">
          {campaign.title ? (
            <h2 id="post-login-ad-title" className="public-heading text-xl font-bold">
              {campaign.title}
            </h2>
          ) : null}
          {campaign.body ? (
            <p className="mt-3 text-sm leading-6 public-text-muted">{campaign.body}</p>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {campaign.destination_url && campaign.button_label ? (
              <PublicButton
                href={campaign.destination_url}
                target={campaign.open_in_new_tab ? "_blank" : undefined}
                rel={campaign.open_in_new_tab ? "noopener noreferrer" : undefined}
                onClick={handleClick}
              >
                {campaign.button_label}
              </PublicButton>
            ) : null}
            <PublicButton type="button" variant="outline" onClick={handleClose}>
              Cerrar
            </PublicButton>
          </div>
        </div>
      </div>
    </div>
  );
}
