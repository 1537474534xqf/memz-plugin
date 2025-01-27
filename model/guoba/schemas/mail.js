export default [
  {
    label: '邮件配置',
    component: 'SOFT_GROUP_BEGIN'
  },
  {
    component: 'Divider',
    label: '收邮件'
  },
  {
    field: 'mail.imapMail',
    label: 'IMAP收邮件',
    bottomHelpMessage: 'IMAP收邮件服务器配置',
    component: 'GSubForm',
    componentProps: {
      multiple: true,
      schemas: [
        {
          field: 'name',
          label: '名称',
          bottomHelpMessage: '配置名称,约等于备注',
          component: 'Input',
          required: true,
          componentProps: {
            placeholder: '请输入配置名称'
          }
        },
        {
          field: 'enable',
          label: '启用',
          component: 'Switch'
        },
        {
          field: 'host',
          label: 'host',
          bottomHelpMessage: 'IMAP服务器地址',
          required: true,
          component: 'Input'
        },
        {
          field: 'port',
          label: '端口',
          bottomHelpMessage: 'IMAP服务器端口号',
          required: true,
          component: 'InputNumber',
          componentProps: {
            placeholder: '请输入端口号'
          }
        },
        {
          field: 'tls',
          label: 'TLS',
          required: true,
          bottomHelpMessage: '是否启用TLS,如果你不知道这是什么,直接选择开启',
          component: 'Switch'
        },
        {
          field: 'username',
          label: '用户名',
          required: true,
          bottomHelpMessage: 'IMAP服务器用户名',
          component: 'Input'
        },
        {
          field: 'password',
          label: '密码',
          required: true,
          bottomHelpMessage: 'IMAP服务器密码',
          component: 'InputPassword',
          componentProps: {
            placeholder: '请输入密码'
          }
        },
        {
          field: 'sendType',
          label: '发送方式',
          required: true,
          bottomHelpMessage: '接受到的邮件发送方式',
          component: 'Select',
          componentProps: {
            options: [
              { label: '群聊发送', value: 1 },
              { label: '私聊发送', value: 2 },
              { label: '群发+私发', value: 3 }
            ],
            placeholder: '接受到的邮件发送方式'
          }
        },
        {
          field: 'groups',
          helpMessage: '检测到邮件后推送的群列表',
          label: '推送群',
          componentProps: {
            placeholder: '点击选择要推送的群'
          },
          component: 'GSelectGroup'
        },
        {
          field: 'users',
          helpMessage: '检测到邮件后推送的好友列表',
          label: '推送好友',
          componentProps: {
            placeholder: '点击选择要推送的好友'
          },
          component: 'GSelectFriend'
        }
      ]
    }
  },
  {
    component: 'Divider',
    label: '发邮件'
  },
  {
    field: 'mail.smtpMail',
    label: 'SMTP发邮件',
    bottomHelpMessage: 'SMTP发邮件服务器配置',
    component: 'GSubForm',
    componentProps: {
      multiple: true,
      schemas: [
        {
          field: 'name',
          label: '名称',
          bottomHelpMessage: '配置名称,约等于备注',
          component: 'Input',
          required: true,
          componentProps: {
            placeholder: '请输入配置名称'
          }
        },
        {
          field: 'enable',
          label: '启用',
          component: 'Switch'
        },
        {
          field: 'host',
          label: 'host',
          bottomHelpMessage: 'IMAP服务器地址',
          required: true,
          component: 'Input'
        },
        {
          field: 'port',
          label: '端口',
          bottomHelpMessage: 'IMAP服务器端口号',
          required: true,
          component: 'InputNumber',
          componentProps: {
            placeholder: '请输入端口号'
          }
        },
        {
          field: 'id',
          label: 'ID',
          bottomHelpMessage: '用于区分多个发邮件配置',
          required: true,
          component: 'InputNumber',
          componentProps: {
            placeholder: '请输入ID'
          }
        },
        {
          field: 'username',
          label: '用户名',
          required: true,
          bottomHelpMessage: 'IMAP服务器用户名',
          component: 'Input'
        },
        {
          field: 'password',
          label: '密码',
          required: true,
          bottomHelpMessage: 'IMAP服务器密码',
          component: 'InputPassword',
          componentProps: {
            placeholder: '请输入密码'
          }
        }
      ]
    }
  },
  {
    field: 'mail.smtpMailId',
    label: '默认发邮件配置ID',
    bottomHelpMessage: '默认发邮件配置ID',
    required: true,
    component: 'InputNumber',
    componentProps: {
      placeholder: '请输入ID'
    }
  }
]
