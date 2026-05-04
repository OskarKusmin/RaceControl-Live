import { useEffect } from "react";

export const formatTime = (ms) => {
  if (!ms) return '—';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const cents   = Math.floor((ms % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(cents).padStart(2, '0')}`;
};

export const useDocumentTitle = (title) => {
  useEffect(() => {
    document.title = title ? `${title} (RaceControl Live)` : 'RaceControl Live';
  });
}

export const buildCarsFromState = (session, lapData) =>
  session?.drivers.map((driver, index) => {
    const stored = lapData[driver.id];
    return {
      id:         driver.id,
      name:       driver.name,
      carNumber:  `${index + 1}`,
      startTime:  stored?.startTime ?? null,
      frozenTime: stored?.frozenTime ?? 0,
      lapTimes:   stored?.lapTimes || [],
    };
  }) ?? [];