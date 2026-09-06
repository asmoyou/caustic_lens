export function normalizeTarget(rows: number[][]): number[][] {
  const width = rows[0]?.length ?? 0;
  if (rows.length < 2 || width < 2 || rows.some(row => row.length !== width)) {
    throw new Error('目标图像必须为至少 2 x 2 的规则矩阵');
  }
  let sum = 0;
  for (const row of rows) {
    for (const value of row) {
      if (!Number.isFinite(value) || value < 0) throw new Error('目标图像包含无效亮度');
      sum += value;
    }
  }
  if (!Number.isFinite(sum) || sum <= 0) throw new Error('图像没有有效亮度，请选择包含明亮图案的图片');
  const scale = rows.length * width / sum;
  return rows.map(row => row.map(value => value * scale));
}

export function triangleCollapseTimes(
  x1: number, y1: number, x2: number, y2: number,
  u1: number, v1: number, u2: number, v2: number,
): [number, number] {
  // Expand det(edge1 + t * velocity1, edge2 + t * velocity2).
  const a = u1 * v2 - u2 * v1;
  const b = x1 * v2 + u1 * y2 - x2 * v1 - u2 * y1;
  const c = x1 * y2 - x2 * y1;
  if (Math.abs(a) < 1e-12) {
    const root = Math.abs(b) < 1e-12 ? Infinity : -c / b;
    return [root, root];
  }
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [Infinity, Infinity];
  const sqrt = Math.sqrt(discriminant);
  const q = -0.5 * (b + (b >= 0 ? sqrt : -sqrt));
  return q === 0 ? [0, 0] : [q / a, c / q];
}
