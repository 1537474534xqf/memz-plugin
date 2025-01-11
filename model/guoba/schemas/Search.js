export default [
  {
    label: '搜索设置',
    component: 'SOFT_GROUP_BEGIN'
  },
  {
    component: 'Divider',
    label: '网络搜索设置'
  },
  {
    field: 'memz.SearchMovie',
    label: '搜影视',
    bottomHelpMessage: '使用API搜索影视资源,关闭时仅主人可用',
    component: 'Switch'
  },
  {
    field: 'memz.SearchMagnet',
    label: '磁力搜索',
    bottomHelpMessage: '由于内容涉及违规, 不建议开启,关闭时仅主人可用',
    component: 'Switch'
  },
  {
    component: 'Divider',
    label: '本地搜索设置'
  },
  {
    field: 'memz.SearchResource',
    label: '搜资源',
    bottomHelpMessage: '搜索本地xlsx文件的游戏,关闭时仅主人可用',
    component: 'Switch'
  },
  {
    field: 'memz.threshold',
    label: '搜资源阈值',
    bottomHelpMessage: '搜资源阈值,模糊匹配的宽松度,范围 0-1,值越小，表示匹配的结果越严格，越大则表示匹配的宽松度越高',
    component: 'InputNumber',
    componentProps: {
      min: 0,
      max: 1
    }
  }
]
