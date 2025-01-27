import { BaseApiHandler } from '../../lib/baseHandler.js'
import nodemailer from 'nodemailer'
import logger from '../../lib/logger.js'
import { Config } from '#components'

export const title = '发送邮件'
export const key = {
  mailId: '邮箱ID(可选,默认使用配置中的smtpMailId)',
  to: '收件人邮箱',
  subject: '邮件主题(可选)',
  content: '邮件内容'
}
export const description = '发送邮件'
export const method = 'POST'

const getMailConfig = (id) => {
  const { smtpMail, smtpMailId } = Config.getConfig('config')
  const configId = id ?? smtpMailId ?? 0
  return smtpMail?.find(config => config.enable && config.id === configId)
}

const createTransporter = (mailConfig) => {
  return nodemailer.createTransport({
    host: mailConfig.host,
    port: mailConfig.port,
    secure: true,
    auth: {
      user: mailConfig.username,
      pass: mailConfig.password
    }
  })
}

const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default async (req, res) => {
  const handler = new BaseApiHandler(req, res, { title })

  try {
    if (!handler.validateMethod('POST')) return

    let body
    try {
      body = await handler.getPostData()
    } catch (err) {
      if (err.message === 'Invalid JSON') {
        return handler.sendParamError('无效的JSON格式')
      } else if (err.message === 'Request body too large') {
        return handler.sendError({
          code: 413,
          message: '请求体过大'
        })
      } else {
        throw err
      }
    }

    if (!body.to || !body.content) {
      return handler.sendParamError('缺少必需参数: to 和 content')
    }

    if (!validateEmail(body.to)) {
      return handler.sendParamError('收件人邮箱格式不正确')
    }

    if (!body.content.trim()) {
      return handler.sendParamError('邮件内容不能为空')
    }
    if (body.content.length > 50000) {
      return handler.sendParamError('邮件内容过长')
    }

    if (body.subject && body.subject.length > 200) {
      return handler.sendParamError('邮件主题过长')
    }

    const mailConfig = getMailConfig(body.mailId)
    if (!mailConfig) {
      return handler.sendError({
        code: 400,
        message: `未找到${body.mailId !== undefined ? `ID为 ${body.mailId} 的` : '默认'}邮箱配置`
      })
    }

    if (!mailConfig.host || !mailConfig.port || !mailConfig.username || !mailConfig.password) {
      return handler.sendError({
        code: 500,
        message: '邮箱配置不完整'
      })
    }

    try {
      const transporter = createTransporter(mailConfig)

      const info = await transporter.sendMail({
        from: `"${mailConfig.name}" <${mailConfig.username}>`,
        to: body.to,
        subject: body.subject?.trim() || '无主题',
        text: body.content
      })

      logger.info(`[邮件API] ${mailConfig.name}(${mailConfig.username}) 发送成功`)
      handler.sendSuccess({
        response: info.response,
        from: mailConfig.username
      })
    } catch (err) {
      logger.error('[邮件API] SMTP错误:', err)
      if (err.code === 'ECONNREFUSED') {
        return handler.sendError({
          code: 500,
          message: '无法连接到SMTP服务器'
        })
      } else if (err.code === 'EAUTH') {
        return handler.sendError({
          code: 500,
          message: '邮箱认证失败'
        })
      } else {
        return handler.sendError({
          code: 500,
          message: `发送失败: ${err.message}`
        })
      }
    }
  } catch (err) {
    logger.error('[邮件API] 处理失败:', err)
    handler.handleError(err)
  }
}
