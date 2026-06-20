"use client";

import { useCallback } from "react";
import type { EventFormInput } from "@/lib/events/types";
import {
  computeDurationMinutes,
  computeEndTimeFromStartAndDuration,
  formatDurationLabel,
  joinDurationParts,
  parseTimeInputToMinutes,
  splitDurationMinutes,
} from "@/lib/events/eventSchedule";
import { cn } from "@/lib/utils/cn";

type EventFormScheduleFieldsProps = {
  values: Pick<EventFormInput, "start_time" | "end_time">;
  durationHours: number;
  durationMinutes: number;
  disabled?: boolean;
  inputClassName: string;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  onDurationChange: (hours: number, minutes: number) => void;
};

export function deriveInitialDurationParts(
  startTime: string,
  endTime: string,
): { hours: number; minutes: number } {
  if (!startTime || !endTime) {
    return { hours: 0, minutes: 0 };
  }

  const total = computeDurationMinutes(startTime, endTime);
  if (total == null) {
    return { hours: 0, minutes: 0 };
  }

  return splitDurationMinutes(total);
}

export function EventFormScheduleFields({
  values,
  durationHours,
  durationMinutes,
  disabled,
  inputClassName,
  onStartTimeChange,
  onEndTimeChange,
  onDurationChange,
}: EventFormScheduleFieldsProps) {
  const totalDurationMinutes = joinDurationParts(durationHours, durationMinutes);
  const computedDurationLabel =
    values.start_time && values.end_time
      ? formatDurationLabel(
          computeDurationMinutes(values.start_time, values.end_time) ?? 0,
        )
      : totalDurationMinutes > 0
        ? formatDurationLabel(totalDurationMinutes)
        : null;

  const handleStartChange = useCallback(
    (value: string) => {
      onStartTimeChange(value);

      if (!value.trim()) {
        return;
      }

      if (values.end_time) {
        const duration = computeDurationMinutes(value, values.end_time);
        if (duration != null) {
          const parts = splitDurationMinutes(duration);
          onDurationChange(parts.hours, parts.minutes);
        }
        return;
      }

      if (totalDurationMinutes > 0) {
        const end = computeEndTimeFromStartAndDuration(value, totalDurationMinutes);
        if (end) {
          onEndTimeChange(end);
        }
      }
    },
    [
      onDurationChange,
      onEndTimeChange,
      onStartTimeChange,
      totalDurationMinutes,
      values.end_time,
    ],
  );

  const handleEndChange = useCallback(
    (value: string) => {
      onEndTimeChange(value);

      if (values.start_time && value) {
        const duration = computeDurationMinutes(values.start_time, value);
        if (duration != null) {
          const parts = splitDurationMinutes(duration);
          onDurationChange(parts.hours, parts.minutes);
        }
      }
    },
    [onDurationChange, onEndTimeChange, values.start_time],
  );

  const handleDurationHoursChange = useCallback(
    (raw: string) => {
      const hours = Number.parseInt(raw, 10);
      const safeHours = Number.isNaN(hours) ? 0 : Math.max(0, hours);
      const nextTotal = joinDurationParts(safeHours, durationMinutes);
      onDurationChange(safeHours, durationMinutes);

      if (values.start_time && nextTotal > 0) {
        const end = computeEndTimeFromStartAndDuration(
          values.start_time,
          nextTotal,
        );
        if (end) {
          onEndTimeChange(end);
        }
      }
    },
    [durationMinutes, onDurationChange, onEndTimeChange, values.start_time],
  );

  const handleDurationMinutesChange = useCallback(
    (raw: string) => {
      const minutes = Number.parseInt(raw, 10);
      const safeMinutes = Number.isNaN(minutes)
        ? 0
        : Math.max(0, Math.min(59, minutes));
      const nextTotal = joinDurationParts(durationHours, safeMinutes);
      onDurationChange(durationHours, safeMinutes);

      if (values.start_time && nextTotal > 0) {
        const end = computeEndTimeFromStartAndDuration(
          values.start_time,
          nextTotal,
        );
        if (end) {
          onEndTimeChange(end);
        }
      }
    },
    [durationHours, onDurationChange, onEndTimeChange, values.start_time],
  );

  const handleTotalMinutesChange = useCallback(
    (raw: string) => {
      const total = Number.parseInt(raw, 10);
      const safeTotal = Number.isNaN(total) ? 0 : Math.max(0, total);
      const parts = splitDurationMinutes(safeTotal);
      onDurationChange(parts.hours, parts.minutes);

      if (values.start_time && safeTotal > 0) {
        const end = computeEndTimeFromStartAndDuration(
          values.start_time,
          safeTotal,
        );
        if (end) {
          onEndTimeChange(end);
        }
      }
    },
    [onDurationChange, onEndTimeChange, values.start_time],
  );

  const crossesMidnight =
    values.start_time &&
    values.end_time &&
    parseTimeInputToMinutes(values.end_time) != null &&
    parseTimeInputToMinutes(values.start_time) != null &&
    parseTimeInputToMinutes(values.end_time)! <=
      parseTimeInputToMinutes(values.start_time)!;

  return (
    <div className="space-y-4">
      <div className="grid gap-5 sm:grid-cols-2">
        <ScheduleField label="Hora de inicio">
          <input
            name="start_time"
            type="time"
            value={values.start_time}
            onChange={(e) => handleStartChange(e.target.value)}
            className={inputClassName}
            disabled={disabled}
          />
        </ScheduleField>

        <ScheduleField label="Hora de finalización">
          <input
            name="end_time"
            type="time"
            value={values.end_time}
            onChange={(e) => handleEndChange(e.target.value)}
            className={inputClassName}
            disabled={disabled}
          />
        </ScheduleField>
      </div>

      <div className="rounded-2xl border border-purple-400/15 bg-purple-400/5 p-4">
        <p className="text-sm font-medium text-zinc-200">Duración</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <ScheduleField label="Horas">
            <input
              type="number"
              min={0}
              value={durationHours}
              onChange={(e) => handleDurationHoursChange(e.target.value)}
              className={inputClassName}
              disabled={disabled}
              aria-label="Horas de duración"
            />
          </ScheduleField>
          <ScheduleField label="Minutos">
            <input
              type="number"
              min={0}
              max={59}
              value={durationMinutes}
              onChange={(e) => handleDurationMinutesChange(e.target.value)}
              className={inputClassName}
              disabled={disabled}
              aria-label="Minutos de duración"
            />
          </ScheduleField>
          <ScheduleField label="Total (minutos)">
            <input
              type="number"
              min={0}
              value={totalDurationMinutes}
              onChange={(e) => handleTotalMinutesChange(e.target.value)}
              className={inputClassName}
              disabled={disabled}
              aria-label="Duración total en minutos"
            />
          </ScheduleField>
        </div>

        {computedDurationLabel ? (
          <p className="mt-3 text-sm text-purple-200/90">
            Duración calculada:{" "}
            <span className="font-semibold">{computedDurationLabel}</span>
          </p>
        ) : (
          <p className="mt-3 text-xs text-zinc-500">
            Completá inicio y fin, o inicio y duración, para calcular
            automáticamente.
          </p>
        )}

        {crossesMidnight ? (
          <p className="mt-2 text-xs text-zinc-400">
            El evento finaliza al día siguiente (después de medianoche).
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ScheduleField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-zinc-300">{label}</span>
      {children}
    </label>
  );
}

export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "space-y-5 rounded-2xl border border-purple-400/15 bg-white/[0.03] p-5",
        className,
      )}
    >
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-zinc-400">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
