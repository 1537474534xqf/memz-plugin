export default [
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
    label: 'http状态',
    bottomHelpMessage: '关闭时仅主人可用',
    component: 'Switch'
  },
  {
    field: 'memz.SslInfoAll',
    label: 'SSL证书信息',
    bottomHelpMessage: '关闭时仅主人可用',
    component: 'Switch'
  },
  {
    field: 'memz.icpBeianAll',
    label: '域名备案',
    bottomHelpMessage: '关闭时仅主人可用',
    component: 'Switch'
  },
  {
    field: 'memz.DomainMinPricingAll',
    label: '域名价格',
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
    label: 'Ping接口',
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
        { label: 'BiliBili接口', value: 2 },
        { label: 'IP.SB接口', value: 3 },
        { label: 'IP-API接口', value: 4 },
        { label: 'Ip2locationIo接口', value: 5 }
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
    field: 'memz.HexOperationAll',
    label: 'HEX编码解码',
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
    field: 'memz.removeSpacesAll',
    label: '文本去空格',
    bottomHelpMessage: '关闭时仅主人可用',
    component: 'Switch'
  },
  {
    field: 'memz.getFaviconAll',
    label: '获取网站图标',
    bottomHelpMessage: '关闭时仅主人可用',
    component: 'Switch'
  }
]
