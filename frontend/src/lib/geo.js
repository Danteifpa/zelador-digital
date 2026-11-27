// Geografia do app: centro da cidade (da marca, ver lib/marca.js) e distâncias.

import { MARCA } from './marca'

export const CENTRO_COMUNITARIO = {
  latitude: MARCA.latitude,
  longitude: MARCA.longitude,
  raioMaximoKm: MARCA.raioKm,
  nome: MARCA.cidade
}

export function distanciaMetros(a, b) {
  if (![a.latitude, a.longitude, b.latitude, b.longitude].every((valor) => Number.isFinite(Number(valor)))) return Infinity
  const raioTerra = 6371000
  const latitudeA = (Number(a.latitude) * Math.PI) / 180
  const latitudeB = (Number(b.latitude) * Math.PI) / 180
  const deltaLatitude = ((Number(b.latitude) - Number(a.latitude)) * Math.PI) / 180
  const deltaLongitude = ((Number(b.longitude) - Number(a.longitude)) * Math.PI) / 180
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(deltaLongitude / 2) ** 2
  return 2 * raioTerra * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

// Fórmula Haversine para cálculo de distância em km
export function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
