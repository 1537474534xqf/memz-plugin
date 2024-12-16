export const cfgSchema = {
  memz: {
    title: '插件设置',
    cfg: {
      SystemStatusAll: {
        title: '系统状态',
        key: '系统状态',
        def: false,
        desc: '系统状态是否所有人可用',
        fileName: 'memz'
      },
      RedisStatusAll: {
        title: 'Redis状态',
        key: 'Redis状态',
        def: false,
        desc: 'Redis状态是否所有人可用',
        fileName: 'memz'
      }
    }
  },
  api: {
    title: 'API设置',
    cfg: {
      enabled: {
        title: 'api',
        key: 'api',
        def: false,
        desc: '是否开启API服务端',
        fileName: 'api'
      },
      port: {
        title: 'API端口号',
        key: 'api端口',
        type: 'num',
        def: 1129,
        input: (n) => {
          if (n > 0 && n <= 65535) {
            return n * 1
          } else {
            return 54545
          }
        },
        desc: '1-65535'
      }

    }
  },
  tools: {
    title: '工具设置',
    cfg: {
      PingAll: {
        title: 'ping',
        key: 'ping',
        def: false,
        desc: 'Ping是否所有人可用',
        fileName: 'memz'
      },
      PingProxy: {
        title: 'ping代理',
        key: 'ping代理',
        def: false,
        desc: 'Ping是否使用代理',
        fileName: 'memz'
      },
      WhoisAll: {
        title: 'whois',
        key: 'whois',
        def: false,
        desc: '是否所有人可用Whois',
        fileName: 'memz'
      }
    }
  },
  search: {
    title: '网络搜索设置',
    cfg: {
      search_movie: {
        title: '搜影视',
        key: '搜影视',
        def: false,
        desc: '搜影视是否所有人可用',
        fileName: 'memz'
      },
      search_resource: {
        title: '搜资源',
        key: '搜资源',
        def: false,
        desc: '搜资源是否所有人可用',
        fileName: 'memz'
      },
      search_magnet: {
        title: '磁力搜索',
        key: '磁力搜索',
        def: false,
        desc: '磁力搜索是否所有人可用',
        fileName: 'memz'
      }
    }
  }
  // update: {
  //   title: '自动更新设置',
  //   cfg: {
  //     autoupdate: {
  //       title: '自动更新',
  //       key: '自动更新',
  //       def: false,
  //       desc: '是否自动更新插件',
  //       fileName: 'update'
  //     },
  //     checkupdate: {
  //       title: '自动检查更新',
  //       key: '自动检查更新',
  //       def: false,
  //       desc: '是否自动检查插件更新',
  //       fileName: 'update'
  //     }
  //   }
  // }
}
