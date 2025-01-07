export default [
    {
        label: '服务状态',
        component: 'SOFT_GROUP_BEGIN'
    },
    {
        component: 'Divider',
        label: '服务状态'
    },
    {
        field: 'webStatus.list',
        label: '服务状态列表',
        component: 'GSubForm',
        componentProps: {
            multiple: true,
            schemas: [
                {
                    field: 'name',
                    label: '分组标题',
                    component: 'Input',
                    required: true
                },
                {
                    field: 'content',
                    label: '服务列表',
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
                                field: 'url',
                                label: '链接',
                                component: 'Input',
                                required: true
                            },
                            {
                                field: 'status',
                                label: '状态码',
                                component: 'Input',
                                required: true,
                                bottomHelpMessage: '多个状态码用:分割'
                            },
                            {
                                field: 'timeout',
                                label: '超时时间',
                                component: 'InputNumber',
                                componentProps: {
                                    addonAfter: '秒'
                                }
                            },
                            {
                                field: 'ignoreSSL',
                                label: '忽略SSL',
                                component: 'Switch'
                            },
                            {
                                field: 'retry',
                                label: '重试次数',
                                component: 'InputNumber',
                                componentProps: {
                                    addonAfter: '次'
                                }
                            }
                        ]
                    }
                }
            ]
        }
    }
]