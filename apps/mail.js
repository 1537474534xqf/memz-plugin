import notifier from 'mail-notifier'
import nodemailer from 'nodemailer'
import { Config } from '#components'

const REDIS_KEY_PREFIX = 'MEMZ:mail:sent:'
const REDIS_EXPIRE = 7 * 24 * 60 * 60 // 7天过期
let mailId = 0 // 邮件ID计数器

export class MailNotifier extends plugin {
  constructor () {
    super({
      name: '邮件通知',
      dsc: '邮件转发通知',
      event: 'message',
      priority: 5,
      rule: []
    })

    this.mailNotifiers = new Map()
    this.connecting = new Set() // 记录正在连接的邮箱

    this.task = [
      {
        cron: '0 */5 * * * ?',
        name: '检查邮箱连接',
        fnc: () => this.checkConnections()
      }
    ]

    this.initConnections()
  }

  async checkConnections () {
    logger.info('[邮件通知] 开始检查邮箱连接...')
    const enabledConfigs = this.getEnabledMailConfigs()

    for (const mailConfig of enabledConfigs) {
      const notifier = this.mailNotifiers.get(mailConfig.name)
      // 检查连接是否存在且正常
      if (!notifier?.connected && !this.connecting.has(mailConfig.name)) {
        logger.warn(`[邮件通知] ${mailConfig.name} 未连接或连接异常,尝试重连`)
        await this.reconnectMailbox(mailConfig)
      }
    }

    logger.info('[邮件通知] 检查邮箱连接完成')
  }

  getEnabledMailConfigs () {
    const { imapMail } = Config.getConfig('config')
    return imapMail?.filter(config => config.enable !== false) || []
  }

  async initConnections () {
    const enabledConfigs = this.getEnabledMailConfigs()
    if (!enabledConfigs.length) {
      logger.warn('[邮件通知] 未配置启用的邮箱')
      return
    }

    // 逐个初始化连接
    for (const mailConfig of enabledConfigs) {
      // 如果已经在连接或已经连接成功,则跳过
      if (this.connecting.has(mailConfig.name) || this.mailNotifiers.get(mailConfig.name)?.connected) {
        logger.info(`[邮件通知] ${mailConfig.name} 已在连接或已连接,跳过初始化`)
        continue
      }
      await this.createConnection(mailConfig)
    }
  }

  async createConnection (mailConfig) {
    // 防止重复连接
    if (this.connecting.has(mailConfig.name)) {
      logger.info(`[邮件通知] ${mailConfig.name} 正在连接中,跳过`)
      return
    }

    this.connecting.add(mailConfig.name)

    try {
      const config = {
        user: mailConfig.username,
        password: mailConfig.password,
        host: mailConfig.host,
        port: mailConfig.port,
        tls: mailConfig.tls,
        tlsOptions: { rejectUnauthorized: false },
        box: 'INBOX',
        connTimeout: 10000,
        authTimeout: 10000,
        autoReconnect: true
      }

      // 先关闭已存在的连接
      const existingNotifier = this.mailNotifiers.get(mailConfig.name)
      if (existingNotifier) {
        try {
          existingNotifier.stop()
        } catch (err) {
          logger.error(`[邮件通知] ${mailConfig.name} 关闭旧连接失败:`, err)
        }
        this.mailNotifiers.delete(mailConfig.name)
      }

      const mailNotifier = notifier(config)

      mailNotifier
        .on('mail', async mail => {
          try {
            await this.handleNewMail(mail, mailConfig)
          } catch (err) {
            logger.error(`[邮件通知] ${mailConfig.name} 处理邮件失败:`, err)
          }
        })
        .on('error', err => {
          logger.error(`[邮件通知] ${mailConfig.name} 出错:`, err)
          this.reconnectMailbox(mailConfig)
        })
        .on('end', () => {
          logger.warn(`[邮件通知] ${mailConfig.name} 连接断开,尝试重连`)
          this.reconnectMailbox(mailConfig)
        })
        .on('connected', () => {
          logger.info(`[邮件通知] ${mailConfig.name} 连接成功`)
        })

      await new Promise((resolve, reject) => {
        let connected = false

        mailNotifier.start()
        logger.info(`[邮件通知] ${mailConfig.name} 监听启动成功`)

        mailNotifier.once('connected', () => {
          connected = true
          resolve()
        })

        mailNotifier.once('error', err => {
          if (!connected) reject(err)
        })

        setTimeout(() => {
          if (!connected) reject(new Error('连接超时'))
        }, 30000)
      })

      this.mailNotifiers.set(mailConfig.name, mailNotifier)
      logger.info(`[邮件通知] ${mailConfig.name} 连接创建成功`)
    } catch (err) {
      logger.error(`[邮件通知] ${mailConfig.name} 连接失败:`, err)
      setTimeout(() => this.reconnectMailbox(mailConfig), 5000)
    } finally {
      this.connecting.delete(mailConfig.name)
    }
  }

