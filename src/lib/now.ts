export const countdownText = (from: Date, to: Date): string => {
  const deltaMin = Math.floor((to.getTime() - from.getTime()) / 60_000);
  if (deltaMin < 1) return 'em menos de 1min';
  if (deltaMin < 60) return `em ${deltaMin}min`;
  const h = Math.floor(deltaMin / 60);
  const m = deltaMin % 60;
  return `em ${h}h ${m}min`;
};
