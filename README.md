# MEMZ-Plugin

## 📋介绍

Yunzai系列Bot插件,本插件基于TRSS-Yunzai作为开发环境,其他框架可能有不支持的地方,可提issue适配

<div align="center">

![GitHub stars](https://img.shields.io/github/stars/MEMZ-MapleLeaf/memz-plugin?style=social)
![GitHub forks](https://img.shields.io/github/forks/MEMZ-MapleLeaf/memz-plugin?style=social)
![GitHub issues](https://img.shields.io/github/issues/MEMZ-MapleLeaf/memz-plugin)
![GitHub pull requests](https://img.shields.io/github/issues-pr/MEMZ-MapleLeaf/memz-plugin)

<img src="https://count.getloli.com/@MEMZ-Plugin?name=MEMZ-Plugin&theme=random&padding=7&offset=0&align=top&scale=1&pixelated=0&darkmode=auto" />

</div>

## 安装插件

### 安装

#### 使用GitHub安装

前往 [tokens/new](https://github.com/settings/tokens/new) 填写如下内容

- Note: 随意内容
- Expiration: No expiration
- Select scopes: repo

最后点击 **Generate token** 进行生成令牌

```bash
git clone --depth=1 https://令牌@github.com/MEMZ-MapleLeaf/memz-plugin.git ./plugins/memz-plugin/
```

#### 使用Gitee安装

```bash
git clone --depth=1 https://令牌@gitee.com/memzjs/memz-plugin.git ./plugins/memz-plugin/
```

### 安装依赖

```bash
pnpm install --filter=memz-plugin
```

## 使用

发送 `#MEMZ帮助`查看插件部分功能

开启MEMZ-API服务(默认开启)后可通过 `#MEMZAPI帮助`查看API部分功能

发送 `#MEMZ设置`可进行部分功能快捷设置

完整设置请通过[锅巴面板](https://gitee.com/guoba-yunzai/guoba-plugin)或[YePanel](https://github.com/XasYer/YePanel)等管理面板进行设置

### 基础功能

| 功能         | 命令正则            | 功能描述           | 备注                   | 权限                |
| ------------ | ------------------- | ------------------ | ---------------------- | ------------------- |
| 帮助         | #memz帮助           | 获取插件帮助图     | 无                     | All                 |
| API帮助      | #memzapi帮助        | 还没写完,不用管    | 无                     | All                 |
| 版本         | #memz版本           | 获取版本信息       | 需要先安装TRSS-Plugin  | All                 |
| 更新日志     | #memz更新日志       | 获取Git提交信息    | 无                     | All                 |
| 更新         | #memz更新           | 更新插件           | 无                     | Master              |
| 设置         | #memz设置           | 简单的设置         | 不如锅巴!              | Master              |
| Redis状态    | #redis状态(pro)     | 查看Redis的状态    | 支持自定义ip,端口,密码 | Master & 可开放权限 |
| 系统状态     | #系统状态(pro)(max) | 查看系统当前状态   | 不建议promax           | Master & 可开放权限 |
| 检查插件更新 | #memz检查更新       | 获取最新的提交     | 发送给每个主人!        | Master              |
| 重启         | #memz重启           | 需要先开启劫持重启 | 仅限Windows系统使用!!! | Master              |

### 群聊功能

| 功能             | 命令正则          | 功能描述                                | 备注                     | 权限   |
| ---------------- | ----------------- | --------------------------------------- | ------------------------ | ------ |
| 一键艾特全体     | #一键召唤全体     | 按照配置文件对群成员一个个艾特          | 极其容易被踢,使用需谨慎  | Master |
| 谁艾特我         | #谁艾特我         | 查看该群聊都有谁艾特了泥,默认保存24小时 | 保存时长可在配置文件更改 | All    |
| 清除艾特数据     | #清理艾特数据     | 手动清理这个群艾特泥的数据              | 仅可清理自己的           | All    |
| 清除全部艾特数据 | #清除全部艾特数据 | 手动清理这个群所有艾特数据              | 清理这个群所有人都       | Master |
| 主人被禁言解禁   | 无                | 主人被禁言时如果Bot是管理员&群主就解禁  | 可配置提示词等           | Master |

### 搜索功能

| 功能             | 命令正则           | 功能描述                       | 备注                | 权限                |
| ---------------- | ------------------ | ------------------------------ | ------------------- | ------------------- |
| 搜索单机破解游戏 | #搜游戏+游戏关键词 | 破解游戏,介意者关闭即可        | 来源于人工记录      | Master & 可开放权限 |
| 游戏资源统计信息 | #资源统计          | 获取当前单机破解游戏的统计信息 | 无                  | All                 |
| 磁力搜索         | #磁力搜索+关键词   | 内容违规,不建议开启            | 内容违规,不建议开启 | Master & 可开放权限 |
| 影视搜索         | #搜影视+影视关键词 | 调用接口进行搜索               | 无                  | Master & 可开放权限 |
| 清理搜索缓存     | #清理搜游戏缓存    | 清理搜索单机破解游戏的缓存数据 | 无                  | Master              |

### 网站工具

| 功能         | 命令正则                            | 功能描述                       | 备注                                           | 权限                |
| ------------ | ----------------------------------- | ------------------------------ | ---------------------------------------------- | ------------------- |
| ping         | #ping/http/tcping+网站              | 获取对应网站的ping数据         | 默认使用Itdog进行ping,可更改为炸了吗网站测速   | Master & 可开放权限 |
| seo          | #seo+链接                           | 获取对应网站的seo数据          | 无                                             | Master & 可开放权限 |
| 编码解码     | #(unicode/url/ascii)(编码/解码)     | 常见的编码解码操作             | 无                                             | Master & 可开放权限 |
| whois        | #whois+域名                         | 域名Whois信息查询              | 使用whois-json库,可能与直接whois查询少部分信息 | Master & 可开放权限 |
| 域名备案查询 | #域名备案查询+域名                  | 域名备案信息查询               | 无                                             | Master & 可开放权限 |
| 网页截图     | #网页截图+链接                      | 截图对应的链接                 | 无                                             | Master & 可开放权限 |
| 域名查询     | #域名查询+域名                      | 查询域名是否被注册或后缀最低价 | 无                                             | Master & 可开放权限 |
| http状态查询 | #http状态查询+链接                  | 查询对应链接的状态等           | 无                                             | Master & 可开放权限 |
| ssl证书查询  | #ssl证书查询+链接                   | 查询对应链接的ssl证书情况等    | 有亿点BUG,不想修了                             | Master & 可开放权限 |
| 网站图标     | #网站图标+链接                      | 获取对应网站的图标             | 无                                             | Master & 可开放权限 |
| ip信息       | #ipinfo + 域名/ip                   | 查询对应的IP信息等             | 请先去配置里填入ipinfo.io的Token               | Master & 可开放权限 |
| 进制转换     | #进制转换原始数 起始进制 目标进制 | 最没有用的功能                 | 需要输入 <原始数> <起始进制> <目标进制>        | Master & 可开放权限 |

## 交流与反馈

QQ交流群:745046386

或者你可以提issue或者PR

## 免责声明

1. 功能仅限内部交流与小范围使用，严禁将 `memz-plugin` 用于任何商业用途或盈利
2. 图片与其他素材均来自于网络，仅供交流学习使用，如有侵权请联系 `197728340@qq.com`删除
3. 本插件仅用于学习交流，开发者不对因使用本插件而造成的任何损失负责

## 贡献者

> 🌟 星光闪烁，你们的智慧如同璀璨的夜空。感谢所有为 **MEMZ-Plugin** 做出贡献的人！

<img src="https://contrib.rocks/image?repo=MEMZ-MapleLeaf/memz-plugin" />

![Alt](https://repobeats.axiom.co/api/embed/b8a76b0702cd42f06a3653ce1a15b175c298f27c.svg "Repobeats analytics image")

## 鸣谢

- [ChatGPT](https://chatgpt.com)
- [ws-plugin](https://gitee.com/xiaoye12123/ws-plugin)
- [TRSS-Yunzai](../../TimeRainStarSky/Yunzai)
- [Yunzai-Bot](https://gitee.com/Le-niao/Yunzai-Bot)
