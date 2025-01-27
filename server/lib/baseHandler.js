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
   * 获取POST请求数据
   */
  getPostData () {
    return new Promise((resolve, reject) => {
      if (this.req.method !== 'POST') {
        return reject(new Error('Not POST request'))
      }

      let data = ''
      this.req.on('data', chunk => {
        data += chunk
      })

      this.req.on('end', () => {
        try {
          const body = JSON.parse(data)
          resolve(body)
        } catch (err) {
          reject(new Error('Invalid JSON'))
        }
      })

      this.req.on('error', err => {
        reject(err)
      })

      // 添加请求体大小限制
      if (this.req.headers['content-length'] > 1024 * 1024) { // 1MB
        reject(new Error('Request body too large'))
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
   */
  validateParams (params) {
    const missing = []
    for (const [key, required] of Object.entries(params)) {
      if (required && !this.url.searchParams.get(key) &&
         (this.req.method === 'POST' ? !this.req.body?.[key] : true)) {
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
