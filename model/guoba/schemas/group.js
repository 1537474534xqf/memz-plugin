export default [
  {
    label: '群聊配置',
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
  }
]
