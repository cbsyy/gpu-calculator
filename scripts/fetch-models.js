const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

// HuggingFace API配置
const HUGGINGFACE_API_BASE = 'https://huggingface.co/api';
// const LEADERBOARD_URL = 'https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard';
const LEADERBOARD_COLLECTION_URL = 'https://huggingface.co/collections/open-llm-leaderboard/open-llm-leaderboard-best-models-652d6c7965a4619fb5c27a03';

// 热门模型列表（基于下载量和社区认可度）
const POPULAR_MODELS = [
  'meta-llama/Llama-2-70b-chat-hf',
  'meta-llama/Llama-2-13b-chat-hf',
  'meta-llama/Llama-2-7b-chat-hf',
  'mistralai/Mistral-7B-Instruct-v0.2',
  'mistralai/Mixtral-8x7B-Instruct-v0.1',
  'microsoft/DialoGPT-large',
  'codellama/CodeLlama-34b-Instruct-hf',
  'codellama/CodeLlama-13b-Instruct-hf',
  'codellama/CodeLlama-7b-Instruct-hf',
  'THUDM/chatglm3-6b',
  'THUDM/chatglm2-6b',
  'Qwen/Qwen-14B-Chat',
  'Qwen/Qwen-7B-Chat',
  'baichuan-inc/Baichuan2-13B-Chat',
  'baichuan-inc/Baichuan2-7B-Chat',
  'WizardLM/WizardLM-70B-V1.0',
  'WizardLM/WizardCoder-34B-V1.0',
  'teknium/OpenHermes-2.5-Mistral-7B',
  'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO',
  'openchat/openchat-3.5-1210'
];
const OUTPUT_PATH = path.join(__dirname, '../src/config/models.json');

/**
 * 通过HuggingFace API获取模型信息
 */
async function fetchModelInfo(modelRepo) {
  const maxRetries = 3;
  const retryDelay = 3000; // 3秒
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(`${HUGGINGFACE_API_BASE}/models/${modelRepo}`, {
        timeout: 25000, // 增加到25秒
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        }
      });
      
      const modelData = response.data;
      return {
        id: modelRepo.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
        name: modelData.modelId || modelRepo.split('/')[1],
        huggingface_repo: modelRepo,
        description: modelData.description || `来自${modelRepo.split('/')[0]}的开源模型`,
        category: determineCategory(modelRepo, modelData.tags || []),
        parameters: extractParameters(modelRepo, modelData.tags || []),
        context_length: extractContextLength(modelRepo, modelData.tags || []),
        downloads: modelData.downloads || 0,
        likes: modelData.likes || 0,
        license: modelData.license || 'Unknown',
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      console.log(`获取模型 ${modelRepo} 信息失败 (尝试 ${attempt}/${maxRetries}):`, error.message);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  return null;
}

/**
 * 获取HuggingFace排行榜前20模型数据
 */
