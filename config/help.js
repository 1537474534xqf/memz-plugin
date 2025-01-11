import { MEMZ_NAME, BotName } from '../components/index.js'
export const helpCfg = {
  themeSet: false,
  title: `${MEMZ_NAME}-HelpList`,
  subTitle: `${BotName} & ${MEMZ_NAME}`,
  colWidth: 265,
  theme: 'all',
  themeExclude: ['default'],
  colCount: 3,
  bgBlur: true
}
export const helpList = [
  {
    group: 'WebTools',
    list: [
      {
        icon: 80,
        title: '#whois+域名',
        desc: '查询域名信息'
      },
      {
        icon: 82,
        title: '#(tc)?ping+域名',
        desc: '(TC)Ping网站'
      },
      {
        icon: 83,
        title: '#http+域名',
        desc: '网站测速'
      },
      {
        icon: 87,
        title: '#http状态查询+域名',
        desc: '查询网站状态码'
      },
      {
        icon: 84,
        title: '#ipinfo+IP/域名',
        desc: 'IP信息查询'
      },
      {
        icon: 85,
        title: '#域名备案查询+域名',
        desc: 'ICP备案查询'
      },
      {
        icon: 86,
        title: '#域名查询+域名/后缀',
        desc: '域名注册商价格查询'
      },
      {
        icon: 83,
        title: '#seo+域名',
        desc: '查询域名的SEO信息'
      },
      {
        icon: 88,
        title: '#ssl证书查询+域名',
        desc: '查询网站SSL证书信息'
      },
      {
        icon: 84,
        title: '#网页截图+域名',
        desc: '网页截图'
      },
      {
        icon: 44,
        title: '#网站图标+URL',
        desc: '获取网站图标'
      }
    ]
  },
  {
    group: '编码解码功能',
    list: [
      {
        icon: 67,
        title: '#url(编码|解码)+内容',
        desc: 'URL编码,解码'
      },
      {
        icon: 68,
        title: '#ascii(编码|解码)+内容',
        desc: 'ascii(解|编)码'
      },
      {
        icon: 69,
        title: '#unicode(编码|解码)+内容',
        desc: 'unicode(解|编)码'
      },
      {
        icon: 49,
        title: '#hex(编码|解码)+内容',
        desc: 'hex(解|编)码'
      },
      {
        icon: 70,
        title: '#去空格+内容',
        desc: '去除空格'
      }
    ]
  },
  {
    group: '群聊功能',
    list: [
      {
        icon: 67,
        title: '#谁艾特我',
        desc: '哪个叼毛艾特我'
      },
      {
        icon: 68,
        title: '#一键召唤全体',
        desc: '一键@全体成员?'
      },
      {
        icon: 69,
        title: '#一键打卡',
        desc: '所有群聊一键打卡'
      },
      {
        icon: 70,
        title: '#一键群发+内容',
        desc: '一键群发消息'
      },
      {
        icon: 71,
        title: '#一键私发+内容',
        desc: '一键私发消息'
      },
      {
        icon: 72,
        title: '#保存群员名单',
        desc: '保存群员名单'
      }
    ]
  },
  {
    group: 'QQ功能',
    list: [
      {
        icon: 67,
        title: '#查Q龄',
        desc: '查询QQ注册时间'
      },
      {
        icon: 68,
        title: '#全体假禁',
        desc: '全体禁言,但是假的'
      }
    ]
  },
  {
    group: '搜索功能',
    list: [
      {
        icon: 40,
        title: '#搜资源+名称',
        desc: '搜索游戏资源'
      },
      {
        icon: 56,
        title: '#搜影视+名称',
        desc: '搜索影视资源'
      },
      {
        icon: 26,
        title: '#磁力搜索+名称',
        desc: '搜索磁力资源,违规'
      }
    ]
  },
  {
    group: 'MEMZ管理',
    auth: 'master',
    list: [
      {
        icon: 58,
        title: '#MEMZ(强制)更新',
        desc: '(强制)更新MEMZ插件'
      },
      {
        icon: 59,
        title: '#MEMZ更新日志',
        desc: '查看MEMZ插件更新日志'
      },
      {
        icon: 40,
        title: '#Redis状态(pro)',
        desc: '(文|图)查看Redis状态'
      },
      {
        icon: 48,
        title: '#系统状态(pro)',
        desc: '查看系统状态'
      }
    ]
  }
]
