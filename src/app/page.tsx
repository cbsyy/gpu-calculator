'use client';

import { useState, useEffect } from 'react';
import { Search, Calculator, Zap, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import modelsData from '../config/models.json';
import { fetchModelConfig, fetchModelInfo, validateRepository } from '../utils/huggingfaceApi';
import { calculateTotalMemory, ModelConfig, CalculationParams, MemoryRequirement } from '../utils/memoryCalculator';
import { getGPURecommendations, RecommendationResult, GPURecommendation } from '../utils/gpuRecommendation';

interface Model {
  id: string;
  name: string;
  modelscope_repo?: string;
  huggingface_repo?: string;
  description: string;
  category: string;
  parameters?: string;
  context_length?: number;
}

export default function Home() {
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [customRepo, setCustomRepo] = useState('');
  const [modelConfig, setModelConfig] = useState<ModelConfig | null>(null);
  const [calculationParams, setCalculationParams] = useState<CalculationParams>({
    precision: 'fp16',
    batchSize: 1,
    sequenceLength: 2048,
    isTraining: false
  });
  const [memoryRequirement, setMemoryRequirement] = useState<MemoryRequirement | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const models: Model[] = modelsData.models;
  const filteredModels = models.filter(model => 
    model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    model.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleModelSelect = async (model: Model) => {
    setSelectedModel(model);
    setError(null);
    setLoading(true);

    try {
      let config: ModelConfig | null = null;
      
      // 优先尝试从HuggingFace获取配置
      if (model.huggingface_repo) {
        config = await fetchModelConfig(model.huggingface_repo);
      }
      
      // 如果HuggingFace获取失败，且有参数信息，则使用估算配置
      if (!config && model.parameters) {
        const { estimateConfigFromParams } = await import('../utils/memoryCalculator');
        config = estimateConfigFromParams(model.parameters);
        console.log(`使用估算配置为 ${model.name}:`, config);
      }
      
      if (config) {
        setModelConfig(config);
      } else {
        setError('无法获取模型配置，请检查仓库信息或提供参数数量');
      }
    } catch (err) {
      setError('获取模型配置时发生错误');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomRepo = async () => {
    if (!customRepo.trim()) return;
    
    setError(null);
    setLoading(true);

    try {
      console.log('开始处理自定义仓库:', customRepo);
      
      // 先尝试获取配置文件，不依赖仓库验证
      const config = await fetchModelConfig(customRepo);
      const info = await fetchModelInfo(customRepo);
      
      if (config) {
        console.log('成功获取模型配置:', config);
        setModelConfig(config);
        setSelectedModel({
          id: 'custom',
          name: info?.id || customRepo,
          huggingface_repo: customRepo,
          description: '自定义模型',
          category: '自定义'
        });
      } else {
        // 提供更详细的错误信息和解决方案
        setError(
          `无法获取模型配置文件。系统已尝试多种获取方式：\n` +
          `• 服务端API (避免CORS问题)\n` +
          `• HuggingFace直连\n` +
          `• ModelScope备选源\n\n` +
          `可能的原因：\n` +
          `1. 仓库不存在或为私有仓库\n` +
          `2. 配置文件缺失 (config.json)\n` +
          `3. 网络连接问题\n\n` +
          `请检查仓库地址格式: microsoft/DialoGPT-medium`
        );
      }
    } catch (err) {
      console.error('处理自定义仓库时发生错误:', err);
      setError(
        `获取模型信息时发生错误: ${err instanceof Error ? err.message : '未知错误'}\n\n` +
        `请检查网络连接和仓库地址格式`
      );
    } finally {
      setLoading(false);
    }
  };

  const calculateMemory = () => {
    if (!modelConfig) return;

    try {
      const result = calculateTotalMemory(modelConfig, calculationParams);
      setMemoryRequirement(result);
      
      const gpuRecs = getGPURecommendations(result, calculationParams.isTraining);
      setRecommendations(gpuRecs);
    } catch (err) {
      setError('计算显存需求时发生错误');
    }
  };

  useEffect(() => {
    if (modelConfig) {
      calculateMemory();
    }
  }, [modelConfig, calculationParams]);

  const getSuitabilityColor = (suitability: string) => {
    switch (suitability) {
      case 'perfect': return 'text-green-600 bg-green-50';
      case 'good': return 'text-blue-600 bg-blue-50';
      case 'marginal': return 'text-yellow-600 bg-yellow-50';
      case 'insufficient': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSuitabilityIcon = (suitability: string) => {
    switch (suitability) {
      case 'perfect': return <CheckCircle className="w-4 h-4" />;
      case 'good': return <CheckCircle className="w-4 h-4" />;
      case 'marginal': return <AlertTriangle className="w-4 h-4" />;
      case 'insufficient': return <AlertTriangle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* 模型选择区域 */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Search className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold">选择模型</h2>
        </div>
        
        {/* 搜索框 */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="搜索模型名称或类别..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 预设模型列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {filteredModels.map((model) => (
            <div
              key={model.id}
              onClick={() => handleModelSelect(model)}
              className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                selectedModel?.id === model.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-900">{model.name}</h3>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                    {model.category}
                  </span>
                  {model.parameters && (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-600 rounded">
                      {model.parameters}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-2">{model.description}</p>
              <div className="space-y-1">
                {model.modelscope_repo && (
                  <p className="text-xs text-blue-600 font-mono">
                    📦 ModelScope: {model.modelscope_repo}
                  </p>
                )}
                {model.huggingface_repo && (
                  <p className="text-xs text-gray-500 font-mono">
                    🤗 HuggingFace: {model.huggingface_repo}
                  </p>
                )}
                {model.context_length && (
                  <p className="text-xs text-gray-500">
                    📏 上下文长度: {model.context_length.toLocaleString()} tokens
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 自定义仓库输入 */}
        <div className="border-t pt-4">
          <h3 className="font-medium mb-2">或输入自定义HuggingFace仓库</h3>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="例如: microsoft/DialoGPT-medium"
              value={customRepo}
              onChange={(e) => setCustomRepo(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleCustomRepo}
              disabled={loading || !customRepo.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed w-full"
            >
              {loading ? '获取中...' : '获取配置'}
            </button>
          </div>
        </div>
      </div>

      {/* 计算参数设置 */}
      {selectedModel && (
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <Calculator className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold">计算参数</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                数据精度
              </label>
              <select
                value={calculationParams.precision}
                onChange={(e) => setCalculationParams(prev => ({
                  ...prev,
                  precision: e.target.value as any
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="fp32">FP32 (32位浮点)</option>
                <option value="fp16">FP16 (16位浮点)</option>
                <option value="int8">INT8 (8位整数)</option>
                <option value="int4">INT4 (4位整数)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                批次大小
              </label>
              <input
                type="number"
                min="1"
                max="128"
                value={calculationParams.batchSize}
                onChange={(e) => setCalculationParams(prev => ({
                  ...prev,
                  batchSize: parseInt(e.target.value) || 1
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                序列长度
              </label>
              <input
                type="number"
                min="128"
                max="32768"
                step="128"
                value={calculationParams.sequenceLength}
                onChange={(e) => setCalculationParams(prev => ({
                  ...prev,
                  sequenceLength: parseInt(e.target.value) || 2048
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                使用场景
              </label>
              <select
                value={calculationParams.isTraining ? 'training' : 'inference'}
                onChange={(e) => setCalculationParams(prev => ({
                  ...prev,
                  isTraining: e.target.value === 'training'
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="inference">推理</option>
                <option value="training">训练</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* 显存需求结果 */}
      {memoryRequirement && (
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <Zap className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold">显存需求分析</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {memoryRequirement.modelWeights}GB
              </div>
              <div className="text-sm text-gray-600">模型权重</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {memoryRequirement.kvCache}GB
              </div>
              <div className="text-sm text-gray-600">KV缓存</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {memoryRequirement.activations}GB
              </div>
              <div className="text-sm text-gray-600">激活值</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {memoryRequirement.total}GB
              </div>
              <div className="text-sm text-gray-600">
                {calculationParams.isTraining ? '训练总需求' : '推理总需求'}
              </div>
            </div>
          </div>
          
          {calculationParams.isTraining && memoryRequirement.optimizer > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Info className="w-4 h-4 text-orange-600" />
                <span className="font-medium text-orange-800">训练模式额外需求</span>
              </div>
              <p className="text-sm text-orange-700">
                优化器状态需要额外 {memoryRequirement.optimizer}GB 显存
              </p>
            </div>
          )}
        </div>
      )}

      {/* GPU推荐 */}
      {recommendations && (
        <div className="space-y-6">
          {/* 推荐GPU */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">推荐GPU配置</h2>
            <div className="space-y-4">
              {recommendations.recommended.map((rec, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium text-lg">{rec.gpu.name}</h3>
                      <p className="text-sm text-gray-600">{rec.gpu.category} • {rec.gpu.memory}GB显存</p>
                    </div>
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded text-sm ${getSuitabilityColor(rec.suitability)}`}>
                      {getSuitabilityIcon(rec.suitability)}
                      <span className="capitalize">{rec.suitability}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div>
                      <span className="text-sm text-gray-500">显存利用率</span>
                      <div className="font-medium">{rec.utilizationRate}%</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">价格区间</span>
                      <div className="font-medium">¥{rec.gpu.price_range}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">功耗</span>
                      <div className="font-medium">{rec.gpu.power_consumption}W</div>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    {rec.reasons.map((reason, i) => (
                      <div key={i} className="flex items-center space-x-2 text-sm text-green-700">
                        <CheckCircle className="w-3 h-3" />
                        <span>{reason}</span>
                      </div>
                    ))}
                    {rec.warnings.map((warning, i) => (
                      <div key={i} className="flex items-center space-x-2 text-sm text-yellow-700">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{warning}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 预算友好选项 */}
          {recommendations.budget.length > 0 && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">预算友好选项</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.budget.map((rec, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h3 className="font-medium">{rec.gpu.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{rec.gpu.memory}GB • ¥{rec.gpu.price_range}</p>
                    <div className="text-sm">
                      <span className="text-gray-500">利用率: </span>
                      <span className="font-medium">{rec.utilizationRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 专业级选项 */}
          {recommendations.professional.length > 0 && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">专业级选项</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.professional.map((rec, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h3 className="font-medium">{rec.gpu.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{rec.gpu.memory}GB • ¥{rec.gpu.price_range}</p>
                    <div className="text-sm">
                      <span className="text-gray-500">利用率: </span>
                      <span className="font-medium">{rec.utilizationRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 多卡方案 */}
          {recommendations.multiGpu && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">多卡并行方案</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-800">
                    推荐使用 {recommendations.multiGpu.gpuCount} 张显卡
                  </span>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  总显存: {recommendations.multiGpu.totalMemory}GB
                </p>
                {recommendations.multiGpu.recommendations.map((rec, index) => (
                  <div key={index} className="bg-white rounded p-3">
                    <h3 className="font-medium">{rec.gpu.name}</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      {rec.reasons.map((reason, i) => (
                        <div key={i}>• {reason}</div>
                      ))}
                      {rec.warnings.map((warning, i) => (
                        <div key={i} className="text-yellow-600">⚠ {warning}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}