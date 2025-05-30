export interface ModelConfig {
  vocab_size?: number;
  hidden_size?: number;
  num_hidden_layers?: number;
  num_attention_heads?: number;
  intermediate_size?: number;
  max_position_embeddings?: number;
  num_key_value_heads?: number;
  rope_theta?: number;
}

export interface MemoryRequirement {
  modelWeights: number; // 模型权重显存 (GB)
  kvCache: number; // KV缓存显存 (GB)
  activations: number; // 激活值显存 (GB)
  optimizer: number; // 优化器状态显存 (GB)
  total: number; // 总显存需求 (GB)
  inference: number; // 推理时显存需求 (GB)
  training: number; // 训练时显存需求 (GB)
}

export interface CalculationParams {
  precision: 'fp32' | 'fp16' | 'int8' | 'int4';
  batchSize: number;
  sequenceLength: number;
  isTraining: boolean;
}

// 精度对应的字节数
const PRECISION_BYTES = {
  fp32: 4,
  fp16: 2,
  int8: 1,
  int4: 0.5
};

/**
 * 计算模型权重显存需求
 */
export function calculateModelWeights(
  config: ModelConfig,
  precision: 'fp32' | 'fp16' | 'int8' | 'int4'
): number {
  if (!config.vocab_size || !config.hidden_size || !config.num_hidden_layers) {
    throw new Error('缺少必要的模型配置参数');
  }

  const {
    vocab_size,
    hidden_size,
    num_hidden_layers,
    num_attention_heads,
    intermediate_size,
  } = config;

  // 估算参数数量（单位：个数）
  let totalParams = 0;

  // Embedding层参数
  totalParams += vocab_size * hidden_size;

  // Transformer层参数
  const ffnSize = intermediate_size || hidden_size * 4;
  const layerParams = (
    // 注意力机制参数 (Q, K, V, O)
    4 * hidden_size * hidden_size +
    // FFN参数 (up, down, gate - 对于SwiGLU架构)
    3 * hidden_size * ffnSize +
    // LayerNorm参数 (每层2个LayerNorm)
    2 * hidden_size
  );
  
  totalParams += num_hidden_layers * layerParams;

  // 输出层参数（通常与embedding层共享权重，但为了保险起见计算）
  // totalParams += vocab_size * hidden_size;

  // 转换为GB
  const bytesPerParam = PRECISION_BYTES[precision];
  const totalBytes = totalParams * bytesPerParam;
  const totalGB = totalBytes / (1024 ** 3);

  return Math.round(totalGB * 100) / 100;
}

/**
 * 计算KV缓存显存需求
 */
export function calculateKVCache(
  config: ModelConfig,
  params: CalculationParams
): number {
  if (!config.hidden_size || !config.num_hidden_layers || !config.num_attention_heads) {
    return 0;
  }

  const {
    hidden_size,
    num_hidden_layers,
    num_attention_heads,
    num_key_value_heads
  } = config;

  const { batchSize, sequenceLength, precision } = params;
  
  // KV头数量（如果是GQA，使用num_key_value_heads；否则使用num_attention_heads）
  const kvHeads = num_key_value_heads || num_attention_heads;
  const headDim = hidden_size / num_attention_heads;
  
  // KV缓存大小 = 2 (K和V) * 层数 * 批次大小 * 序列长度 * KV头数 * 头维度
  const kvCacheSize = 2 * num_hidden_layers * batchSize * sequenceLength * kvHeads * headDim;
  
  const bytesPerElement = PRECISION_BYTES[precision];
  const totalBytes = kvCacheSize * bytesPerElement;
  const totalGB = totalBytes / (1024 ** 3);

  return Math.round(totalGB * 100) / 100;
}

/**
 * 计算激活值显存需求
 */
