export type Port = {
  slug: string;
  name: string;
  lat: number;
  lon: number;
};

export const ports: Port[] = [
  { slug: 'viana-do-castelo', name: 'Viana do Castelo', lat: 41.6918, lon: -8.8344 },
  { slug: 'leixoes', name: 'Leixões', lat: 41.1839, lon: -8.7036 },
  { slug: 'aveiro', name: 'Aveiro', lat: 40.6443, lon: -8.7400 },
  { slug: 'figueira-da-foz', name: 'Figueira da Foz', lat: 40.1506, lon: -8.8636 },
  { slug: 'peniche', name: 'Peniche', lat: 39.3558, lon: -9.3811 },
  { slug: 'cascais', name: 'Cascais', lat: 38.6968, lon: -9.4215 },
  { slug: 'lisboa', name: 'Lisboa', lat: 38.7077, lon: -9.1366 },
  { slug: 'sines', name: 'Sines', lat: 37.9558, lon: -8.8694 },
  { slug: 'lagos', name: 'Lagos', lat: 37.1028, lon: -8.6731 },
  { slug: 'faro', name: 'Faro', lat: 37.0146, lon: -7.9333 },
  { slug: 'vila-real-santo-antonio', name: 'Vila Real de Santo António', lat: 37.1948, lon: -7.4156 },
];

export const portBySlug = new Map(ports.map((p) => [p.slug, p]));

export const getPort = (slug: string): Port | undefined => portBySlug.get(slug);
