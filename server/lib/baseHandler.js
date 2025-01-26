import logger from './logger.js'
import { sendSuccess, sendError, sendParamError, sendMethodNotAllowed } from './response.js'

export class BaseApiHandler {
  constructor (req, res, options = {}) {
    this.req = req
    this.res = res
    this.options = options
    this.protocol = req.headers['x-forwarded-proto'] || (req.connection.encrypted ? 'https' : 'http')
    this.url = new URL(req.url, `${this.protocol}://${req.headers.host}`)
  }

  /**
   * 参数验证
   */
  validateParams (params) {
    const missing = []
    for (const [key, required] of Object.entries(params)) {
      if (required && !this.url.searchParams.get(key)) {
        missing.push(key)
      }
    }
    return missing
  }

  /**
   * 方法验证
   */
  validateMethod (allowedMethod = 'GET') {
    if (this.req.method !== allowedMethod) {
      sendMethodNotAllowed(this.res, allowedMethod)
      return false
    }
    return true
  }

  /**
   * 错误处理
   */
  handleError (error, customMessage) {
    logger.error(`API错误: ${error.message}`)
    logger.debug(error.stack)
    sendError(this.res, {
      message: customMessage || '请求处理失败',
      error
    })
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
}
