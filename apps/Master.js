// import fs from 'node:fs/promises'
// import YAML from 'yaml'

// const file = 'config/config/other.yaml'

// export class 设置主人 extends plugin {
//   constructor () {
//     super({
//       name: '权限管理',
//       dsc: '新增或删除主人',
//       event: 'message',
//       priority: -Infinity,
//       rule: [
//         {
//           reg: '^#(新增|删除)主人(?:@|\\+)?(\\d+)?$',
//           fnc: '设置主人'
//         }
//       ]
//     })
//   }

//   async 修改主人配置文件 (filePath, key, value, action = 'add') {
//     try {
//       const doc = YAML.parseDocument(await fs.readFile(filePath, 'utf8'))
//       let values = doc.get(key) || []

//       if (values.items) {
//         values = values.items.map(item => item.value)
//       }

//       if (action === 'add' && !values.includes(value)) {
//         values.push(value)
//       } else if (action === 'remove') {
//         values = values.filter(item => item !== value)
//       }

//       doc.set(key, values.length > 0 ? values : null)
//       await fs.writeFile(filePath, doc.toString(), 'utf8')
//     } catch (error) {
//       logger.error(`Failed to modify the config file: ${error}`)
//       throw new Error('配置文件修改失败')
//     }
//   }

//   async 设置主人 () {
//     if (!this.e.isMaster) return

//     const [action, targetId] = this.e.msg.match(/^#(新增|删除)主人(?:@|\+)?(\d+)$/) || []

//     if (!targetId) return this.reply('谁?', true)

//     try {
//       const doc = YAML.parseDocument(await fs.readFile(file, 'utf8'))
//       let currentMasters = doc.get('masterQQ') || []

//       if (currentMasters.items) {
//         currentMasters = currentMasters.items.map(item => item.value)
//       }

//       const isMaster = currentMasters.includes(targetId)
//       const replyMessage = action === '新增'
//         ? isMaster ? `[${targetId}] 已经是主人了` : `成功添加 [${targetId}] 为新的主人`
//         : isMaster ? `成功删除 [${targetId}] 的主人权限` : `[${targetId}] 本来就不是主人`

//       if ((action === '新增' && isMaster) || (action === '删除' && !isMaster)) {
//         return this.reply(replyMessage, true)
//       }

//       await this.修改主人配置文件(file, 'masterQQ', targetId, action === '新增' ? 'add' : 'remove')
//       await this.修改主人配置文件(file, 'master', `${this.e.self_id}:${targetId}`, action === '新增' ? 'add' : 'remove')

//       return this.reply(replyMessage, true)
//     } catch (error) {
//       logger.error(`Error while setting master: ${error}`)
//       return this.reply('操作失败, 请查看日志', true)
//     }
//   }
// }
