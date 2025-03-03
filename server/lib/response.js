import { copyright } from '#components'

/**
 * 统一的成功响应
 */
export const sendSuccess = (res, { title, data, message = '获取成功' }) => {
  res.status(200).json({
    code: 0,
    message,
    title,
    time: new Date().toISOString(),
    data,
    copyright
  })
}

/**
 * 统一的错误响应
 */
export const sendError = (res, { code = 500, message, error }) => {
  res.status(code).json({
    code,
    message,
    time: new Date().toISOString(),
    error: error?.message || error,
    copyright
  })
}

/**
 * 参数验证错误
 */
export const sendParamError = (res, message) => {
  sendError(res, {
    code: 400,
    message: message || '请求参数错误'
  })
}

/**
 * 方法不允许
 */
export const sendMethodNotAllowed = (res, allowedMethod = 'GET') => {
  res.status(405)
    .set('Allow', allowedMethod)
    .json({
      code: 405,
      message: `仅支持 ${allowedMethod} 请求`,
      copyright
    })
}