  async handleNewMail (mail, mailConfig) {
    try {
      // 生成唯一ID
      const messageId = mail.messageId || `${mail.date?.getTime()}-${Math.random()}`
      const redisKey = REDIS_KEY_PREFIX + messageId

      // 检查是否处理过
      const hasSent = await redis.get(redisKey)
      if (hasSent) {
        logger.debug(`[邮件通知] 邮件已处理: ${messageId}`)
        return
      }

      logger.info(`[邮件通知] ${mailConfig.name} 收到新邮件: ${mail.subject || '无主题'}`)

      // 构建消息内容
      const forwardMsg = await this.buildForwardMsg(mail, mailConfig)
      const { sendType = 1, groups = [], users = [] } = mailConfig

      if (!sendType || (!groups.length && !users.length)) {
        logger.warn(`[邮件通知] ${mailConfig.name} 未配置发送目标`)
        return
      }

      const sendPromises = []

      // 群发送
      if (sendType === 1 || sendType === 3) {
        for (const groupId of groups) {
          sendPromises.push(
            Bot.pickGroup(groupId).sendMsg(forwardMsg)
              .then(() => logger.info(`[邮件通知] 发送到群 ${groupId} 成功`))
              .catch(err => logger.error(`[邮件通知] 发送到群 ${groupId} 失败:`, err))
          )
        }
      }

      // 私聊发送
      if (sendType === 2 || sendType === 3) {
        for (const userId of users) {
          sendPromises.push(
            Bot.pickUser(userId).sendMsg(forwardMsg)
              .then(() => logger.info(`[邮件通知] 发送到用户 ${userId} 成功`))
              .catch(err => logger.error(`[邮件通知] 发送到用户 ${userId} 失败:`, err))
          )
        }
      }

      // 等待所有发送完成
      const results = await Promise.allSettled(sendPromises)
      const successCount = results.filter(r => r.status === 'fulfilled').length
      const failCount = results.filter(r => r.status === 'rejected').length

      if (successCount > 0) {
        await redis.set(redisKey, '1', { EX: REDIS_EXPIRE })
        logger.info(`[邮件通知] ${mailConfig.name} 邮件发送完成: 成功 ${successCount} 个，失败 ${failCount} 个`)
      } else {
        logger.error(`[邮件通知] ${mailConfig.name} 所有发送均失败`)
      }
    } catch (err) {
      logger.error(`[邮件通知] ${mailConfig.name} 处理邮件失败:`, err)
    }
  }

