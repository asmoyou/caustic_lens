import type { CausticParameters, LensGeometry } from '../types';
import { CausticsEngineeringGenerator } from './causticsEngineering';

/**
 * 主要的焦散引擎类，连接图像处理和透镜生成
 */
export class CausticEngine {
  private generator: CausticsEngineeringGenerator;

  constructor(parameters: CausticParameters) {
    this.generator = new CausticsEngineeringGenerator(parameters);
  }

  /**
   * 生成透镜几何体
   */
  async generateLensGeometry(
    targetShape: number[][],
    onProgress?: (progress: number, status: string) => void
  ): Promise<LensGeometry> {
    return await this.generator.generateLens({ data: targetShape }, onProgress);
  }

  /**
   * 停止生成过程
   */
  stop(): void {
    this.generator.stop();
  }

  /**
   * 检查是否正在生成
   */
  isGenerating(): boolean {
    return this.generator.isGenerating();
  }

  /**
   * 更新参数
   */
  updateParameters(parameters: CausticParameters): void {
    this.generator.stop();
    this.generator = new CausticsEngineeringGenerator(parameters);
  }
}
