import { ImageData, ImageProcessingResult, Contour, Point2D } from '../../types';

export class ImageProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  async processImage(imageData: ImageData): Promise<ImageProcessingResult> {
    const img = new Image();
    img.src = imageData.url;
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        try {
          this.canvas.width = img.width;
          this.canvas.height = img.height;
          this.ctx.drawImage(img, 0, 0);
          
          const result = this.analyzeImage();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = reject;
    });
  }

  private analyzeImage(): ImageProcessingResult {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const grayscale = this.toGrayscale(imageData);
    const edges = this.detectEdges(grayscale);
    const contours = this.findContours(edges);
    const targetShape = this.extractTargetShape(contours);

    return {
      edges,
      contours,
      targetShape,
    };
  }

  private toGrayscale(imageData: ImageData): number[][] {
    const { width, height, data } = imageData;
    const grayscale: number[][] = [];

    for (let y = 0; y < height; y++) {
      grayscale[y] = [];
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        grayscale[y][x] = gray;
      }
    }

    return grayscale;
  }

  private detectEdges(grayscale: number[][]): number[][] {
    const height = grayscale.length;
    const width = grayscale[0].length;
    const edges: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));

    // Sobel edge detection
    const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixel = grayscale[y + ky][x + kx];
            gx += pixel * sobelX[ky + 1][kx + 1];
            gy += pixel * sobelY[ky + 1][kx + 1];
          }
        }
        
        edges[y][x] = Math.sqrt(gx * gx + gy * gy);
      }
    }

    return edges;
  }

  private findContours(edges: number[][]): Contour[] {
    const contours: Contour[] = [];
    const threshold = 50;
    const visited: boolean[][] = edges.map(row => row.map(() => false));

    for (let y = 0; y < edges.length; y++) {
      for (let x = 0; x < edges[y].length; x++) {
        if (edges[y][x] > threshold && !visited[y][x]) {
          const contour = this.traceContour(edges, visited, x, y, threshold);
          if (contour.points.length > 10) {
            contours.push(contour);
          }
        }
      }
    }

    return contours;
  }

  private traceContour(edges: number[][], visited: boolean[][], startX: number, startY: number, threshold: number): Contour {
    const points: Point2D[] = [];
    const stack: Point2D[] = [{ x: startX, y: startY }];

    while (stack.length > 0) {
      const { x, y } = stack.pop()!;
      
      if (x < 0 || x >= edges[0].length || y < 0 || y >= edges.length || 
          visited[y][x] || edges[y][x] <= threshold) {
        continue;
      }

      visited[y][x] = true;
      points.push({ x, y });

      // 检查8邻域
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          stack.push({ x: x + dx, y: y + dy });
        }
      }
    }

    const area = this.calculateArea(points);
    const perimeter = this.calculatePerimeter(points);

    return { points, area, perimeter };
  }

  private calculateArea(points: Point2D[]): number {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y - points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
  }

  private calculatePerimeter(points: Point2D[]): number {
    let perimeter = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const dx = points[j].x - points[i].x;
      const dy = points[j].y - points[i].y;
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    return perimeter;
  }

  private extractTargetShape(contours: Contour[]): number[][] {
    // 使用512x512分辨率匹配Julia实现
    const resolution = 512;
    
    // 直接从原始图像创建灰度强度矩阵（匹配Julia实现）
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const grayscale = this.toGrayscaleMatrix(imageData, resolution);
    
    // 应用Julia中的能量归一化
    const normalizedImage = this.normalizeImageEnergy(grayscale, resolution);
    
    return normalizedImage;
  }
  
  private toGrayscaleMatrix(imageData: ImageData, targetResolution: number): number[][] {
    const { width, height, data } = imageData;
    const matrix: number[][] = [];
    
    // 缩放到目标分辨率
    const scaleX = width / targetResolution;
    const scaleY = height / targetResolution;
    
    for (let y = 0; y < targetResolution; y++) {
      matrix[y] = [];
      for (let x = 0; x < targetResolution; x++) {
        const srcX = Math.floor(x * scaleX);
        const srcY = Math.floor(y * scaleY);
        const i = (srcY * width + srcX) * 4;
        
        // 转换为灰度（匹配Julia的Gray转换）
        const gray = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255.0;
        matrix[y][x] = gray;
      }
    }
    
    return matrix;
  }
  
  private normalizeImageEnergy(image: number[][], resolution: number): number[][] {
    // 计算图像总和
    let imageSum = 0;
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        imageSum += image[y][x];
      }
    }
    
    // 网格总面积（匹配Julia实现）
    const meshSum = resolution * resolution;
    
    // 计算增强比例（匹配Julia的boost_ratio）
    const boostRatio = imageSum > 0 ? meshSum / imageSum : 1.0;
    
    // 应用增强比例
    const normalizedImage: number[][] = [];
    for (let y = 0; y < resolution; y++) {
      normalizedImage[y] = [];
      for (let x = 0; x < resolution; x++) {
        normalizedImage[y][x] = image[y][x] * boostRatio;
      }
    }
    
    console.log(`图像归一化: 原始总和=${imageSum.toFixed(4)}, 网格总和=${meshSum}, 增强比例=${boostRatio.toFixed(4)}`);
    
    return normalizedImage;
  }
  
  private fillContourInterior(shape: number[][], resolution: number): void {
    // 使用扫描线算法填充轮廓内部
    for (let y = 0; y < resolution; y++) {
      let inside = false;
      for (let x = 0; x < resolution; x++) {
        if (shape[y][x] === 1.0) {
          inside = !inside;
        } else if (inside) {
          shape[y][x] = 1.0;
        }
      }
    }
  }
}