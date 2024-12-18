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
        icon: 84,
        title: '#网页截图+域名',
        desc: '网页截图'
      }
    ]
  },
  {
    group: '加解码功能',
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
      },
      {
        icon: 49,
        title: '#memz检查仓库更新',
        desc: '检查仓库更新'
      }
    ]
  }
]
export const ApihelpList = [
  {
    group: '热榜',
    list: [
      {
        icon: 80,
        title: '#bilibili热榜',
        desc: '查询B站热榜'
      },
      {
        icon: 50,
        title: '#Steam热榜',
        desc: '查询Steam热门游戏'
      }

    ]
  },
  {
    group: '工具',
    list: [
      {
        icon: 70,
        title: '#whois+域名',
        desc: '查询域名信息'
      }
    ]
  }
]
