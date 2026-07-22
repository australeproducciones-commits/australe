import type { AdvertisingOperationalStats } from "@/lib/site/advertising-display";

type AdvertisingSystemStatusBarProps = {
  stats: AdvertisingOperationalStats;
};

export function AdvertisingSystemStatusBar({
  stats,
}: AdvertisingSystemStatusBarProps) {
  return (
    <section className="admin-ad-scada-system-bar" aria-label="Estado del sistema">
      <div>
        <p className="admin-ad-scada-system-bar__title">Estado del sistema</p>
        <p className="admin-ad-scada-page__status">
          <span
            className={`admin-ad-scada-page__status-dot admin-ad-scada-page__status-dot--${stats.systemTone}`}
            aria-hidden
          />
          {stats.systemLabel}
        </p>
      </div>
      <div>
        <p className="admin-ad-scada-system-bar__label">Campañas activas</p>
        <p className="admin-ad-scada-system-bar__value">{stats.activeCount}</p>
      </div>
      <div>
        <p className="admin-ad-scada-system-bar__label">Finalizan pronto</p>
        <p className="admin-ad-scada-system-bar__value">{stats.endingSoonCount}</p>
      </div>
      <div>
        <p className="admin-ad-scada-system-bar__label">Sin destino</p>
        <p className="admin-ad-scada-system-bar__value">
          {stats.withoutDestinationCount}
        </p>
      </div>
      <div>
        <p className="admin-ad-scada-system-bar__label">Sin imagen</p>
        <p className="admin-ad-scada-system-bar__value">{stats.withoutImageCount}</p>
      </div>
    </section>
  );
}
