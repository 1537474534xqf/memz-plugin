export default [
  {
    label: '协议端功能',
    component: 'SOFT_GROUP_BEGIN'
  },
  {
    component: 'Divider',
    label: '必须配置'
  },
  {
    field: 'icqq.ICQQBotQQ',
    label: 'Bot',
    bottomHelpMessage: '使用 ICQQ 适配器的机器人QQ号(必须协议端!)',
    component: 'Input',
    componentProps: {
      placeholder: '请输入Bot的QQ号'
    }
  },
  {
    component: 'Divider',
    label: 'Q龄查询'
  },
  {
    field: 'icqq.fetchQQAgeAll',
    label: '启用Q龄查询',
    bottomHelpMessage: '是否启用Q龄查询,关闭时仅主人可用',
    component: 'Switch'
  },
  {
    component: 'Divider',
    label: '音卡签名'
  },
  {
    field: 'icqq.MusicSign',
    label: '启用音卡签名',
    bottomHelpMessage: '是否启用音卡签名,开启前先配置使用ICQQ的QQ号和签卡群号',
    component: 'Switch'
  },
  {
    field: 'icqq.groupId',
    label: '签卡群号',
    bottomHelpMessage: '签名用的群号,每次签名都需要发送音乐卡片到这个群',
    component: 'Input',
    componentProps: {
      placeholder: '请输入群号'
    }
  },
  {
    field: 'icqq.MusicSignPlatform',
    label: '默认平台',
    bottomHelpMessage: '详情可在data/music/appid.json中查看',
    component: 'Input',
    componentProps: {
      placeholder: '请输入默认平台'
    }
  },
  {
    field: 'icqq.MusicSignTitle',
    label: '默认标题',
    component: 'Input',
    componentProps: {
      placeholder: '请输入默认标题'
    }
  },
  {
    field: 'icqq.MusicSignContent',
    label: '默认内容',
    component: 'Input',
    componentProps: {
      placeholder: '请输入默认内容'
    }
  },
  {
    field: 'icqq.MusicSignUrl',
    label: '默认跳转链接',
    component: 'Input',
    componentProps: {
      placeholder: '请输入跳转链接(必须是链接)'
    }
  },
  {
    field: 'icqq.MusicSignImageUrl',
    label: '默认图片链接',
    component: 'Input',
    componentProps: {
      placeholder: '请输入图片链接(必须是链接)'
    }
  }
]
