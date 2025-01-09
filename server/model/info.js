import fs from 'fs'
import moment from 'moment'
import { Config } from '#components'

// 缓存用户信息
const UserInfoPath = 'resources/查询信息.json'
if (!Bot.UserInfo) {
  if (fs.existsSync(UserInfoPath)) {
    Bot.UserInfo = JSON.parse(fs.readFileSync(UserInfoPath, 'utf8'))
  } else {
    Bot.UserInfo = {}
  }
}

/**
 * 获取用户信息
 * @param {string} qq - QQ号
 * @param {boolean} force - 是否强制刷新缓存
 * @param {boolean} debug - 是否开启调试模式
 * @returns {Object} - 返回用户信息对象
 */
export async function getUserInfo (qq, force = false) {
  const { ICQQBotQQ } = Config.getConfig('icqq')

  if ((Bot.UserInfo?.[qq] && Date.now() - Bot.UserInfo[qq].updateTime < 1 * 60 * 60 * 1000) && !force) {
    // 如果缓存有效且不强制刷新，则直接返回缓存
    return Bot.UserInfo[qq]
  }

  logger.info('[查询] 更新数据')

  let list = [
    20002, // 昵称
    27394, // QID
    20009, // 性别
    20031, // 生日
    101, // 头像
    103,
    102, // 简介/签名
    20022, 20023, 20024, 24002, 27037, 27049, 20011,
    20016, // 手机号
    20021, // 学校
    20003, // 国家
    20004, // 省份
    20005, 20006,
    20020, // 城市
    20026, // 注册时间
    24007,
    104, // 标签列表
    105, // 等级
    42432, 42362, 41756, 41757, 42257,
    27372, // 状态
    42315,
    107, // 业务列表
    45160, 45161,
    27406, // 自定义状态文本
    62026,
    20037 // 年龄
  ]

  let ret = await Bot[ICQQBotQQ].sendOidbSvcTrpcTcp('OidbSvcTrpcTcp.0xfe1_2', {
    1: Number(qq),
    2: 0,
    3: list.map(i => ({ 1: i }))
  })

  if (!Array.isArray(ret[1][2][1])) {
    let result = {
      qq: ret[1][3]?.toString() || qq,
      msg: '查询失败',
      updateTime: Date.now()
    }
    Bot.UserInfo[result.qq] = result
    return result
  }

  const GetStringProperties = (bytesProperties) => {
    let ret = {}
    for (let i of bytesProperties) {
      ret[i[1]] = i[2]
    }
    return ret
  }

  const GetNumberProperties = (numberProperties) => {
    let ret = {}
    for (let i of numberProperties) {
      ret[i[1]] = i[2]
    }
    return ret
  }

  // 生日
  const getBirthday = (bin) => {
    if (!bin) return '未设置/未公开'
    bin = bin.encoded
    let year = bin.readUInt16BE(0)
    let month = bin.readUInt8(2)
    let day = bin.readUInt8(3)
    if (year !== 0 && month >= 1 && month <= 12 && day >= 1 && day <= moment(year, 'YYYY').daysInMonth()) {
      return moment(new Date(year, month - 1, day)).format('YYYY-MM-DD')
    }
    return '未设置/未公开'
  }

  // 在线状态
  const getStatus = (status) => {
    const statusMap = {
      0: '离线',
      1: '在线',
      3: '离开',
      4: '隐身/离线',
      5: '忙碌',
      6: 'Q我吧',
      7: '请勿打扰',
      263169: '听歌中',
      15205121: '我的电量',
      16713473: '做好事',
      13829889: '出去浪',
      14616321: '去旅行',
      14550785: '被掏空',
      14747393: '今日步数',
      394241: '今日天气',
      14878465: '我crush了',
      14026497: '爱你',
      1770497: '恋爱中',
      3081217: '好运锦鲤',
      11600897: '水逆退散',
      2098177: '嗨到飞起',
      2229249: '元气满满',
      2556929: '一言难尽',
      13698817: '难得糊涂',
      7931137: 'emo中',
      2491393: '我太难了',
      14485249: '我想开了',
      1836033: '我没事',
      2425857: '想静静',
      2294785: '悠哉哉',
      15926017: '信号弱',
      16253697: '睡觉中',
      14419713: '肝作业',
      16384769: '学习中',
      15140609: '搬砖中',
      1312001: '摸鱼中',
      2360321: '无聊中',
      197633: 'timi中',
      15271681: '一起元梦',
      15337217: '求星搭子',
      525313: '熬夜中',
      16581377: '追剧中',
      13633281: '自定义状态'
    }
    return statusMap?.[status] || '未知状态'
  }

  const toStr = (bytesProperties) => bytesProperties?.toString() || ''

  const bytesProperties = GetStringProperties(ret[1][2][2])
  const numberProperties = GetNumberProperties(ret[1][2][1])

  // 状态ID
  let statusId = numberProperties[27372]
  let mask = (268435455 - statusId) >> 31
  mask = mask & 1
  if (mask) {
    statusId -= 268435456
  }

  let custom = {}
  if (bytesProperties[27406].length !== 0) {
    custom.faceId = bytesProperties[27406][1]
    custom.msg = toStr(bytesProperties[27406][2])
  }

  let business = []
  if (bytesProperties[107]?.[3]?.[3]?.length) {
    let businessList = bytesProperties[107][3][3]
    for (let i of Array.isArray(businessList) ? businessList : [businessList]) {
      let type = i[1]
      let isPro = i[5]
      let isYear = i[3]
      let _name = {
        113: 'QQ大会员',
        1: 'QQ会员',
        102: '黄钻',
        117: 'QQ集卡',
        119: '情侣会员',
        103: '绿钻',
        4: '腾讯视频会员',
        108: '大王超级会员',
        104: '情侣个性钻',
        105: '微云会员',
        101: '红钻',
        115: 'cf游戏特权',
        118: '蓝钻',
        107: 'SVIP+腾讯视频会员',
        109: 'SVIP+QQ音乐'
      }
      business.push({
        type,
        name: (isYear === 1 ? '年会' : '') + (isPro === 1 ? '超级' : '') + (_name[type] || '未知'),
        level: i[4],
        icon: toStr(i[6])
      })
    }
  }

  // 将结果保存到缓存
  let result = {
    QQ号: ret[1][3]?.toString() || qq,
    msg: '查询成功',
    昵称: bytesProperties[20002],
    QID: bytesProperties[27394],
    性别: bytesProperties[20009],
    生日: getBirthday(bytesProperties[20031]),
    头像: bytesProperties[101],
    签名: bytesProperties[102],
    address: {
      国家: bytesProperties[20003],
      省份: bytesProperties[20004],
      城市: bytesProperties[20020]
    },
    业务列表: business,
    在线状态: getStatus(statusId),
    自定义状态: custom,
    等级: numberProperties[105],
    标签列表: bytesProperties[104],
    注册时间: numberProperties[20026],
    更新时间: Date.now()
  }

  Bot.UserInfo[result.qq] = result
  return result
}
