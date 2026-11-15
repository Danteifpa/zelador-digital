// Lê a localização GPS gravada dentro da foto (EXIF), sem bibliotecas externas.

// Extração EXIF de coordenadas GPS
export function extrairGpsExif(arquivo) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = function (e) {
      const buffer = e.target.result
      const dataView = new DataView(buffer)

      if (dataView.getUint16(0, false) !== 0xffd8) return resolve(null)

      let offset = 2
      const length = dataView.byteLength

      while (offset < length) {
        if (dataView.getUint8(offset) !== 0xff) return resolve(null)
        const marker = dataView.getUint8(offset + 1)

        if (marker === 0xe1) {
          const exifOffset = offset + 4
          if (dataView.getUint32(exifOffset, false) === 0x45786966) {
            return resolve(analisarTiffGps(dataView, exifOffset + 6))
          }
        }
        offset += 2 + dataView.getUint16(offset + 2, false)
      }
      resolve(null)
    }
    reader.onerror = () => resolve(null)
    reader.readAsArrayBuffer(arquivo.slice(0, 131072))
  })
}

function analisarTiffGps(view, tiffOffset) {
  try {
    const isLittleEndian = view.getUint16(tiffOffset, false) === 0x4949
    const firstIFDOffset = view.getUint32(tiffOffset + 4, isLittleEndian)
    const numEntries = view.getUint16(tiffOffset + firstIFDOffset, isLittleEndian)

    let gpsInfoOffset = null

    for (let i = 0; i < numEntries; i++) {
      const entryOffset = tiffOffset + firstIFDOffset + 2 + i * 12
      const tag = view.getUint16(entryOffset, isLittleEndian)
      if (tag === 0x8825) {
        gpsInfoOffset = view.getUint32(entryOffset + 8, isLittleEndian)
        break
      }
    }

    if (!gpsInfoOffset) return null

    const gpsEntries = view.getUint16(tiffOffset + gpsInfoOffset, isLittleEndian)
    let lat = null, latRef = 'N', lng = null, lngRef = 'W'

    for (let i = 0; i < gpsEntries; i++) {
      const entryOffset = tiffOffset + gpsInfoOffset + 2 + i * 12
      const tag = view.getUint16(entryOffset, isLittleEndian)

      if (tag === 1) latRef = String.fromCharCode(view.getUint8(entryOffset + 8))
      if (tag === 2) lat = lerRacionaisGps(view, tiffOffset + view.getUint32(entryOffset + 8, isLittleEndian), isLittleEndian)
      if (tag === 3) lngRef = String.fromCharCode(view.getUint8(entryOffset + 8))
      if (tag === 4) lng = lerRacionaisGps(view, tiffOffset + view.getUint32(entryOffset + 8, isLittleEndian), isLittleEndian)
    }

    if (lat !== null && lng !== null) {
      let finalLat = lat[0] + lat[1] / 60 + lat[2] / 3600
      let finalLng = lng[0] + lng[1] / 60 + lng[2] / 3600
      if (latRef === 'S') finalLat = -finalLat
      if (lngRef === 'W') finalLng = -finalLng
      return { latitude: finalLat, longitude: finalLng }
    }
  } catch {
    console.warn('Metadados EXIF GPS não encontrados')
  }
  return null
}

function lerRacionaisGps(view, offset, isLittleEndian) {
  const dNum = view.getUint32(offset, isLittleEndian)
  const dDen = view.getUint32(offset + 4, isLittleEndian)
  const mNum = view.getUint32(offset + 8, isLittleEndian)
  const mDen = view.getUint32(offset + 12, isLittleEndian)
  const sNum = view.getUint32(offset + 16, isLittleEndian)
  const sDen = view.getUint32(offset + 20, isLittleEndian)
  return [dNum / (dDen || 1), mNum / (mDen || 1), sNum / (sDen || 1)]
}
