import { MemoryRequirement } from './memoryCalculator';
import gpuData from '../config/gpus.json';

export interface GPUInfo {
  id: string;
  name: string;
  memory: number;
  memory_bandwidth: number;
  compute_capability: string;
  price_range: string;
  power_consumption: number;
  category: string;
  recommended_for: string[];
}

export interface GPURecommendation {
  gpu: GPUInfo;
  suitability: 'perfect' | 'good' | 'marginal' | 'insufficient';
  utilizationRate: number; // 显存利用率
  reasons: string[];
  warnings: string[];
}

export interface RecommendationResult {
  recommended: GPURecommendation[];
  budget: GPURecommendation[];
  professional: GPURecommendation[];
  multiGpu?: {
    gpuCount: number;
    totalMemory: number;
    recommendations: GPURecommendation[];
  };
}

/**
 * 评估GPU适用性
 */
function evaluateGPUSuitability(
  gpu: GPUInfo,
  memoryReq: MemoryRequirement,
  isTraining: boolean
): GPURecommendation {
  const requiredMemory = isTraining ? memoryReq.training : memoryReq.inference;
  const utilizationRate = (requiredMemory / gpu.memory) * 100;
  
  let suitability: 'perfect' | 'good' | 'marginal' | 'insufficient';
  const reasons: string[] = [];
  const warnings: string[] = [];
  
  // 判断适用性
  if (utilizationRate > 100) {
    suitability = 'insufficient';
    reasons.push(`显存不足：需要${requiredMemory.toFixed(1)}GB，仅有${gpu.memory}GB`);
  } else if (utilizationRate > 90) {
    suitability = 'marginal';
    reasons.push(`显存紧张：利用率${utilizationRate.toFixed(1)}%`);
    warnings.push('显存利用率过高，可能影响性能稳定性');
  } else if (utilizationRate > 70) {
    suitability = 'good';
    reasons.push(`显存充足：利用率${utilizationRate.toFixed(1)}%`);
  } else {
    suitability = 'perfect';
    reasons.push(`显存充裕：利用率${utilizationRate.toFixed(1)}%`);
  }
  
  // 添加性能相关评估
  if (gpu.compute_capability) {
    const cc = parseFloat(gpu.compute_capability);
    if (cc >= 8.0) {
      reasons.push('支持最新计算特性');
    } else if (cc >= 7.0) {
      reasons.push('支持现代计算特性');
    } else {
      warnings.push('计算能力较老，可能不支持某些优化');
    }
  }
  
  // 功耗评估
  if (gpu.power_consumption > 400) {
    warnings.push(`功耗较高：${gpu.power_consumption}W`);
  }
  
  // 价格评估
  const priceRange = gpu.price_range.split('-');
  const avgPrice = (parseInt(priceRange[0]) + parseInt(priceRange[1])) / 2;
  if (avgPrice > 50000) {
    reasons.push('专业级显卡，性能强劲');
  } else if (avgPrice > 10000) {
    reasons.push('高端显卡，性价比良好');
  } else {
    reasons.push('性价比优秀');
  }
  
  return {
    gpu,
    suitability,
    utilizationRate: Math.round(utilizationRate * 100) / 100,
    reasons,
    warnings
  };
}

/**
 * 获取GPU推荐
 */
