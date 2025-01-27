// 获取所有API路由选项
const getApiOptions = () => {
  const apiList = global.apiList || []
  return apiList.map(api => ({
    label: api.title || api.path,
    value: `${api.path}`
  }))
}

export default [
  {
    label: 'API服务',
    component: 'SOFT_GROUP_BEGIN'
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
    field: 'api.cdn',
    label: '环境为反代',
    bottomHelpMessage: '是否使用CDN,内网穿透等',
    component: 'Switch'
  },
  {
    field: 'api.host',
    label: 'host',
    bottomHelpMessage: '0.0.0.0 表示监听所有IP(公网可访问)',
    component: 'Input'
  },
  {
    field: 'api.loglevel',
    label: '日志等级',
    bottomHelpMessage: '日志等级',
    component: 'Select',
    componentProps: {
      options: [
        { label: 'info', value: 'info' },
        { label: 'debug', value: 'debug' },
        { label: 'warn', value: 'warn' },
        { label: 'error', value: 'error' },
        { label: 'fatal', value: 'fatal' },
        { label: 'off', value: 'off' }
      ],
      placeholder: '请选择Ping类型'
    }
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
    field: 'api.redisHost',
    label: 'Redis地址',
    bottomHelpMessage: 'API服务端缓存数据库地址',
    component: 'Input'
  },
  {
    field: 'api.redisPort',
    label: 'Redis端口',
    bottomHelpMessage: 'API服务端缓存数据库端口',
    component: 'InputNumber',
    componentProps: {
      placeholder: '请输入端口号'
    }
  },
  {
    field: 'api.redisUsername',
    label: 'Redis用户名',
    bottomHelpMessage: 'API服务端缓存数据库用户名',
    component: 'Input'
  },
  {
    field: 'api.redisPassword',
    label: 'Redis密码',
    bottomHelpMessage: 'API服务端缓存数据库密码',
    component: 'Input'
  },
  {
    field: 'api.redisDB',
    label: 'Redis数据库',
    bottomHelpMessage: 'API服务端缓存数据库,默认db2',
    component: 'InputNumber'
  },
  {
    field: 'api.apiby',
    label: '署名',
    bottomHelpMessage: '在API返回结果上加上署名',
    component: 'Input'
  },
  {
    field: 'api.token',
    label: '鉴权Token',
    bottomHelpMessage: '在需要鉴权的API中需要传入此参数,留空则鉴权失败',
    component: 'Input'
  },
  {
    field: 'api.blackApiList',
    label: '黑名单API列表',
    bottomHelpMessage: '选择需要禁用的API接口',
    component: 'Select',
    componentProps: {
      mode: 'multiple',
      allowCreate: false,
      options: getApiOptions()
    }
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
  },
  {
    field: 'api.maxFailAttempts',
    label: '限制失败次数',
    bottomHelpMessage: '鉴权时每个时间窗口内最大请求次数',
    component: 'InputNumber',
    componentProps: {
      placeholder: '请求数',
      addonAfter: '次'
    }
  },
  {
    field: 'api.timeWindow',
    label: '鉴权时间窗口',
    bottomHelpMessage: '鉴权时每个时间窗口内最大请求次数',
    component: 'InputNumber',
    componentProps: {
      addonAfter: '毫秒'
    }
  },
  {
    field: 'api.apiList',
    label: 'API列表',
    component: 'GSubForm',
    componentProps: {
      multiple: true,
      schemas: [
        {
          field: 'name',
          label: 'API名字',
          component: 'Input',
          required: true
        },
        {
          field: 'path',
          label: '路由',
          component: 'Input',
          required: true
        },
        {
          field: 'key',
          label: '参数',
          component: 'GSubForm',
          componentProps: {
            multiple: true,
            schemas: [
              {
                field: 'name',
                label: '名称',
                component: 'Input',
                required: true
              },
              {
                field: 'type',
                label: '参数类型',
                component: 'RadioGroup',
                componentProps: {
                  options: [
                    { label: '字符串', value: 'string' },
                    { label: '数字', value: 'number' }
                  ]
                }
              },
              {
                field: 'required',
                label: '是否必须传入',
                component: 'Switch'
              },
              {
                field: 'description',
                label: '描述',
                component: 'Input'
              }
            ]
          }
        },
        {
          field: 'method',
          label: '请求类型',
          component: 'RadioGroup',
          required: true,
          componentProps: {
            options: [
              { label: 'GET', value: 'GET' },
              { label: 'POST', value: 'POST' }
            ]
          }
        },
        {
          field: 'description',
          label: '描述',
          component: 'Input'
        },
        {
          field: 'authentication',
          label: '鉴权',
          bottomHelpMessage: '鉴权的接口需要传入token',
          component: 'Switch'
        }
      ]
    }
  }
]
