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
      }
]