export function getGPURecommendations(
  memoryReq: MemoryRequirement,
  isTraining: boolean = false
): RecommendationResult {
  const gpus: GPUInfo[] = gpuData.gpus;
  
  // 评估所有GPU
  const evaluations = gpus.map(gpu => 
    evaluateGPUSuitability(gpu, memoryReq, isTraining)
  );
  
  // 过滤出可用的GPU（显存足够）
  const suitable = evaluations.filter(item => item.suitability !== 'insufficient');
  
  // 按适用性和性价比排序
  const sortBySuitability = (a: GPURecommendation, b: GPURecommendation) => {
    const suitabilityOrder = { 'perfect': 4, 'good': 3, 'marginal': 2, 'insufficient': 1 };
    const aSuit = suitabilityOrder[a.suitability];
    const bSuit = suitabilityOrder[b.suitability];
    
    if (aSuit !== bSuit) return bSuit - aSuit;
    
    // 相同适用性下，按利用率排序（70-85%为最佳）
    const aScore = Math.abs(a.utilizationRate - 77.5);
    const bScore = Math.abs(b.utilizationRate - 77.5);
    return aScore - bScore;
  };
  
  suitable.sort(sortBySuitability);
  
  // 分类推荐
  const recommended = suitable.slice(0, 3); // 前3个最佳推荐
  
  const budget = suitable.filter(item => {
    const priceRange = item.gpu.price_range.split('-');
    const avgPrice = (parseInt(priceRange[0]) + parseInt(priceRange[1])) / 2;
    return avgPrice < 8000 && item.suitability !== 'insufficient';
  }).slice(0, 3);
  
  const professional = suitable.filter(item => 
    item.gpu.category.includes('专业') || item.gpu.memory >= 40
  ).slice(0, 3);
  
  // 多卡推荐（当单卡显存不足时）
  let multiGpu;
  const requiredMemory = isTraining ? memoryReq.training : memoryReq.inference;
  if (suitable.length === 0 || suitable[0].utilizationRate > 90) {
    // 寻找合适的多卡方案
    const midRangeGPUs = gpus.filter(gpu => {
      const priceRange = gpu.price_range.split('-');
      const avgPrice = (parseInt(priceRange[0]) + parseInt(priceRange[1])) / 2;
      return avgPrice < 20000 && gpu.memory >= 12;
    });
    
    if (midRangeGPUs.length > 0) {
      const bestMidRange = midRangeGPUs[0];
      const gpuCount = Math.ceil(requiredMemory / bestMidRange.memory);
      const totalMemory = gpuCount * bestMidRange.memory;
      
      multiGpu = {
        gpuCount,
        totalMemory,
        recommendations: [{
          gpu: bestMidRange,
          suitability: 'good' as const,
          utilizationRate: (requiredMemory / totalMemory) * 100,
          reasons: [`${gpuCount}卡并行，总显存${totalMemory}GB`],
          warnings: ['需要支持多卡并行的框架']
        }]
      };
    }
  }
  
  return {
    recommended,
    budget,
    professional,
    multiGpu
  };
}

/**
 * 获取特定用途的GPU推荐
 */
export function getGPUByUseCase(
  useCase: 'inference' | 'training' | 'development',
  memoryReq: MemoryRequirement
): GPURecommendation[] {
  const gpus: GPUInfo[] = gpuData.gpus;
  const isTraining = useCase === 'training';
  
  let filteredGPUs = gpus;
  
  // 根据用途过滤
  switch (useCase) {
    case 'inference':
      // 推理优先考虑性价比
      filteredGPUs = gpus.filter(gpu => 
        !gpu.category.includes('专业') || gpu.memory <= 24
      );
      break;
    case 'training':
      // 训练需要更多显存和计算能力
      filteredGPUs = gpus.filter(gpu => {
        const cc = parseFloat(gpu.compute_capability || '0');
        return cc >= 7.0 && gpu.memory >= 16;
      });
      break;
    case 'development':
      // 开发环境平衡性价比和性能
      filteredGPUs = gpus.filter(gpu => {
        const priceRange = gpu.price_range.split('-');
        const avgPrice = (parseInt(priceRange[0]) + parseInt(priceRange[1])) / 2;
        return avgPrice < 15000 && gpu.memory >= 12;
      });
      break;
  }
  
  return filteredGPUs
    .map(gpu => evaluateGPUSuitability(gpu, memoryReq, isTraining))
    .filter(item => item.suitability !== 'insufficient')
    .sort((a, b) => {
      const suitabilityOrder = { 'perfect': 4, 'good': 3, 'marginal': 2, 'insufficient': 1 };
      return suitabilityOrder[b.suitability] - suitabilityOrder[a.suitability];
    })
    .slice(0, 5);
}

/**
 * 计算多卡配置
 */
export function calculateMultiGPUConfig(
  memoryReq: MemoryRequirement,
  targetGPU: GPUInfo,
  isTraining: boolean = false
): {
  gpuCount: number;
  totalMemory: number;
  utilizationRate: number;
  estimatedSpeedup: number;
  warnings: string[];
} {
  const requiredMemory = isTraining ? memoryReq.training : memoryReq.inference;
  const gpuCount = Math.ceil(requiredMemory / targetGPU.memory);
  const totalMemory = gpuCount * targetGPU.memory;
  const utilizationRate = (requiredMemory / totalMemory) * 100;
  
  // 估算加速比（考虑通信开销）
  let estimatedSpeedup = gpuCount;
  if (gpuCount > 1) {
    // 多卡效率递减
    const efficiency = Math.max(0.7, 1 - (gpuCount - 1) * 0.1);
    estimatedSpeedup = gpuCount * efficiency;
  }
  
  const warnings: string[] = [];
  if (gpuCount > 1) {
    warnings.push('需要支持多卡并行的深度学习框架');
    warnings.push('多卡间通信可能成为瓶颈');
  }
  if (gpuCount > 4) {
    warnings.push('超过4卡的配置需要专业的服务器硬件支持');
  }
  
  return {
    gpuCount,
    totalMemory,
    utilizationRate: Math.round(utilizationRate * 100) / 100,
    estimatedSpeedup: Math.round(estimatedSpeedup * 100) / 100,
    warnings
  };
}