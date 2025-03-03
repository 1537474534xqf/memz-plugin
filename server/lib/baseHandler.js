import logger from './logger.js'
import { sendSuccess, sendError, sendParamError, sendMethodNotAllowed } from './response.js'

export class BaseApiHandler {
/**
 * 构造函数
 * 用于初始化请求处理对象
 *
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Object} options - 可选配置对象，用于自定义请求处理行为，默认为空对象
 */
  constructor (req, res, options = {}) {
    // 请求对象
    this.req = req
    // 响应对象
    this.res = res
    // 可选配置对象
    this.options = options
    // Express中可以直接获取协议
    this.protocol = req.protocol
    // Express中可以直接访问baseUrl、originalUrl等
    this.url = new URL(req.originalUrl, `${this.protocol}://${req.get('host')}`)
  }

  /**
   * 获取POST请求数据
   * 在Express中已经通过body-parser中间件处理过，可以直接从req.body获取
   */
  getPostData () {
    return new Promise((resolve, reject) => {
      if (this.req.method !== 'POST') {
        return reject(new Error('Not POST request'))
      }

      // 如果使用了express.json()中间件，可以直接获取
      if (this.req.body) {
        return resolve(this.req.body)
      } else {
        reject(new Error('Request body not available. Make sure express.json() middleware is used.'))
      }
    })
  }

  /**
   * 验证请求方法
   */
  validateMethod (method) {
    if (this.req.method !== method) {
      sendMethodNotAllowed(this.res, method)
      return false
    }
    return true
  }

  /**
   * 参数验证
   * 同时检查query和body中的参数
   */
  validateParams (params) {
    const missing = []
    for (const [key, required] of Object.entries(params)) {
      // 检查query参数
      const queryValue = this.req.query[key]
      // 检查body参数
      const bodyValue = this.req.body?.[key]

      // 如果是必填且两个地方都没有，则记为缺失
      if (required && !queryValue && !bodyValue) {
        missing.push(key)
      }
    }
    return missing
  }

  /**
   * 错误处理
   */
  handleError (error, customMessage) {
    logger.error(`[API错误] ${error.message}`)
    if (error.message === 'Invalid JSON') {
      this.sendParamError('无效的JSON格式')
    } else if (error.message === 'Request body too large') {
      this.sendError({
        code: 413,
        message: '请求体过大'
      })
    } else {
      sendError(this.res, {
        message: customMessage || '请求处理失败',
        error: error.message
      })
    }
  }

  /**
   * 成功响应
   */
  sendSuccess (data, message) {
    sendSuccess(this.res, {
      title: this.options.title,
      data,
      message
    })
  }

  /**
   * 参数错误
   */
  sendParamError (message) {
    sendParamError(this.res, message)
  }

  /**
   * 发送错误
   */
  sendError (error) {
    sendError(this.res, error)
  }
}
