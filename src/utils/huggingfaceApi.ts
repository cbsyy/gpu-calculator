import { ModelConfig } from './memoryCalculator';

export interface HuggingFaceModelInfo {
  id: string;
  author: string;
  downloads: number;
  likes: number;
  tags: string[];
  pipeline_tag?: string;
  library_name?: string;
}

export interface ModelFileInfo {
  path: string;
  size: number;
  type: string;
}

/**
 * 获取HuggingFace模型信息
 */
export async function fetchModelInfo(repoId: string): Promise<HuggingFaceModelInfo | null> {
  try {
    const response = await fetch(`https://huggingface.co/api/models/${repoId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('获取模型信息失败:', error);
    return null;
  }
}

/**
 * 从ModelScope获取模型配置文件
 */
async function fetchModelConfigFromModelScope(repoId: string): Promise<ModelConfig | null> {
  // ModelScope的多种API格式尝试
  const configUrls = [
    // 原始文件访问格式
    `https://www.modelscope.cn/models/${repoId}/raw/master/config.json`,
    `https://www.modelscope.cn/models/${repoId}/raw/main/config.json`,
    // 直接文件访问格式
    `https://www.modelscope.cn/models/${repoId}/resolve/master/config.json`,
    `https://www.modelscope.cn/models/${repoId}/resolve/main/config.json`,
    // Git文件格式
    `https://www.modelscope.cn/models/${repoId}/file/master/config.json`,
    `https://www.modelscope.cn/models/${repoId}/file/main/config.json`,
    // 文件查看格式（带状态参数）
    `https://www.modelscope.cn/models/${repoId}/file/view/master/config.json?status=1`,
    `https://www.modelscope.cn/models/${repoId}/file/view/main/config.json?status=1`,
    // 简化的文件访问
    `https://modelscope.cn/models/${repoId}/resolve/master/config.json`,
    `https://modelscope.cn/models/${repoId}/resolve/main/config.json`,
    // API格式（修正参数）
    `https://www.modelscope.cn/api/v1/models/${repoId}/repo/files?Revision=master&FilePath=config.json`,
    `https://www.modelscope.cn/api/v1/models/${repoId}/repo/files?Revision=main&FilePath=config.json`
  ];

  for (const url of configUrls) {
    try {
      console.log(`尝试从ModelScope获取配置文件: ${url}`);
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.modelscope.cn/'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('ModelScope响应:', data);
        
        // 检查是否是API错误响应
        if (data.Code && !data.Success) {
          console.warn(`ModelScope API错误: ${data.Message}`);
          continue;
        }
        
        // 如果是文件内容，直接解析
        if (data.vocab_size || data.hidden_size || data.model_type) {
          console.log('成功从ModelScope获取配置文件');
          return parseModelConfig(data);
        }
        
        // 如果是包装的响应，提取Data字段
        if (data.Data && typeof data.Data === 'object') {
          console.log('成功从ModelScope获取配置文件(包装格式)');
          return parseModelConfig(data.Data);
        }
      } else {
        console.warn(`ModelScope配置文件获取失败 (${response.status}): ${url}`);
      }
    } catch (error) {
      console.warn(`ModelScope配置文件请求错误: ${url}`, error);
    }
  }
  
  return null;
}

/**
 * 通过服务端API获取模型配置 - 避免CORS问题，支持Cloudflare部署
 */
async function fetchModelConfigViaAPI(repoId: string): Promise<ModelConfig | null> {
  try {
    console.log('通过服务端API获取模型配置...');
    const response = await fetch(`/api/model-config?repoId=${encodeURIComponent(repoId)}`);
    
    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        console.log(`成功通过服务端API获取配置 (来源: ${result.source})`);
        return result.data;
      }
    }
    
    const errorData = await response.json().catch(() => ({ error: '解析响应失败' }));
    console.warn('服务端API获取失败:', errorData);
    return null;
  } catch (error) {
    console.warn('服务端API请求错误:', error);
    return null;
  }
}

/**
 * 获取模型配置文件 - 优先ModelScope的三重备选方案
 * 1. 客户端ModelScope直连 (优先)
 * 2. 服务端API (避免CORS)
 * 3. 客户端HuggingFace直连
 */
export async function fetchModelConfig(repoId: string): Promise<ModelConfig | null> {
  // 方案1: 优先使用ModelScope直连
  console.log('开始获取模型配置，优先尝试ModelScope...');
  const msResult = await fetchModelConfigFromModelScope(repoId);
  if (msResult) {
    console.log('成功从ModelScope获取配置');
    return msResult;
  }

  // 方案2: 服务端API备选
  console.log('ModelScope失败，尝试服务端API...');
  const apiResult = await fetchModelConfigViaAPI(repoId);
  if (apiResult) {
    return apiResult;
  }

  // 方案3: HuggingFace最后备选
  console.log('服务端API失败，最后尝试HuggingFace...');
  const hfResult = await fetchModelConfigFromHuggingFace(repoId);
  if (hfResult) {
    console.log('成功从HuggingFace获取配置');
    return hfResult;
  }

  console.error('所有配置获取方案都失败，请检查网络连接或模型仓库是否存在');
  return null;
}

/**
 * 从HuggingFace获取模型配置文件
 */
