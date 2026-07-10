import type { AdvertisingSummary } from "@/lib/site/advertising-display";
import {
  formatAdvertisingCtr,
  formatAdvertisingNumber,
} from "@/lib/site/advertising-display";

type AdvertisingSummaryPanelProps = {
  summary: AdvertisingSummary;
};

type SummaryModuleProps = {
  label: string;
  value: string;
  icon: React.ReactNode;
  detail?: string;
};

function SummaryModule({ label, value, icon, detail }: SummaryModuleProps) {
  return (
    <div className="admin-ad-scada-module">
      <div className="admin-ad-scada-module__head">
        <span className="admin-ad-scada-module__icon" aria-hidden>
          {icon}
        </span>
        <span className="admin-ad-scada-module__label">{label}</span>
      </div>
      <p className="admin-ad-scada-module__value">{value}</p>
      {detail ? (
        <p className="admin-ad-scada-module__detail">{detail}</p>
      ) : null}
    </div>
  );
}

function IconGrid() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" />
      <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" />
      <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" />
      <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" />
    </svg>
  );
}

function IconPulse() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5" stroke="currentColor" />
      <circle cx="7" cy="7" r="2" fill="currentColor" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" />
      <path d="M7 4v3.5l2.5 1.5" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="3" y="3" width="2.5" height="8" rx="0.5" fill="currentColor" />
      <rect x="8.5" y="3" width="2.5" height="8" rx="0.5" fill="currentColor" />
    </svg>
  );
}

function IconStop() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="3" y="3" width="8" height="8" rx="1" fill="currentColor" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M1.5 7s2-3.5 5.5-3.5S12.5 7 12.5 7s-2 3.5-5.5 3.5S1.5 7 1.5 7Z"
        stroke="currentColor"
      />
      <circle cx="7" cy="7" r="1.75" stroke="currentColor" />
    </svg>
  );
}

function IconClick() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M4.5 8.5 7 11l4-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2 4.5h3V7.5" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

function IconPercent() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="4" cy="4" r="1.5" stroke="currentColor" />
      <circle cx="10" cy="10" r="1.5" stroke="currentColor" />
      <path d="m10 4-6 6" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

export function AdvertisingSummaryPanel({ summary }: AdvertisingSummaryPanelProps) {
  return (
    <section
      className="admin-ad-scada-summary"
      aria-label="Resumen de publicidades"
    >
      <div className="admin-ad-scada-summary__row">
        <SummaryModule
          label="Total"
          value={formatAdvertisingNumber(summary.total)}
          icon={<IconGrid />}
          detail="campañas"
        />
        <SummaryModule
          label="Activas"
          value={formatAdvertisingNumber(summary.active)}
          icon={<IconPulse />}
        />
        <SummaryModule
          label="Programadas"
          value={formatAdvertisingNumber(summary.scheduled)}
          icon={<IconClock />}
        />
        <SummaryModule
          label="Pausadas"
          value={formatAdvertisingNumber(summary.paused)}
          icon={<IconPause />}
        />
        <SummaryModule
          label="Finalizadas"
          value={formatAdvertisingNumber(summary.finished)}
          icon={<IconStop />}
        />
      </div>
      <div className="admin-ad-scada-summary__row admin-ad-scada-summary__row--metrics">
        <SummaryModule
          label="Vistas"
          value={formatAdvertisingNumber(summary.totalViews)}
          icon={<IconEye />}
          detail="acumuladas"
        />
        <SummaryModule
          label="Clics"
          value={formatAdvertisingNumber(summary.totalClicks)}
          icon={<IconClick />}
          detail="acumulados"
        />
        <SummaryModule
          label="CTR"
          value={formatAdvertisingCtr(summary.totalViews, summary.totalClicks)}
          icon={<IconPercent />}
          detail="general"
        />
      </div>
    </section>
  );
}
