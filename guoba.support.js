import lodash from 'lodash'
import { Config, PluginPath } from './components/index.js'

export function supportGuoba () {
  return {
    pluginInfo: {
      name: 'memz-plugin',
      title: 'memz-plugin',
      author: '@MEMZJS',
      authorLink: 'https://gitee.com/memzjs',
      link: 'https://gitee.com/memzjs/memz-plugin',
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
          field: 'memz.webpage',
          label: '网页截图',
          bottomHelpMessage: '关闭时仅主人可用',
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
          field: 'api.port',
          label: 'API服务端口',
          bottomHelpMessage: '启动API服务时占用的端口号,不要与其他端口重复',
          component: 'InputNumber',
          componentProps: {
            placeholder: '请输入端口号'
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
        },
        {
          component: 'Divider',
          label: '仓库更新推送设置'
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
          field: 'memz.PingAll',
          label: 'Ping功能',
          bottomHelpMessage: '关闭时仅主人可用',
          component: 'Switch'
        },
        {
          field: 'memz.PingApi',
          label: 'Ping类型',
          bottomHelpMessage: '建议ZHALIMA,Ipinfo暂时不可用http/tcping',
          component: 'Select',
          componentProps: {
            options: [
              { label: 'ZHALEMA', value: 1 },
              { label: 'IpInfo', value: 2 }
            ],
            placeholder: '请选择Ping类型'
          }
        },
        {
          field: 'memz.PingProxy',
          label: 'Ping代理',
          bottomHelpMessage: '用于一些服务器无法访问ZHALE.MA的情况',
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
          field: 'memz.search_movie',
          label: '搜影视',
          bottomHelpMessage: '使用API搜索影视资源,关闭时所有人不可用',
          component: 'Switch'
        },
        {
          field: 'memz.search_resource',
          label: '搜资源',
          bottomHelpMessage: '搜索本地xlsx文件的游戏,关闭时所有人不可用',
          component: 'Switch'
        },
        {
          field: 'memz.search_magnet',
          label: '磁力搜索',
          bottomHelpMessage: '由于内容涉及违规, 不建议开启,关闭时仅主人可用',
          component: 'Switch'
        }
        // {
        //   field: "memz.apply_game",
        //   label: "是否开启申请游戏",
        //   bottomHelpMessage: "关闭时所有人不可用",
        //   component: "Switch",
        // },
      ],
      getConfigData () {
        return {
          memz: Config.getDefOrConfig('memz'),
          update: Config.getDefOrConfig('update'),
          api: Config.getDefOrConfig('api')
        }
      },
      setConfigData (data, { Result }) {
        let config = Config.getCfg()

        for (const key in data) {
          let split = key.split('.')
          if (lodash.isEqual(config[split[1]], data[key])) continue
          Config.modify(split[0], split[1], data[key])
        }
        return Result.ok({}, '𝑪𝒊𝒂𝒍𝒍𝒐～(∠・ω< )⌒★')
      }
    }
  }
}
