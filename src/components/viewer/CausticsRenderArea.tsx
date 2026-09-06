import { Button, Image, Popconfirm, Spin, Tag, Tooltip } from 'antd';
import { ClearOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import { useProjectStore } from '../../stores/projectStore';

export function CausticsRenderArea() {
  const { causticsRenderResults: results, deleteCausticsRenderResult, clearCausticsRenderResults } = useProjectStore();
  return <section className="projection-results">
    <div className="section-heading"><h2>焦散投影 <span>{results.length.toString().padStart(2, '0')}</span></h2>
      {results.length > 0 && <Popconfirm title="清空全部投影结果？" onConfirm={clearCausticsRenderResults}>
        <Tooltip title="清空结果"><Button type="text" aria-label="清空结果" icon={<ClearOutlined />}
          disabled={results.some(result => result.status === 'processing')} /></Tooltip></Popconfirm>}
    </div>
    {results.length === 0 ? <div className="results-empty"><div className="empty-projection" /><span>暂无投影结果</span></div> :
      <div className="result-grid"><Image.PreviewGroup>{[...results].reverse().map((result, index) => <article className="projection-result" key={result.id}>
        <div className="result-image">{result.status === 'processing' ? <Spin /> : result.status === 'error' ?
          <span className="result-error">{result.errorMessage}</span> : <Image src={result.imageData} alt={`焦散投影 ${results.length - index}`} />}</div>
        <div className="result-details"><div className="result-title"><strong>投影 {String(results.length - index).padStart(2, '0')}</strong>
          <Tag color={result.status === 'success' ? 'success' : result.status === 'error' ? 'error' : 'processing'}>
            {result.status === 'success' ? '完成' : result.status === 'error' ? '失败' : '计算中'}</Tag></div>
          <span>{result.parameters.targetDistance} mm · {(result.renderTime / 1000).toFixed(2)} s</span>
          {result.statistics && <span>接收光线 {result.statistics.receivedRays.toLocaleString()} / {result.statistics.tracedRays.toLocaleString()}</span>}
          <div className="result-bottom"><time>{new Date(result.timestamp).toLocaleTimeString('zh-CN')}</time><div>
            <Tooltip title="下载投影"><Button type="text" aria-label="下载投影" icon={<DownloadOutlined />} disabled={result.status !== 'success'}
              href={result.imageData || undefined} download={`caustics-${result.id}.png`} /></Tooltip>
            <Tooltip title="删除投影"><Button type="text" aria-label="删除投影" icon={<DeleteOutlined />} disabled={result.status === 'processing'}
              onClick={() => deleteCausticsRenderResult(result.id)} /></Tooltip>
          </div></div>
        </div>
      </article>)}</Image.PreviewGroup></div>}
  </section>;
}
