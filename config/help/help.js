export const helpCfg = {
    "themeSet": false,
    "title": "MEMZ-Plugin-HelpList",
    "subTitle": "Yunzai-Bot & MEMZ-Plugin",
    "colWidth": 265,
    "theme": "all",
    "themeExclude": [
        "default"
    ],
    "colCount": 3,
    "bgBlur": true
}
export const helpList = [
    {
        "group": "WebTools",
        "list": [
            {
                "icon": 80,
                "title": "#whois+域名",
                "desc": "查询域名信息"
            },
            {
                "icon": 63,
                "title": "#ping+域名",
                "desc": "Ping域名"
            }
        ]
    },
    {
        "group": "加解码功能",
        "list": [
            {
                "icon": 67,
                "title": "#url(编码|解码)+内容",
                "desc": "URL编码,解码"
            }
        ]
    },
    {
        "group": "MEMZ管理",
        "list": [
            {
                "icon": 58,
                "title": "#MEMZ(强制)更新",
                "desc": "(强制)更新MEMZ插件"
            },
            {
                "icon": 50,
                "title": "#MEMZ更新日志",
                "desc": "查看MEMZ插件更新日志"
            },
            {
                "icon": 40,
                "title": "#Redis状态(文本)",
                "desc": "(文本|图片)查看Redis状态"
            },
        ]
    }
]