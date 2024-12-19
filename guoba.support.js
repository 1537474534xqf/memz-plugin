import lodash from 'lodash'
import { Config, PluginPath } from '#components'

export function supportGuoba () {
  return {
    pluginInfo: {
      name: 'memz-plugin',
      title: 'memz-plugin',
      author: '@MEMZJS',
      authorLink: 'https://gitee.com/memzjs',
      link: 'https://github.com/MEMZ-MapleLeaf/memz-plugin',
      isV3: true,
      isV2: false,
      description: 'Yunzai-Bot插件',
      iconPath: `${PluginPath}/resources/memz.gif`
    },
    configInfo: {
      schemas: [
        {
          component: 'Divider',
          label: '插件设置'
        },
        {
          field: 'update.autoupdate',
          label: '插件自动更新',
          bottomHelpMessage: '插件更新时自动更新插件',
          component: 'Switch'
        },
        {
          field: 'update.updatecron',
          label: '自动更新',
          helpMessage: '修改后重启生效',
          bottomHelpMessage: '自动更新插件',
          component: 'EasyCron',
          componentProps: {
            placeholder: '请输入Cron表达式'
          }
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
          component: 'Divider',
          label: '群聊功能'
        },
        {
          field: 'memz.atalltext',
          label: '艾特全体文本',
          bottomHelpMessage: '艾特全体后面跟的文本,none为不添加文本',
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
          component: 'Divider',
          label: '仓库更新推送'
        },
        {
          field: 'update.checkupdate',
          label: '自动检查仓库更新',
          bottomHelpMessage: '检查插件更新并推送到主人',
          component: 'Switch'
        },
        {
          field: 'update.CUSTOM_REPOSITORY',
          label: '仓库链接',
          bottomHelpMessage: '填入仓库链接,如https://gitee.com/memzjs/memz-plugin,支持Gitee/Github',
          component: 'GTags',
          componentProps: {
            allowAdd: true,
            allowDel: true
          }
        },
        {
          field: 'update.cron',
          label: '自动检查仓库更新',
          helpMessage: '修改后重启生效',
          bottomHelpMessage: '自动检查仓库更新Cron表达式',
          component: 'EasyCron',
          componentProps: {
            placeholder: '请输入Cron表达式'
          }
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
          field: 'memz.IpinfoAll',
          label: 'Ipinfo',
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
          field: 'memz.IpinfoToken',
          label: 'Ipinfo的Token',
          bottomHelpMessage: '前往 https://ipinfo.io 注册账号并获取 Token',
          component: 'Input',
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
          component: 'Divider',
          label: '网络搜索设置'
        },
        {
          field: 'memz.SearchMovie',
          label: '搜影视',
          bottomHelpMessage: '使用API搜索影视资源,关闭时所有人不可用',
          component: 'Switch'
        },
        {
          field: 'memz.SearchResource',
          label: '搜资源',
          bottomHelpMessage: '搜索本地xlsx文件的游戏,关闭时所有人不可用',
          component: 'Switch'
        },
        {
          field: 'memz.SearchMagnet',
          label: '磁力搜索',
          bottomHelpMessage: '由于内容涉及违规, 不建议开启,关闭时仅主人可用',
          component: 'Switch'
        },
        {
          component: 'Divider',
          label: 'API服务端设置'
        },
        {
          field: 'api.enabled',
          label: 'API服务',
          bottomHelpMessage: '是否开启API服务,重启生效',
          component: 'Switch'
        },
        {
          field: 'api.host',
          label: 'host',
          bottomHelpMessage: '0.0.0.0 表示监听所有IP(公网可访问)',
          component: 'Input'
        },
        {
          field: 'api.apidomain',
          label: 'API自定义域名',
          bottomHelpMessage: '加载时显示,不填就不显示,目前无法自动绑定域名',
          component: 'Input'
        },
        {
          field: 'api.port',
          label: 'API服务端口',
          bottomHelpMessage: '启动API服务时占用的端口号,不要与其他端口重复',
          component: 'InputNumber',
          componentProps: {
            placeholder: '请输入端口号'
          }
        },
        {
          field: 'api.apiby',
          label: '署名',
          bottomHelpMessage: '在API返回结果上加上署名',
          component: 'Input'
        },
        {
          field: 'api.redisExpire',
          label: '统计数据过期时间',
          bottomHelpMessage: '单位为秒,填入0表示永不过期',
          component: 'InputNumber',
          componentProps: {
            placeholder: '请输入过期时间',
            addonAfter: '秒'
          }
        },
        {
          field: 'api.httpsenabled',
          label: 'HTTPS服务',
          bottomHelpMessage: '开启前请配置 SSL 证书,重启生效',
          component: 'Switch'
        },
        {
          field: 'api.httpskey',
          label: 'HTTPS私钥文件路径',
          bottomHelpMessage: '请输入私钥文件路径,不开启HTTPS服务时无需配置',
          component: 'Input'
        },
        {
          field: 'api.httpscert',
          label: 'HTTPS证书文件路径',
          bottomHelpMessage: '请输入证书文件路径,不开启HTTPS服务时无需配置',
          component: 'Input'
        },
        {
          field: 'api.corsenabled',
          label: 'CORS跨域',
          bottomHelpMessage: '開啟後,服务器会自动添加 Access-Control-Allow-Origin 头',
          component: 'Switch'
        },
        {
          field: 'api.corsorigin',
          label: 'API来源',
          bottomHelpMessage: '* 表示允许所有来源访问,可以指定具体的 URL，例如 http://example.com',
          component: 'Input',
          componentProps: {
            placeholder: '来源'
          }
        },
        {
          field: 'api.rateLimitwindowMs',
          label: '请求速率时间窗口',
          component: 'InputNumber',
          componentProps: {
            placeholder: '请输入时间窗口',
            addonAfter: '毫秒'
          }
        },
        {
          field: 'api.rateLimitmax',
          label: '每秒最大请求数',
          bottomHelpMessage: '每个时间窗口内最多允许一个IP发送的请求数',
          component: 'InputNumber',
          componentProps: {
            placeholder: '请求数',
            addonAfter: '次'
          }
        }
      ],
      getConfigData () {
        return {
          config: Config.getDefOrConfig('config'),
          memz: Config.getDefOrConfig('memz'),
          update: Config.getDefOrConfig('update'),
          api: Config.getDefOrConfig('api')
        }
      },
      setConfigData (data, { Result }) {
        let config = Config.getCfg()

        for (const key in data) {
          let split = key.split('.')
          let currentConfig = config

          for (let i = 0; i < split.length - 1; i++) {
            if (currentConfig[split[i]] === undefined) {
              currentConfig[split[i]] = {}
            }
            currentConfig = currentConfig[split[i]]
          }

          let lastKey = split[split.length - 1]
          if (!lodash.isEqual(currentConfig[lastKey], data[key])) {
            Config.modify(split[0], lastKey, data[key])
          }
        }
        return Result.ok({}, '𝑪𝒊𝒂𝒍𝒍𝒐～(∠・ω< )⌒★')
      }

    }
  }
}