async function fetchModelConfigFromHuggingFace(repoId: string): Promise<ModelConfig | null> {
  const configUrls = [
    `https://huggingface.co/${repoId}/raw/main/config.json`,
    `https://huggingface.co/${repoId}/resolve/main/config.json`,
    `https://huggingface.co/${repoId}/raw/master/config.json`,
    `https://huggingface.co/${repoId}/resolve/master/config.json`
  ];

  for (const url of configUrls) {
    try {
      console.log(`尝试获取HuggingFace配置文件: ${url}`);
      const response = await fetch(url, {
        mode: 'cors',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('成功获取HuggingFace配置文件:', data);
        return parseModelConfig(data);
      } else {
        console.warn(`HuggingFace配置文件获取失败 (${response.status}): ${url}`);
      }
    } catch (error) {
      console.warn(`HuggingFace配置文件请求错误: ${url}`, error);
    }
  }
  
  return null;
}

/**
 * 解析模型配置，提取关键参数
 */
function parseModelConfig(config: any): ModelConfig {
  return {
    vocab_size: config.vocab_size || config.vocabulary_size,
    hidden_size: config.hidden_size || config.d_model || config.n_embd,
    num_hidden_layers: config.num_hidden_layers || config.n_layer || config.num_layers,
    num_attention_heads: config.num_attention_heads || config.n_head || config.num_heads,
    intermediate_size: config.intermediate_size || config.ffn_dim || (config.hidden_size ? config.hidden_size * 4 : undefined),
    max_position_embeddings: config.max_position_embeddings || config.n_positions || config.max_sequence_length,
    num_key_value_heads: config.num_key_value_heads || config.num_kv_heads,
    rope_theta: config.rope_theta || config.rotary_emb_base
  };
}

/**
 * 获取模型文件列表
 */
export async function fetchModelFiles(repoId: string): Promise<ModelFileInfo[]> {
  try {
    const response = await fetch(`https://huggingface.co/api/models/${repoId}/tree/main`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const files = await response.json();
    return files.map((file: any) => ({
      path: file.path,
      size: file.size || 0,
      type: file.type || 'file'
    }));
  } catch (error) {
    console.error('获取模型文件列表失败:', error);
    return [];
  }
}

/**
 * 估算模型大小（基于文件列表）
 */
export function estimateModelSize(files: ModelFileInfo[]): number {
  const modelFiles = files.filter(file => 
    file.path.endsWith('.bin') || 
    file.path.endsWith('.safetensors') ||
    file.path.includes('pytorch_model')
  );
  
  const totalBytes = modelFiles.reduce((sum, file) => sum + file.size, 0);
  return Math.round(totalBytes / (1024 ** 3) * 100) / 100; // 转换为GB
}

/**
 * 搜索HuggingFace模型
 */
export async function searchModels(
  query: string,
  limit: number = 10,
  filter?: string
): Promise<HuggingFaceModelInfo[]> {
  try {
    let url = `https://huggingface.co/api/models?search=${encodeURIComponent(query)}&limit=${limit}`;
    if (filter) {
      url += `&filter=${encodeURIComponent(filter)}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('搜索模型失败:', error);
    return [];
  }
}

/**
 * 验证HuggingFace仓库是否存在
 */
export async function validateRepository(repoId: string): Promise<boolean> {
  try {
    // 首先尝试API接口
    const response = await fetch(`https://huggingface.co/api/models/${repoId}`, {
      method: 'HEAD',
      mode: 'cors'
    });
    if (response.ok) {
      return true;
    }
    
    // 如果API失败，尝试直接访问模型页面
    const pageResponse = await fetch(`https://huggingface.co/${repoId}`, {
      method: 'HEAD',
      mode: 'no-cors'
    });
    return true; // no-cors模式下无法检查状态，假设存在
  } catch (error) {
    console.warn('仓库验证失败，但可能仍然存在:', error);
    return true; // 网络错误时假设仓库存在，让后续步骤处理
  }
}

/**
 * 获取模型的README内容
 */
export async function fetchModelReadme(repoId: string): Promise<string | null> {
  try {
    const response = await fetch(`https://huggingface.co/${repoId}/raw/main/README.md`);
    if (!response.ok) {
      return null;
    }
    return await response.text();
  } catch (error) {
    console.error('获取README失败:', error);
    return null;
  }
}

/**
 * 从README中提取参数数量信息
 */
export function extractParamCountFromReadme(readme: string): string | null {
  if (!readme) return null;
  
  // 常见的参数数量表达模式
  const patterns = [
    /([0-9.]+)\s*[Bb]illion?\s+parameters?/i,
    /([0-9.]+)\s*[Bb]\s+parameters?/i,
    /([0-9.]+)\s*[Mm]illion?\s+parameters?/i,
    /([0-9.]+)\s*[Mm]\s+parameters?/i,
    /parameters?[:\s]+([0-9.]+)\s*[BbMm]/i,
    /model\s+size[:\s]+([0-9.]+)\s*[BbMm]/i
  ];
  
  for (const pattern of patterns) {
    const match = readme.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[0].toLowerCase().includes('b') ? 'B' : 'M';
      return `${value}${unit}`;
    }
  }
  
  return null;
}