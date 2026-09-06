export const reportStyles = `
* { box-sizing: border-box; letter-spacing: 0; }
html { color-scheme: light; }
body { margin: 0; background: #f4f4f6; color: #25272c; font: 13px/1.65 Inter, -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif; -webkit-font-smoothing: antialiased; }
h1, h2, h3, p, dl, dd, figure { margin: 0; }
img { display: block; max-width: 100%; }
.report-page { width: min(100%, 980px); margin: 28px auto; background: #fff; }
.report-header { background: #191b20; color: #f2f2f4; padding: 32px 40px 28px; }
.report-masthead { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 32px; }
.report-brand { display: flex; align-items: center; gap: 12px; }
.report-brand img { width: 42px; height: 42px; flex-shrink: 0; }
.report-brand strong { display: block; font-size: 22px; font-weight: 650; line-height: 1.25; }
.report-brand .brand-period { color: #dfb67d; }
.report-brand small { display: block; color: #999ca5; font-size: 9px; margin-top: 5px; }
.report-edition { color: #b69a74; font-size: 10px; text-align: right; }
.report-header h1 { font-size: 26px; line-height: 1.35; font-weight: 600; }
.report-project { margin-top: 10px; color: #b7bac3; font-size: 13px; overflow-wrap: anywhere; }
.report-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; padding: 18px 40px; border-bottom: 1px solid #e3e4e8; font-size: 11px; }
.report-meta > div { min-width: 0; display: flex; gap: 12px; }
.report-meta dt { color: #8c8f99; white-space: nowrap; }
.report-meta dd { overflow-wrap: anywhere; }
.report-body { padding: 8px 40px 32px; }
.report-section { padding: 24px 0; border-bottom: 1px solid #e3e4e8; }
.report-section:last-of-type { border-bottom: 0; }
.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
.section-heading h2 { font-size: 15px; font-weight: 600; }
.section-heading h2 span { color: #b68e54; font-size: 11px; font-weight: 500; margin-right: 10px; }
.report-status { font-size: 10px; padding: 2px 7px; color: #8b6b3e; border: 1px solid #ddd2c1; border-radius: 3px; white-space: nowrap; }
.report-status.muted { color: #81858f; border-color: #dedfe5; }
.report-images { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.image-surface { aspect-ratio: 1; background: #08090b; display: flex; align-items: center; justify-content: center; }
.image-surface img { width: 100%; height: 100%; object-fit: contain; }
.image-surface .image-empty { color: #8a8e99; font-size: 12px; padding: 24px; text-align: center; overflow-wrap: anywhere; }
.report-images figcaption { margin-top: 10px; color: #656b77; font-size: 11px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px 12px; }
.report-images figcaption small { color: #969aa4; font-size: 10px; overflow-wrap: anywhere; }
.parameter-grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 32px; }
.parameter-grid > div { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 10px 0; min-width: 0; border-bottom: 1px solid #eeeef1; }
.parameter-grid dt { color: #777c87; font-size: 11px; flex-shrink: 0; }
.parameter-grid dd { text-align: right; min-width: 0; overflow-wrap: anywhere; }
.parameter-grid strong { font-size: 12px; font-weight: 500; font-variant-numeric: tabular-nums; }
.parameter-grid small { font-size: 10px; color: #90949e; margin-left: 5px; }
.report-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 12px; }
.report-metrics > div { padding-right: 12px; border-right: 1px solid #e3e4e8; }
.report-metrics > div:last-child { border: 0; }
.report-metrics dt { color: #8b909b; font-size: 10px; margin-bottom: 6px; }
.report-metrics dd { display: flex; align-items: baseline; gap: 5px; flex-wrap: wrap; overflow-wrap: anywhere; }
.report-metrics strong { font-size: 18px; font-weight: 500; font-variant-numeric: tabular-nums; }
.report-metrics small { color: #8b909b; font-size: 10px; }
.report-note { border-left: 2px solid #c3a16e; padding: 2px 0 2px 16px; margin: 22px 0 0; color: #858a96; font-size: 11px; }
.report-note strong { display: block; color: #76654b; font-size: 11px; font-weight: 500; margin-bottom: 6px; }
.report-note p + p { margin-top: 7px; }
.report-footer { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding: 18px 40px; border-top: 1px solid #e3e4e8; color: #9a9eaa; font-size: 10px; }
@media (max-width: 680px) {
  .report-page { margin: 0; }
  .report-header { padding: 24px 22px; }
  .report-masthead { margin-bottom: 24px; gap: 10px; }
  .report-brand { gap: 9px; } .report-brand strong { font-size: 20px; } .report-brand img { width: 36px; height: 36px; }
  .report-brand small { font-size: 8px; } .report-edition { font-size: 8px; }
  .report-header h1 { font-size: 22px; } .report-project { font-size: 12px; }
  .report-meta { grid-template-columns: 1fr; padding: 16px 22px; gap: 8px; }
  .report-body { padding: 0 22px 24px; }
  .report-images { gap: 14px; }
  .parameter-grid { grid-template-columns: 1fr; }
  .report-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
  .report-metrics > div:nth-child(2) { border-right: 0; }
  .report-footer { padding: 16px 22px; }
}
@media (max-width: 380px) {
  .report-header { padding: 22px 16px; } .report-edition { display: none; }
  .report-meta, .report-footer { padding-inline: 16px; } .report-body { padding-inline: 16px; }
  .report-images { grid-template-columns: 1fr; gap: 20px; }
  .section-heading h2 { font-size: 14px; }
}
@page { size: A4; margin: 12mm; }
@media print {
  html, body { background: #fff; }
  body { font-size: 10pt; }
  .report-page { width: 100%; margin: 0; }
  .report-header { background: #fff; color: #25272c; padding: 0 0 6mm; border-bottom: 2px solid #b68e54; }
  .report-brand small, .report-project { color: #707681; }
  .report-header h1 { font-size: 20pt; }
  .report-meta { padding: 5mm 0; }
  .report-body { padding: 0; }
  .report-section { padding: 6mm 0; break-inside: avoid; }
  .report-masthead { margin-bottom: 6mm; }
  .report-images { grid-template-columns: 1fr 1fr; gap: 6mm; }
  .image-surface { width: 68mm; max-width: 100%; height: 68mm; max-height: 68mm; margin-inline: auto; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .parameter-grid { grid-template-columns: 1fr 1fr; column-gap: 8mm; }
  .parameter-grid > div { padding: 2.5mm 0; }
  .report-metrics { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .report-note, .report-metrics, .report-meta { break-inside: avoid; }
  .report-footer { padding: 5mm 0 0; }
}
`;
