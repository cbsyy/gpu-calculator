import { NextRequest, NextResponse } from 'next/server';

interface ModelConfig {
  vocab_size?: number;
  hidden_size?: number;
  num_hidden_layers?: number;
  num_attention_heads?: number;
  intermediate_size?: number;
  max_position_embeddings?: number;
  num_key_value_heads?: number;
  rope_theta?: number;
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
 * 从HuggingFace获取模型配置
 */
async function fetchFromHuggingFace(repoId: string): Promise<ModelConfig | null> {
  const configUrls = [
    `https://huggingface.co/${repoId}/raw/main/config.json`,
    `https://huggingface.co/${repoId}/resolve/main/config.json`,
    `https://huggingface.co/${repoId}/raw/master/config.json`,
    `https://huggingface.co/${repoId}/resolve/master/config.json`
  ];

  for (const url of configUrls) {
    try {
      console.log(`服务端尝试HuggingFace: ${url}`);
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; GPU-Calculator/1.0)'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('服务端成功获取HuggingFace配置');
        return parseModelConfig(data);
      }
    } catch (error) {
      console.warn(`服务端HuggingFace请求错误: ${url}`, error);
    }
  }
  
  return null;
}

/**
 * 从ModelScope获取模型配置
 */
async function fetchFromModelScope(repoId: string): Promise<ModelConfig | null> {
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
      console.log(`服务端尝试ModelScope: ${url}`);
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; GPU-Calculator/1.0)',
          'Referer': 'https://www.modelscope.cn/'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('服务端ModelScope响应:', data);
        
        // 检查是否是API响应格式
        if (data.Code && !data.Success) {
          console.warn(`ModelScope API错误: ${data.Message}`);
          continue;
        }
        
        // 如果是文件内容，直接解析
        if (data.vocab_size || data.hidden_size || data.model_type) {
          console.log('服务端成功获取ModelScope配置');
          return parseModelConfig(data);
        }
        
        // 如果是包装的响应，提取Data字段
        if (data.Data && typeof data.Data === 'object') {
          console.log('服务端成功获取ModelScope配置(包装格式)');
          return parseModelConfig(data.Data);
        }
      } else {
        console.warn(`ModelScope请求失败 (${response.status}): ${url}`);
      }
    } catch (error) {
      console.warn(`服务端ModelScope请求错误: ${url}`, error);
    }
  }
  
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const repoId = searchParams.get('repoId');
  
  if (!repoId) {
    return NextResponse.json(
      { error: '缺少repoId参数' },
      { status: 400 }
    );
  }

  console.log(`服务端开始获取模型配置: ${repoId}`);
  
  try {
    // 首先尝试ModelScope
    let config = await fetchFromModelScope(repoId);
    if (config) {
      return NextResponse.json({
        success: true,
        data: config,
        source: 'ModelScope'
      });
    }

    // 然后尝试HuggingFace
    config = await fetchFromHuggingFace(repoId);
    if (config) {
      return NextResponse.json({
        success: true,
        data: config,
        source: 'HuggingFace'
      });
    }

    // 都失败了
    return NextResponse.json(
      { 
        error: '无法从ModelScope或HuggingFace获取模型配置',
        details: '请检查模型仓库是否存在，或稍后重试'
      },
      { status: 404 }
    );
    
  } catch (error) {
    console.error('服务端获取模型配置时发生错误:', error);
    return NextResponse.json(
      { 
        error: '服务器内部错误',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}