import { CausticParameters, ImageData, LensGeometry } from '../types';
import { CausticsEngineeringGenerator } from './causticsEngineering';

/**
 * 主要的焦散引擎类，连接图像处理和透镜生成
 */
export class CausticEngine {
  private parameters: CausticParameters;
  private generator: CausticsEngineeringGenerator;

  constructor(parameters: CausticParameters) {
    this.parameters = parameters;
    this.generator = new CausticsEngineeringGenerator(parameters);
  }

  /**
   * 生成透镜几何体
   */
  async generateLensGeometry(
    targetShape: number[][],
    onProgress?: (progress: number, status: string) => void,
    options?: {
      useGPUAcceleration?: boolean;
      photonMapSize?: number;
    }
  ): Promise<LensGeometry> {
    // 将目标形状转换为ImageData格式
    const imageData: ImageData = {
      url: '', // 不需要URL，直接使用数据
      name: 'target_shape',
      data: targetShape
    };

    // 使用CausticsEngineeringGenerator生成透镜
    return await this.generator.generateLens(imageData, onProgress);
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
    this.parameters = parameters;
    this.generator = new CausticsEngineeringGenerator(parameters);
  }
}