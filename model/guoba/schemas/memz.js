export default [
  {
    label: '基础配置',
    component: 'SOFT_GROUP_BEGIN'
  },
  {
    component: 'Divider',
    label: '插件设置'
  },
  {
    field: 'memz.SystemStatusAll',
    label: '系统状态',
    bottomHelpMessage: '关闭时仅主人可用',
    component: 'Switch'
  },
  {
    field: 'memz.RedisStatusAll',
    label: 'Redis状态',
    bottomHelpMessage: '关闭时仅主人可用',
    component: 'Switch'
  },
  {
    field: 'memz.MEMZRestart',
    label: '劫持重启',
    bottomHelpMessage: '劫持Miao-Yunzai的重启,变成前台重启,只支持Windows系统',
    component: 'Switch'
  },
  {
    label: '群聊功能',
    component: 'SOFT_GROUP_BEGIN'
  },
  {
    component: 'Divider',
    label: '群聊功能'
  },
  {
    field: 'memz.atalltext',
    label: '艾特全体文本',
    bottomHelpMessage: '艾特全体后面跟的文本,留空为不添加文本',
    component: 'Input',
    componentProps: {
      placeholder: '请输入艾特全体文本'
    }
  },
  {
    field: 'memz.atChunkSize',
    label: '艾特全体分片',
    bottomHelpMessage: '一条消息AT多少个群友,不建议太多',
    component: 'InputNumber',
    componentProps: {
      addonAfter: '个'
    }
  },
  {
    field: 'memz.whoAtmeTime',
    label: '谁艾特我保留',
    bottomHelpMessage: '谁艾特我保留时长,单位小时',
    component: 'InputNumber',
    componentProps: {
      addonAfter: '小时'
    }
  },
  {
    field: 'memz.helpMaster',
    label: '主人解禁',
    bottomHelpMessage: '主人被禁言自动解禁',
    component: 'Switch'
  },
  {
    field: 'memz.helpMasterText',
    label: '解禁提示语',
    bottomHelpMessage: '主人被禁言自动解禁提示语',
    component: 'Input',
    componentProps: {
      placeholder: '请输入自动解禁提示语,留空为不发送提示语'
    }
  },
  {
    field: 'memz.nohelpMasterText',
    label: '无法解禁提示语',
    bottomHelpMessage: '主人被禁言救不了提示语',
    component: 'Input',
    componentProps: {
      placeholder: '请输入无法解禁提示语,留空为不发送提示语'
    }
  },
  {
    field: 'memz.GroupScheduler',
    label: '定时群发',
    bottomHelpMessage: '定时群发某消息到指定群',
    component: 'Switch'
  },
  {
    field: 'memz.GroupSchedulerCron',
    label: '定时群发',
    helpMessage: '修改后重启生效',
    bottomHelpMessage: '定时群发CRON表达式',
    component: 'EasyCron',
    componentProps: {
      placeholder: '请输入Cron表达式'
    }
  },
  {
    field: 'memz.GroupSchedulerMsg',
    label: '定时群发内容',
    bottomHelpMessage: '如果要发送多条消息,使用|隔开,例如: #赞我|#全部赞我',
    component: 'Input',
    componentProps: {
      placeholder: '请输入群发内容'
    }
  },
  {
    field: 'memz.GroupSchedulerGroup',
    helpMessage: '定时群发群列表',
    label: '群发群列表',
    componentProps: {
      placeholder: '点击选择要群发的群'
    },
    component: 'GSelectGroup'
  },
  {
    field: 'memz.GroupSchedulerWhiteBotList',
    label: '群发白名单bot',
    component: 'GTags',
    componentProps: {
      allowAdd: true,
      allowDel: true
    }
  },
  {
    field: 'memz.GroupSchedulerBlackBotList',
    label: '群发黑名单bot',
    component: 'GTags',
    componentProps: {
      allowAdd: true,
      allowDel: true
    }
  },
  {
    label: '个人功能',
    component: 'SOFT_GROUP_BEGIN'
  },
  {
    component: 'Divider',
    label: '个人功能'
  },
  {
    field: 'memz.AutoLike',
    label: '自动点赞',
    bottomHelpMessage: '每日 00:00 自动点赞',
    component: 'Switch'
  },
  {
    field: 'memz.AutoLikeList',
    label: '自动点赞列表',
    bottomHelpMessage: '填入QQ号,主人默认在点赞列表,无需添加',
    component: 'GTags'
  },
  {
    label: '工具设置',
    component: 'SOFT_GROUP_BEGIN'
  },
  {
    component: 'Divider',
    label: '工具设置'
  },
  {
    field: 'memz.WhoisAll',
    label: 'Whois',
    bottomHelpMessage: '关闭时仅主人可用',
    component: 'Switch'
  },
  {
    field: 'memz.SeoAll',
    label: 'SEO',
    bottomHelpMessage: '关闭时仅主人可用',
    component: 'Switch'
  },
  {
    field: 'memz.httpStatusAll',
    label: 'http状态查询',
    bottomHelpMessage: '关闭时仅主人可用',
    component: 'Switch'
  },
  {
    field: 'memz.SslInfoAll',
    label: 'SSL证书信息查询',
    bottomHelpMessage: '关闭时仅主人可用',
    component: 'Switch'
  },
  {
    field: 'memz.icpBeianAll',
    label: '域名备案查询',
    bottomHelpMessage: '关闭时仅主人可用',
    component: 'Switch'
  },
  {
    field: 'memz.DomainMinPricingAll',
    label: '域名价格查询',
    bottomHelpMessage: '域名常规最低价格查询(常规),关闭时仅主人可用',
    component: 'Switch'
  },
  {
    field: 'memz.webpage',
    label: '网页截图',
    bottomHelpMessage: '关闭时仅主人可用',
    component: 'Switch'
  },
  {
    field: 'memz.PingAll',
    label: 'Ping功能',
    bottomHelpMessage: '关闭时仅主人可用',
    component: 'Switch'
  },
  {
    field: 'memz.PingApi',
    label: 'Ping类型',
    bottomHelpMessage: 'itdog暂时不可用http测速',
    component: 'Select',
    componentProps: {
      options: [
        { label: 'ZHALEMA', value: 1 },
        { label: 'ITDOG', value: 2 }
      ],
      placeholder: '请选择Ping类型'
    }
  },
  {
    field: 'memz.PingProxy',
    label: 'Ping代理',
    bottomHelpMessage: '用于一些服务器无法访问ZHALE.MA/ITDOG.CN的情况',
    component: 'Switch'
  },
  {
    field: 'memz.PingProxyAddress',
    label: 'Ping代理地址',
    bottomHelpMessage: '支持HTTP/SOCKS5协议,SOCKS5不可用带有用户身份验证的',
    component: 'Input',
    componentProps: {
      placeholder: '代理地址'
    }
  },
  {
    field: 'memz.IpinfoAll',
    label: 'Ipinfo',
    bottomHelpMessage: '关闭时仅主人可用',
    component: 'Switch'
  },
  {
    field: 'memz.IpinfoApi',
    label: 'IpInfo接口',
    bottomHelpMessage: 'Ipinfo.io需要先配置token',
    component: 'Select',
    componentProps: {
      options: [
        { label: 'IpInfo.io', value: 1 },
        { label: 'BiliBili接口', value: 2 }
      ],
      placeholder: '请选择使用的IpInfo接口'
    }
  },
  {
    field: 'memz.IpinfoToken',
    label: 'Ipinfo.io的Token',
    bottomHelpMessage: '前往 https://ipinfo.io 注册账号并获取 Token',
    component: 'InputPassword',
    componentProps: {
      placeholder: 'Token'
    }
  },
  {
    field: 'memz.UnicodeAll',
    label: 'Unicode编码解码',
    bottomHelpMessage: '关闭时仅主人可用',
    component: 'Switch'
  },
  {
    field: 'memz.UrlAll',
    label: 'Url编码解码',
    bottomHelpMessage: '关闭时仅主人可用',
    component: 'Switch'
  },
  {
    field: 'memz.BaseConversionAll',
    label: '进制转换',
    bottomHelpMessage: '关闭时仅主人可用',
    component: 'Switch'
  },
  {
    field: 'memz.getFaviconAll',
    label: '获取网站图标',
    bottomHelpMessage: '关闭时仅主人可用',
    component: 'Switch'
  },
  {
    label: '网络搜索',
    component: 'SOFT_GROUP_BEGIN'
  },
  {
    component: 'Divider',
    label: '网络搜索设置'
  },
  {
    field: 'memz.SearchMovie',
    label: '搜影视',
    bottomHelpMessage: '使用API搜索影视资源,关闭时仅主人可用',
    component: 'Switch'
  },
  {
    field: 'memz.SearchResource',
    label: '搜资源',
    bottomHelpMessage: '搜索本地xlsx文件的游戏,关闭时仅主人可用',
    component: 'Switch'
  },
  {
    field: 'memz.threshold',
    label: '搜资源阈值',
    bottomHelpMessage: '搜资源阈值,模糊匹配的宽松度,范围 0-1,值越小，表示匹配的结果越严格，越大则表示匹配的宽松度越高',
    component: 'InputNumber',
    componentProps: {
      min: 0,
      max: 1
    }
  },
  {
    field: 'memz.SearchMagnet',
    label: '磁力搜索',
    bottomHelpMessage: '由于内容涉及违规, 不建议开启,关闭时仅主人可用',
    component: 'Switch'
  }
]
