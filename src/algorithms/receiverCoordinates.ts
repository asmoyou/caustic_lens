// A receiver facing incoming +Z rays has local right = -X and local up = +Y.
export function receiverImageCoordinates(x: number, y: number, centerX: number, centerY: number, width: number) {
  return { u: 0.5 - (x - centerX) / width, v: 0.5 - (y - centerY) / width };
}