async function fetchLeaderboardData() {
  const maxRetries = 3;
  const retryDelay = 5000; // 5秒
  
  let modelReposFromScraping = [];
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`正在抓取HuggingFace排行榜页面 (尝试 ${attempt}/${maxRetries})...`);
      
      // 抓取排行榜页面
      const response = await axios.get(LEADERBOARD_COLLECTION_URL, {
        timeout: 60000, // 60秒超时
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });
      
      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log('成功获取排行榜页面，开始解析...');
      const $ = cheerio.load(response.data);
      
      // 查找排行榜表格中的模型
      const tempModelRepos = [];
      
      // 尝试多种选择器来找到模型链接
      const selectors = [
        'a[href*="/collections/open-llm-leaderboard/"][href*="/models/"]', // 集合页面中的模型链接
        'a[href*="huggingface.co/"][href*="/models/"]', // 包含models的链接
        '.model-link', // 可能的模型链接类
        '[data-target="model"]' // 可能的数据属性
      ];
      
      for (const selector of selectors) {
        $(selector).each((i, element) => {
          const href = $(element).attr('href');
          if (href) {
            let modelRepo = '';
            // 提取模型仓库名称
            if (href.includes('/models/')) {
              const match = href.match(/\/models\/([^/?#]+\/[^/?#]+)/);
              if (match) {
                modelRepo = match[1];
              }
            }
            
            if (modelRepo && !tempModelRepos.includes(modelRepo)) {
              tempModelRepos.push(modelRepo);
            }
          }
        });
        
        if (tempModelRepos.length >= 20) break;
      }
      modelReposFromScraping = tempModelRepos.slice(0, 20);
      console.log(`从页面抓取到 ${modelReposFromScraping.length} 个模型ID。`);
      break; // 成功抓取，跳出重试循环
      
    } catch (error) {
      console.log(`抓取排行榜页面失败 (尝试 ${attempt}/${maxRetries}):`, error.message);
      if (attempt < maxRetries) {
        console.log(`等待 ${retryDelay/1000} 秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  let finalModelList = [];
  if (modelReposFromScraping.length > 0) {
    finalModelList = modelReposFromScraping;
  } else {
    console.log('未能从页面抓取到模型ID，回退到使用预定义热门模型列表...');
    finalModelList = POPULAR_MODELS.slice(0, 20);
  }

  console.log(`最终模型列表包含 ${finalModelList.length} 个模型，开始获取详细信息...`);
  
  const models = [];
  let successCount = 0;
  
  // 并发获取模型信息，但限制并发数量
  const batchSize = 2; // 进一步减少并发数量
  for (let i = 0; i < finalModelList.length; i += batchSize) {
    const batch = finalModelList.slice(i, i + batchSize);
    const promises = batch.map(modelRepo => fetchModelInfo(modelRepo));
    
    const results = await Promise.all(promises);
    
    results.forEach((modelData, index) => {
      if (modelData) {
        models.push(modelData);
        successCount++;
      } else {
        console.log(`跳过模型: ${batch[index]}`);
      }
    });
    
    // 添加延迟避免请求过于频繁
    if (i + batchSize < finalModelList.length) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log(`成功获取到 ${successCount}/${finalModelList.length} 个模型信息`);
  
  if (models.length === 0) {
    console.log('未能获取到任何模型信息，使用备用数据...');
    return getFallbackModels();
  }
  
  // 按下载量和点赞数排序
  models.sort((a, b) => (b.downloads + b.likes * 10) - (a.downloads + a.likes * 10));
  
  console.log(`成功获取到${models.length}个排行榜模型数据`);
  return models;
}

// extractModelRepo函数已删除，因为现在直接使用预定义的模型列表

/**
 * 确定模型类别
 */
function determineCategory(modelRepo, tags) {
  const repoLower = modelRepo.toLowerCase();
  const tagString = tags.join(' ').toLowerCase();
  
  if (repoLower.includes('code') || repoLower.includes('coder') || tagString.includes('code')) {
    return '代码生成';
  } else if (repoLower.includes('math') || tagString.includes('math')) {
    return '数学推理';
  } else if (repoLower.includes('chat') || repoLower.includes('instruct') || tagString.includes('conversational')) {
    return '对话模型';
  } else if (tagString.includes('text-generation')) {
    return '文本生成';
  }
  return '通用对话';
}

/**
 * 提取模型参数规模
 */
function extractParameters(modelRepo, tags) {
  const repoLower = modelRepo.toLowerCase();
  
  // 常见的参数规模模式
  const patterns = [
    /-(\d+)b-/i,  // -7b-, -13b-, -70b-
    /-(\d+)b$/i,  // -7b, -13b, -70b
    /(\d+)b/i     // 7b, 13b, 70b
  ];
  
  for (const pattern of patterns) {
    const match = repoLower.match(pattern);
    if (match) {
      return `${match[1]}B`;
    }
  }
  
  // 检查标签中的参数信息
  for (const tag of tags) {
    if (tag.includes('billion') || tag.includes('B')) {
      return tag;
    }
  }
  
  return 'Unknown';
}

/**
 * 提取上下文长度
 */
function extractContextLength(modelRepo, tags) {
  const repoLower = modelRepo.toLowerCase();
  
  if (repoLower.includes('32k')) return 32768;
  if (repoLower.includes('128k')) return 131072;
  if (repoLower.includes('8k')) return 8192;
  if (repoLower.includes('4k')) return 4096;
  
  // 根据模型类型设置默认值
  if (repoLower.includes('mistral')) return 32768;
  if (repoLower.includes('llama-2')) return 4096;
  if (repoLower.includes('qwen')) return 8192;
  if (repoLower.includes('chatglm')) return 8192;
  
  return 4096; // 默认值
}



/**
 * 获取备用模型列表（当网络抓取失败时使用）
 */
function getFallbackModels() {
  return [
    {
      id: 'llama-2-70b-chat-hf',
      name: 'Llama 2 70B Chat HF',
      huggingface_repo: 'meta-llama/Llama-2-70b-chat-hf',
      description: '备用模型列表 - Meta开发的大型对话模型',
      category: '对话模型',
      parameters: '70B',
      context_length: 4096,
      avg_score: 85.0,
      license: 'Custom',
      last_updated: new Date().toISOString()
    },
    {
      id: 'mistral-7b-instruct-v0-2',
      name: 'Mistral 7B Instruct v0.2',
      huggingface_repo: 'mistralai/Mistral-7B-Instruct-v0.2',
      description: '备用模型列表 - Mistral AI的指令调优模型',
      category: '对话模型',
      parameters: '7B',
      context_length: 32768,
      avg_score: 82.0,
      license: 'Apache 2.0',
      last_updated: new Date().toISOString()
    },
    {
      id: 'codellama-34b-instruct',
      name: 'CodeLlama 34B Instruct',
      huggingface_repo: 'codellama/CodeLlama-34b-Instruct-hf',
      description: '备用模型列表 - Meta的代码生成专用模型',
      category: '代码生成',
      parameters: '34B',
      context_length: 16384,
      avg_score: 80.0,
      license: 'Custom',
      last_updated: new Date().toISOString()
    },
    {
      id: 'chatglm3-6b',
      name: 'ChatGLM3 6B',
      huggingface_repo: 'THUDM/chatglm3-6b',
      description: '备用模型列表 - 清华大学开发的中英双语对话模型',
      category: '对话模型',
      parameters: '6B',
      context_length: 8192,
      avg_score: 78.0,
      license: 'Custom',
      last_updated: new Date().toISOString()
    },
    {
      id: 'qwen-14b-chat',
      name: 'Qwen 14B Chat',
      huggingface_repo: 'Qwen/Qwen-14B-Chat',
      description: '备用模型列表 - 阿里云开发的中英双语对话模型',
      category: '对话模型',
      parameters: '14B',
      context_length: 8192,
      avg_score: 77.0,
      license: 'Custom',
      last_updated: new Date().toISOString()
    }
  ];
  }


/**
 * 获取现有的模型配置
 */
async function getExistingModels() {
  try {
    const data = await fs.readFile(OUTPUT_PATH, 'utf8');
    const config = JSON.parse(data);
    return config.models || [];
  } catch (error) {
    console.log('未找到现有配置文件，将创建新文件');
    return [];
  }
}

/**
 * 合并新抓取的模型和现有模型
 */
function mergeModels(existingModels, newModels) {
  const merged = [...existingModels];
  const existingIds = new Set(existingModels.map(m => m.id));
  
  // 添加新模型
  newModels.forEach(newModel => {
    if (!existingIds.has(newModel.id)) {
      merged.push(newModel);
    } else {
      // 更新现有模型的排行榜信息
      const existingIndex = merged.findIndex(m => m.id === newModel.id);
      if (existingIndex !== -1) {
        merged[existingIndex] = {
          ...merged[existingIndex],
          avg_score: newModel.avg_score,
          last_updated: newModel.last_updated
        };
      }
    }
  });
  
  // 按平均得分排序
  return merged.sort((a, b) => (b.avg_score || 0) - (a.avg_score || 0));
}

/**
 * 保存模型配置到文件
 */
async function saveModelsConfig(models) {
  try {
    const config = {
      models: models,
      last_updated: new Date().toISOString(),
      source: 'HuggingFace Open LLM Leaderboard',
      total_models: models.length
    };
    
    await fs.writeFile(OUTPUT_PATH, JSON.stringify(config, null, 2), 'utf8');
    console.log(`模型配置已保存到: ${OUTPUT_PATH}`);
    console.log(`总计 ${models.length} 个模型`);
  } catch (error) {
    console.error('保存配置文件失败:', error.message);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('开始更新模型配置...');
  
  try {
    // 抓取新数据
    const newModels = await fetchLeaderboardData();
    
    if (newModels.length === 0) {
      console.log('未抓取到新模型数据，保持现有配置');
      return;
    }
    
    // 获取现有模型
    const existingModels = await getExistingModels();
    
    // 合并模型数据
    const mergedModels = mergeModels(existingModels, newModels);
    
    // 保存配置
    await saveModelsConfig(mergedModels);
    
    console.log('模型配置更新完成!');
    
  } catch (error) {
    console.error('更新模型配置失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  fetchLeaderboardData,
  mergeModels,
  saveModelsConfig,
  main
};