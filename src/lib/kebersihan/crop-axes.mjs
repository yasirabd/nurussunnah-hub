const EPSILON = 0.001

export function positionAxes(imgW, imgH, boxW, boxH, zoom = 1) {
  if (!(imgW > 0) || !(imgH > 0) || !(boxW > 0) || !(boxH > 0)) {
    return { x: false, y: false }
  }

  // object-fit: cover scales by the larger ratio, then transform: scale(zoom)
  const cover = Math.max(boxW / imgW, boxH / imgH) * (zoom || 1)
  const renderedW = imgW * cover
  const renderedH = imgH * cover

  return {
    x: renderedW - boxW > EPSILON,
    y: renderedH - boxH > EPSILON,
  }
}
