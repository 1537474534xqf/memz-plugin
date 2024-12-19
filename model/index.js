import {
  // 将HTML转换为图片
  generateScreenshot
} from './Screenshot.js'
import {
  // 获取ICP备案信息
  fetchIcpInfo,
  // 翻译whois数据
  translateWhoisData,
  // 从HTML中提取SEO信息
  fetchSeoFromHtml,
  // 检查HTTP状态码
  checkHttpStatus,
  // 获取SSL证书信息
  fetchSslInfo
} from './webtool.js'
import {
  // 从Excel文件中加载数据
  loadDataFromExcelFiles,
  // 搜索资源
  searchResources
} from './Search.js'
import {
  // 规范化cron表达式
  normalizeCronExpression
} from './cron.js'
import {
  // 随机一言
  getRandomYiyan
} from './one.js'
export {
  // 截图
  generateScreenshot,
  // WebTools
  fetchIcpInfo,
  translateWhoisData,
  fetchSeoFromHtml,
  checkHttpStatus,
  fetchSslInfo,
  // Search
  loadDataFromExcelFiles,
  searchResources,
  // cron
  normalizeCronExpression,
  // 随机一?函数
  getRandomYiyan
}
