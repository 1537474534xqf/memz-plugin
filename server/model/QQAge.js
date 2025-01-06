import { Config } from '#components'

const { ICQQBotQQ } = Config.getConfig('icqq')
/**
 * 获取QQ注册日期
 * @param {number} QQ - 需要查询注册日期的QQ号码
 * @returns {Promise<object|null>} 返回一个包含QQ号码和注册日期的对象，如果查询失败则返回null
 */
export async function fetchQQRegistrationDate (QQ) {
  const { fetchQQAgeAll } = Config.getConfig('icqq')
  if (!fetchQQAgeAll) {
    logger.warn('[memz-plugin] 未开启Q龄查询功能')
    return null
  }

  if (!ICQQBotQQ) {
    logger.warn('[memz-plugin] 未设置ICQQ Bot')
    return null
  }

  let body = {
    1: Number(QQ),
    2: 0,
    3: [{ 1: 20026 }]
  }

  try {
    let qqResponse = await Bot[ICQQBotQQ].sendOidbSvcTrpcTcp('OidbSvcTrpcTcp.0xfe1_2', body, { message_type: 32 })

    const registrationTimestamp = qqResponse?.[1]?.[2]?.[1]?.[2]
    if (registrationTimestamp) {
      let registrationDate = new Date(registrationTimestamp * 1000)
      let formattedDate = registrationDate.toISOString().replace('T', ' ').slice(0, 19)
      return { QQ, registrationDate: formattedDate }
    } else {
      logger.warn('未能获取到注册时间戳或数据格式不正确')
      return null
    }
  } catch (error) {
    logger.error('获取QQ注册时间时发生错误', error)
    return null
  }
}
