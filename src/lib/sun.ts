import SunCalc from 'suncalc';

export const getSunTimes = (
  date: string,
  port: { lat: number; lon: number },
): { sunrise: Date; sunset: Date } => {
  const noon = new Date(`${date}T12:00:00Z`);
  const t = SunCalc.getTimes(noon, port.lat, port.lon);
  return { sunrise: t.sunrise, sunset: t.sunset };
};
