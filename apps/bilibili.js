// import axios from 'axios'
// import qrcode from 'qrcode'
// const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// const Bilibiliredis = redis

// export class BilibiliQr extends plugin {
//   constructor () {
//     super({
//       name: 'B站扫码获取Cookie',
//       dsc: 'B站扫码获取Cookie',
//       event: 'message',
//       priority: 6,
//       rule: [
//         {
//           reg: /^#?(b|哔哩哔哩)(ilibili)?(站)?(扫码)?登录$/i,
//           fnc: 'loginViaQrCode'
//         },
//         {
//           reg: /^#?获取(我的)?B站(c(oo)?k(ie)?|t(o)?k(en))/i,
//           fnc: 'getCookieOrToken'
//         }
//       ]
//     })
//   }

//   async getCookieOrToken (e) {
//     const match = e.msg.match(/^#?获取(我的)?B站(c(oo)?k(ie)?|t(o)?k(en))/i)
//     if (!match) return

//     const key = match[2].toLowerCase().includes('c')
//       ? `memz:bilibili:cookie:${e.user_id}`
//       : `memz:bilibili:refreshToken:${e.user_id}`

//     const value = await Bilibiliredis.get(key)

//     if (!value || value === 'null') {
//       return this.reply(`你还没有${match[2]}哦~，请先#B站登录`)
//     }

//     return this.reply(`${match[2]}: \n${value}`)
//   }

//   async loginViaQrCode (e) {
//     const headers = {
//       'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 Edg/108.0.1462.42'
//     }

//     try {
//       const { data: { data: { url: qrData, qrcode_key: qrCode } } } = await axios.get('https://passport.bilibili.com/x/passport-login/web/qrcode/generate', { headers })
//       const qrBase64 = await qrcode.toDataURL(qrData)
//       const img = qrBase64.replace('data:image/png;base64,', 'base64://')

//       await this.reply(segment.image(img), true)

//       const qrStatus = await this.pollQrCode(qrCode, headers, e.user_id)

//       if (qrStatus) {
//         await this.reply('登录成功cookie和刷新tk已经存入redis，使用#获取我的b站CK/TK 获取')
//       } else {
//         await this.reply('二维码超时，请重新尝试', true)
//       }
//     } catch (error) {
//       console.error('Error:', error.message)
//       this.reply('登录过程中发生错误，请稍后再试', true)
//     }
//   }

//   async pollQrCode (qrCode, headers, userId) {
//     const url = `https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key=${qrCode}&source=main_mini`
//     let isQrCodeScanned = false

//     for (let i = 0; i < 36; i++) {
//       const { data: { data: { code, refreshToken } }, headers: { 'set-cookie': setCookieHeader } } = await axios.get(url, { headers })

//       switch (code) {
//         case 0:
//           await this.saveLoginData(setCookieHeader, refreshToken, userId)
//           return true
//         case 86038:
//           if (i === 18) {
//             this.reply('二维码已失效', true)
//           }
//           break
//         case 86090:
//           if (!isQrCodeScanned) {
//             this.reply('二维码已扫码，未确认', true)
//             isQrCodeScanned = true
//           }
//           break
//         case 86101:
//           break
//         default:
//           this.reply('发生什么事了，怎么没获取到！')
//           break
//       }

//       await sleep(5000)
//     }

//     return false
//   }

//   async saveLoginData (setCookieHeader, refreshToken, userId) {
//     const cookie = setCookieHeader.map(item => item.split(';')[0]).join('; ')
//     try {
//       await Bilibiliredis.set(`memz:bilibili:cookie:${userId}`, cookie)
//       await Bilibiliredis.set(`memz:bilibili:refreshToken:${userId}`, refreshToken)
//     } catch (error) {
//       this.reply(['存入redis失败！！', error])
//       logger.error(error)
//     }
//   }
// }
