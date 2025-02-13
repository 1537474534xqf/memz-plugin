import logger from './logger.js'
import { sendSuccess, sendError, sendParamError, sendMethodNotAllowed } from './response.js'

export class BaseApiHandler {
/**
 * 构造函数
 * 用于初始化请求处理对象
 *
 * @param {Object} req - 请求对象，包含请求相关信息（如URL、头部等）
 * @param {Object} res - 响应对象，用于向客户端发送响应
 * @param {Object} options - 可选配置对象，用于自定义请求处理行为，默认为空对象
 */
  constructor (req, res, options = {}) {
    // 请求对象
    this.req = req
    // 响应对象
    this.res = res
    // 可选配置对象
    this.options = options
    // 如果x-forwarded-proto头部存在，则使用该值，否则根据请求连接是否加密来判断
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

      // 监听请求体错误
      this.req.on('error', err => {
        reject(err)
      })

      // 请求体大小限制
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
      // 判断参数是否为必填项且未传入
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
