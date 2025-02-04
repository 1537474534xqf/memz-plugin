export default [
  {
    label: '邮件配置',
    component: 'SOFT_GROUP_BEGIN'
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