export function calculateActivations(
  config: ModelConfig,
  params: CalculationParams
): number {
  if (!config.hidden_size || !config.num_hidden_layers) {
    return 0;
  }

  const { hidden_size, num_hidden_layers, intermediate_size } = config;
  const { batchSize, sequenceLength, precision } = params;
  
  const ffnSize = intermediate_size || hidden_size * 4;
  
  // 激活值大小估算（包括注意力和FFN的中间激活）
  const activationSize = batchSize * sequenceLength * (
    hidden_size + // 输入激活
    hidden_size + // 注意力输出
    ffnSize + // FFN中间激活
    hidden_size // FFN输出
  ) * num_hidden_layers;
  
  const bytesPerElement = PRECISION_BYTES[precision];
  const totalBytes = activationSize * bytesPerElement;
  const totalGB = totalBytes / (1024 ** 3);

  return Math.round(totalGB * 100) / 100;
}

/**
 * 计算优化器状态显存需求（仅训练时）
 */
export function calculateOptimizerStates(
  modelWeights: number,
  isTraining: boolean
): number {
  if (!isTraining) return 0;
  
  // AdamW优化器需要2倍模型参数的额外显存（momentum和variance）
  return Math.round(modelWeights * 2 * 100) / 100;
}

/**
 * 计算总显存需求
 */
export function calculateTotalMemory(
  config: ModelConfig,
  params: CalculationParams
): MemoryRequirement {
  const modelWeights = calculateModelWeights(config, params.precision);
  const kvCache = calculateKVCache(config, params);
  const activations = calculateActivations(config, params);
  const optimizer = calculateOptimizerStates(modelWeights, params.isTraining);
  
  const inference = modelWeights + kvCache + activations * 0.5; // 推理时激活值较少
  const training = modelWeights + kvCache + activations + optimizer;
  const total = params.isTraining ? training : inference;
  
  // 添加20%的安全边际
  const safetyMargin = 1.2;
  
  return {
    modelWeights: Math.round(modelWeights * 100) / 100,
    kvCache: Math.round(kvCache * 100) / 100,
    activations: Math.round(activations * 100) / 100,
    optimizer: Math.round(optimizer * 100) / 100,
    inference: Math.round(inference * safetyMargin * 100) / 100,
    training: Math.round(training * safetyMargin * 100) / 100,
    total: Math.round(total * safetyMargin * 100) / 100
  };
}

/**
 * 根据参数数量估算模型配置（当无法获取config.json时的备用方案）
 */
export function estimateConfigFromParams(paramCount: string): ModelConfig {
  const params = parseFloat(paramCount.replace(/[^0-9.]/g, ''));
  
  if (params <= 1) {
    // 0.5B-1B模型配置
    return {
      vocab_size: 151936, // Qwen2.5系列词汇表大小
      hidden_size: 1536,
      num_hidden_layers: 28,
      num_attention_heads: 12,
      num_key_value_heads: 2,
      intermediate_size: 8960
    };
  } else if (params <= 3) {
    // 1.5B-3B模型配置
    return {
      vocab_size: 151936,
      hidden_size: 2048,
      num_hidden_layers: 28,
      num_attention_heads: 16,
      num_key_value_heads: 2,
      intermediate_size: 11008
    };
  } else if (params <= 7) {
    // 7B模型配置（基于Qwen2.5-7B）
    return {
      vocab_size: 151936,
      hidden_size: 4096,
      num_hidden_layers: 28,
      num_attention_heads: 28,
      num_key_value_heads: 4,
      intermediate_size: 14336
    };
  } else if (params <= 14) {
    // 14B模型配置
    return {
      vocab_size: 151936,
      hidden_size: 5120,
      num_hidden_layers: 40,
      num_attention_heads: 40,
      num_key_value_heads: 8,
      intermediate_size: 13824
    };
  } else if (params <= 32) {
    // 32B模型配置
    return {
      vocab_size: 151936,
      hidden_size: 6656,
      num_hidden_layers: 64,
      num_attention_heads: 52,
      num_key_value_heads: 8,
      intermediate_size: 17920
    };
  } else {
    // 72B+模型配置（基于Qwen2.5-72B）
    return {
      vocab_size: 151936,
      hidden_size: 8192,
      num_hidden_layers: 80,
      num_attention_heads: 64,
      num_key_value_heads: 8,
      intermediate_size: 29568
    };
  }
}