  async buildForwardMsg (mail, mailConfig) {
    const messages = []
    const now = new Date()

    // 邮箱信息
    messages.push({
      user_id: Bot.uin,
      nickname: '邮件通知',
      message: `来自邮箱: ${mailConfig.name}`
    })

    // 基本信息
    const fromInfo = mail.from?.[0] || mail.from
    const fromName = fromInfo?.name || fromInfo?.address || '未知'
    const fromAddr = fromInfo?.address ? `<${fromInfo.address}>` : ''

    messages.push({
      user_id: Bot.uin,
      nickname: '邮件详情',
      message: [
        `标题: ${mail.subject || '无主题'}`,
        `发件人: ${fromName} ${fromAddr}`,
        `时间: ${mail.date ? new Date(mail.date).toLocaleString() : now.toLocaleString()}`
      ].join('\n')
    })

    // 正文处理
    let content = ''
    if (mail.text) {
      content = mail.text
    } else if (mail.html) {
      // 简单处理HTML
      content = mail.html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
    }

    if (content) {
      // 截取合适长度的正文
      const maxLength = 3000
      content = content.length > maxLength
        ? content.slice(0, maxLength) + '...(内容过长已截断)'
        : content

      messages.push({
        user_id: Bot.uin,
        nickname: '邮件正文',
        message: content.trim() || '(空正文)'
      })
    }

    // 附件信息
    if (mail.attachments?.length) {
      const attachmentMsg = mail.attachments.map((att, index) => {
        const filename = att.filename || att.contentType || '未知文件名'
        const size = this.formatSize(att.size || 0)
        return `附件${index + 1}: ${filename} (${size})`
      }).join('\n')

      messages.push({
        user_id: Bot.uin,
        nickname: '附件信息',
        message: attachmentMsg
      })
    }

    return Bot.makeForwardMsg(messages)
  }

  formatSize (bytes) {
    if (!bytes) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
  }

  async reconnectMailbox (mailConfig) {
    if (!mailConfig.enable || this.connecting.has(mailConfig.name)) return

    const notifier = this.mailNotifiers.get(mailConfig.name)
    if (notifier) {
      try {
        notifier.stop()
      } catch (err) {
        logger.error(`[邮件通知] ${mailConfig.name} 关闭连接失败:`, err)
      }
      this.mailNotifiers.delete(mailConfig.name)
    }

    logger.info(`[邮件通知] ${mailConfig.name} 尝试重新连接...`)
    await this.createConnection(mailConfig)
  }
}

export class MailSender extends plugin {
  constructor () {
    super({
      name: '邮件发送',
      dsc: '发送邮件',
      event: 'message',
      priority: 5,
      rule: [
        {
          reg: '^#(\\d+)?发邮件(.+)$',
          fnc: 'sendMail'
        }
      ]
    })
  }

  // 获取指定ID的邮箱配置
  getMailConfig (id) {
    const { smtpMail, smtpMailId } = Config.getConfig('config')
    const configId = id ?? smtpMailId ?? 0
    return smtpMail?.find(config => config.enable && config.id === configId)
  }

  // 创建SMTP传输对象
  createTransporter (mailConfig) {
    return nodemailer.createTransport({
      host: mailConfig.host,
      port: mailConfig.port,
      secure: true, // 使用SSL
      auth: {
        user: mailConfig.username,
        pass: mailConfig.password
      }
    })
  }

  async sendMail (e) {
    // 解析命令
    const match = e.msg.match(/^#(\\d+)?发邮件(.+)$/)
    if (!match) return false

    const configId = parseInt(match[1]) || undefined // 不传ID则使用默认值
    const content = match[2].trim()

    // 获取邮箱配置
    const mailConfig = this.getMailConfig(configId)
    if (!mailConfig) {
      e.reply(`未找到${configId ? `ID为 ${configId} 的` : '默认'}邮箱配置`)
      return false
    }

    // 解析邮件内容
    const parts = content.split('|')
    if (parts.length < 2) {
      e.reply('格式错误: 请使用 邮箱地址|主题|内容 或 邮箱地址|内容 的格式')
      return false
    }

    const to = parts[0].trim()
    const subject = parts.length > 2 ? parts[1].trim() : '无主题'
    const text = parts[parts.length > 2 ? 2 : 1].trim()

    try {
      // 创建传输对象
      const transporter = this.createTransporter(mailConfig)

      // 生成邮件ID
      mailId++
      const messageId = `${mailId}@${mailConfig.host}`

      // 发送邮件
      await transporter.sendMail({
        from: `"${mailConfig.name}" <${mailConfig.username}>`,
        to,
        subject,
        text,
        messageId
      })

      logger.info(`[邮件发送] ${mailConfig.name}(${mailConfig.username}) 发送成功: ${messageId}`)
      e.reply('邮件发送成功!')
      return true
    } catch (err) {
      logger.error(`[邮件发送] ${mailConfig.name} 发送失败:`, err)
      e.reply(`邮件发送失败: ${err.message}`)
      return false
    }
  }
}
