import { copyright } from '#components'

const time = new Date().toISOString()

export default async (req, res) => {
  try {
    const 元梦之星 = 'https://ssr.gamecenter.qq.com/hippy-ssr/v1/app/action-sheet?action_type=download&appid=1112198072&report_params=%7B%22ext_module%22%3A%20%229579%22%2C%22ext_sub_module%22%3A%20%22957901%22%2C%22gameappid%22%3A%20%221112198072%22%2C%22ext50%22%3A%20%22650244193992991868%22%7D&_qv=9.1.33&_pf=android&_ws=469x931&_ss=469x1032&_nm=1'

    res.writeHead(302, { Location: 元梦之星 })
    res.end()
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      code: 500,
      message: '跳转失败',
      title: '跳转',
      time,
      error: error.message,
      copyright
    }))
  }
}
