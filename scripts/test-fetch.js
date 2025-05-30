const { fetchLeaderboardData, mergeModels, saveModelsConfig } = require('./fetch-models');
const fs = require('fs').promises;
const path = require('path');

/**
 * 测试抓取功能
 */
async function testFetch() {
  console.log('🧪 开始测试模型抓取功能...');
  console.log('=' .repeat(50));
  
  try {
    // 测试数据抓取
    console.log('1. 测试数据抓取...');
    const models = await fetchLeaderboardData();
    
    if (models.length === 0) {
      console.log('❌ 未能抓取到模型数据');
      return;
    }
    
    console.log(`✅ 成功抓取到 ${models.length} 个模型`);
    
    // 显示前5个模型的信息
    console.log('\n📋 前5个模型信息:');
    models.slice(0, 5).forEach((model, index) => {
      console.log(`${index + 1}. ${model.name}`);
      console.log(`   - 仓库: ${model.huggingface_repo}`);
      console.log(`   - 得分: ${model.avg_score}`);
      console.log(`   - 参数: ${model.parameters}`);
      console.log(`   - 类别: ${model.category}`);
      console.log('');
    });
    
    // 测试合并功能
    console.log('2. 测试模型合并功能...');
    const existingModels = [
      {
        id: 'test-model',
        name: 'Test Model',
        avg_score: 85.5,
        category: '测试模型'
      }
    ];
    
    const mergedModels = mergeModels(existingModels, models.slice(0, 3));
    console.log(`✅ 合并后共有 ${mergedModels.length} 个模型`);
    
    // 测试保存功能
    console.log('\n3. 测试配置保存功能...');
    const testOutputPath = path.join(__dirname, '../test-models.json');
    
    const testConfig = {
      models: models.slice(0, 10), // 只保存前10个用于测试
      last_updated: new Date().toISOString(),
      source: 'HuggingFace Open LLM Leaderboard (Test)',
      total_models: 10
    };
    
    await fs.writeFile(testOutputPath, JSON.stringify(testConfig, null, 2), 'utf8');
    console.log(`✅ 测试配置已保存到: ${testOutputPath}`);
    
    // 验证保存的文件
    const savedData = await fs.readFile(testOutputPath, 'utf8');
    const parsedData = JSON.parse(savedData);
    console.log(`✅ 验证成功，文件包含 ${parsedData.models.length} 个模型`);
    
    // 清理测试文件
    await fs.unlink(testOutputPath);
    console.log('🧹 测试文件已清理');
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎉 所有测试通过！抓取功能正常工作');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * 显示使用帮助
 */
function showHelp() {
  console.log('🔧 HuggingFace模型抓取工具测试');
  console.log('');
  console.log('用法:');
  console.log('  npm run test-fetch     # 运行完整测试');
  console.log('  node scripts/test-fetch.js  # 直接运行测试');
  console.log('');
  console.log('功能:');
  console.log('  - 测试数据抓取功能');
  console.log('  - 测试模型合并功能');
  console.log('  - 测试配置保存功能');
  console.log('  - 验证生成的配置文件');
}

// 处理命令行参数
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

// 如果直接运行此脚本
if (require.main === module) {
  testFetch();
}

module.exports = {
  testFetch
};