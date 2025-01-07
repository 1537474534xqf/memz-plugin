export default [
  {
    label: '自动化',
    component: 'SOFT_GROUP_BEGIN'
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
      }
]