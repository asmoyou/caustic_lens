import type { ReportData } from './reportGenerator';
import { reportStyles } from './reportStyles';

export function escapeHTML(value: string): string {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return value.replace(/[&<>"']/g, character => entities[character]);
}

function parameter(label: string, value: string | number, unit = ''): string {
  return `<div><dt>${escapeHTML(label)}</dt><dd><strong>${escapeHTML(String(value))}</strong>${unit ? `<small>${escapeHTML(unit)}</small>` : ''}</dd></div>`;
}

export function renderReport(data: ReportData): string {
  const { parameters: p, statistics: s, image, projection } = data;
  const { size, min } = s.bounds;
  const materialNames: Record<string, string> = { acrylic: '亚克力 (PMMA)', glass: '玻璃', polycarbonate: '聚碳酸酯 (PC)', pmma: '有机玻璃 (PMMA)' };
  const sourceNames = { parallel: '平行白光', point: '理想点光源', area: '面光源（未支持）' };
  const projectionReady = projection?.status === 'success' && !!projection.imageData;
  const projectionStatus = projectionReady ? '投影已完成' : projection?.status === 'processing' ? '投影计算中' : projection?.status === 'error' ? '投影未完成' : '尚无投影结果';
  const screenWidth = projectionReady ? projection.statistics?.screenWidth ?? p.receiverWidth : p.receiverWidth;
  const brandLogo = data.logoDataUrl ? `<img src="${escapeHTML(data.logoDataUrl)}" alt="" width="42" height="42">` : '';
  const optical = [
    parameter('透镜材料', materialNames[p.material] ?? p.material), parameter('算法焦距', p.focalLengthMeters.toFixed(2), 'm'),
    parameter('折射率', p.refractiveIndex.toFixed(3)), parameter('网格分辨率', `${p.resolution} x ${p.resolution}`),
    parameter('迭代次数', p.optimization.iterations ?? 4), parameter('收敛阈值', (p.optimization.tolerance ?? 0.00001).toExponential(2)),
    parameter('松弛因子', (p.optimization.relaxationFactor ?? 1.99).toFixed(2)), parameter('计算耗时', s.processingTime.toFixed(2), 's'),
  ].join('');
  const illumination = [
    parameter('仿真光源', sourceNames[p.lightSource.type]), parameter('逆向设计光源', '平行光'),
    parameter('相对光强', p.lightSource.intensity.toFixed(2)), parameter('投影距离', p.targetDistance.toFixed(1), 'mm'),
    parameter('接收屏宽度', screenWidth === undefined ? '自动估计（未计算）' : screenWidth.toFixed(1), screenWidth === undefined ? '' : 'mm'),
    parameter('接收范围', p.receiverWidth === undefined ? '自动' : '手动'),
    ...(p.lightSource.type === 'point' ? [
      parameter('光源到入射面', (min.z - p.lightSource.position.z).toFixed(1), 'mm'),
      parameter('光源 X', p.lightSource.position.x.toFixed(1), 'mm'),
      parameter('光源 Y', p.lightSource.position.y.toFixed(1), 'mm'),
      parameter('光源 Z', p.lightSource.position.z.toFixed(1), 'mm'),
    ] : []),
    ...(projectionReady && projection.statistics ? [
      parameter('接收样本 / 总样本', `${projection.statistics.receivedRays.toLocaleString('zh-CN')} / ${projection.statistics.tracedRays.toLocaleString('zh-CN')}`),
      parameter('全内反射样本', projection.statistics.totalInternalReflections.toLocaleString('zh-CN')),
      parameter('投影计算耗时', (projection.renderTime / 1000).toFixed(2), 's'),
      ...(projection.statistics.peakIrradiance === undefined ? [] : [parameter('峰值相对照度', projection.statistics.peakIrradiance.toFixed(3))]),
    ] : []),
  ].join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>焦散透镜设计报告 - ${escapeHTML(data.projectName)}</title>
  <style>${reportStyles}</style>
</head>
<body>
  <main class="report-page">
    <header class="report-header">
      <div class="report-masthead">
        <div class="report-brand">${brandLogo}<div><strong>Caustic Lens<span class="brand-period">.</span></strong><small>光学设计工作室 / OPTICS STUDIO</small></div></div>
        <div class="report-edition">DESIGN REPORT<br>光学设计记录</div>
      </div>
      <h1>焦散透镜设计报告</h1>
      <p class="report-project">${escapeHTML(data.projectName)}</p>
    </header>
    <dl class="report-meta">
      <div><dt>生成时间</dt><dd>${escapeHTML(data.generatedAt.toLocaleString('zh-CN'))}</dd></div>
      <div><dt>源文件</dt><dd>${escapeHTML(image.name)}</dd></div>
      <div><dt>图像尺寸</dt><dd>${image.width ?? '-'} x ${image.height ?? '-'} px</dd></div>
      <div><dt>记录状态</dt><dd>模型已生成 / ${projectionStatus}</dd></div>
    </dl>
    <div class="report-body">
      <section class="report-section" aria-labelledby="preview-heading">
        <div class="section-heading"><h2 id="preview-heading"><span>01</span>图像与投影</h2><span class="report-status ${projectionReady ? '' : 'muted'}">${projectionStatus}</span></div>
        <div class="report-images">
          <figure><div class="image-surface"><img src="${escapeHTML(image.url)}" alt="源图像"></div><figcaption>目标图像<small>${image.width ?? '-'} x ${image.height ?? '-'} px</small></figcaption></figure>
          <figure><div class="image-surface">${projectionReady ? `<img src="${escapeHTML(projection.imageData)}" alt="焦散投影（受光面）">` : `<span class="image-empty">${projectionStatus}</span>`}</div><figcaption>焦散投影 · 受光面<small>${projectionReady ? `${p.targetDistance.toFixed(0)} mm` : '未附投影图像'}</small></figcaption></figure>
        </div>
      </section>
      <section class="report-section" aria-labelledby="design-heading">
        <div class="section-heading"><h2 id="design-heading"><span>02</span>光学与计算参数</h2></div>
        <dl class="parameter-grid">${optical}</dl>
      </section>
      <section class="report-section" aria-labelledby="source-heading">
        <div class="section-heading"><h2 id="source-heading"><span>03</span>光源与接收屏</h2></div>
        <dl class="parameter-grid">${illumination}</dl>
      </section>
      <section class="report-section" aria-labelledby="geometry-heading">
        <div class="section-heading"><h2 id="geometry-heading"><span>04</span>模型统计</h2></div>
        <dl class="report-metrics">
          ${parameter('顶点', s.vertexCount.toLocaleString('zh-CN'))}${parameter('三角面片', s.faceCount.toLocaleString('zh-CN'))}
          ${parameter('表面积', s.surfaceArea.toFixed(2), 'mm²')}${parameter('体积', s.volume.toFixed(3), 'mm³')}
        </dl>
        <dl class="parameter-grid">${parameter('透镜宽度', size.x.toFixed(2), 'mm')}${parameter('透镜高度', size.y.toFixed(2), 'mm')}${parameter('模型厚度', size.z.toFixed(3), 'mm')}</dl>
      </section>
      <aside class="report-note"><strong>几何光学近似</strong>
        <p>投影来自当前网格的双界面折射和落点照度统计，图像亮度为相对照度的显示映射。未模拟衍射、色散、菲涅耳损耗、吸收及多次内部反射，细条纹可能来自网格与采样误差。</p>
        <p>透镜逆向设计按平行光计算；切换点光源会对现有模型重新仿真，不代表模型已针对点光源优化。光学精度与加工效果仍需实物验证。</p>
      </aside>
    </div>
    <footer class="report-footer"><span>小白客 / Caustic Lens Designer</span><span>DESIGN / SIMULATION / GEOMETRY</span></footer>
  </main>
</body>
</html>`;
}
