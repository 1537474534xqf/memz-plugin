import cfg from '../../../lib/config/config.js'
import moment from 'moment'
import { Config } from '../components/index.js'
const { checkupdate, CUSTOM_REPOSITORY, cron } = Config.getConfig('update')

const prefix = 'memz:codeUpdateTask:'
let REPOSITORY_LIST = []

init()

export class UpdateTask extends plugin {
  constructor () {
    super({
      name: '[memz-plugin]定时检查更新',
      event: 'message',
      priority: 1000,
      rule: [
        {
          reg: /^#?(memz)(插件)?检查(仓库)?更新$/i,
          fnc: 'UpdateTask'
        }
      ]
    })
    this.task = []
    if (checkupdate) {
      this.task.push({
        name: '[memz-plugin]定时检查仓库更新',
        cron,
        fnc: () => this.UpdateTask()
      })
    }
  }

  async UpdateTask () {
    if (!checkupdate) { return logger.warn('[memz-plugin]仓库定时检查更新已关闭') }
    // 去重
    const uniqueRepositories = Array.from(new Set(REPOSITORY_LIST.map(JSON.stringify))).map(JSON.parse)
    if (uniqueRepositories.length === 0) {
      logger.warn('[memz-plugin]未检测到有效的仓库地址')
      return false
    }

    let content = []
    for (let index = 0; index < uniqueRepositories.length; index++) {
      const item = uniqueRepositories[index]
      if (index > 0) {
        await this.sleep(1000) // 避免请求过于频繁
      }

      logger.info(`[memz-plugin]开始检查仓库更新：${item.owner}/${item.repo}`)
      let repositoryData = await this.getRepositoryLatestCommit(item.source, item.owner, item.repo)
      if (!repositoryData?.sha) {
        logger.warn(`[memz-plugin]未能获取到提交信息：${item.owner}/${item.repo}`)
        continue
      }

      const redisKey = `${prefix}${item.owner}/${item.repo}`
      let redisSha = await redis.get(redisKey)
      logger.debug(`[memz-plugin]Redis中缓存的SHA值：${redisSha}，最新的SHA值：${repositoryData.sha}`)

      if (redisSha && String(redisSha) === String(repositoryData.sha)) {
        logger.info(`[memz-plugin]仓库 ${item.owner}/${item.repo} 没有新更新`)
        continue
      }

      await redis.set(redisKey, repositoryData.sha)
      content.push(repositoryData)
    }

    if (content.length > 0) {
      const msg =
                '检测到仓库更新...\n' +
                content
                  .map(
                    (i) =>
                            `项目名称：${i.owner}/${i.repo}\n` +
                            `来源：${i.source}\n` +
                            `开发者名称：${i.author}\n` +
                            `开发者邮箱：${i.email}\n` +
                            `更新信息：${i.message}\n` +
                            `更新时间：${i.date}\n`
                  )
                  .join('\n')

      const masters = cfg.masterQQ
      for (const master of masters) {
        if (master.toString().length > 11) {
          logger.info('[memz-plugin] 更新推送跳过 QQBot')
          continue
        }
        await Bot.pickFriend(master).sendMsg(msg)
        await this.sleep(2000)
      }
    } else {
      logger.info('[memz-plugin]未检测到任何仓库更新')
    }
  }

  async getRepositoryLatestCommit (source, owner, repo) {
    try {
      if (source === 'Gitee') {
        return await this.getGiteeLatestCommit(owner, repo)
      } else if (source === 'GitHub') {
        return await this.getGithubLatestCommit(owner, repo)
      } else {
        return { error: '未知的仓库来源' }
      }
    } catch (error) {
      logger.error(`[memz-plugin]获取仓库提交信息失败：${error.message}`)
      return { error: '查询出错：' + error.message }
    }
  }

  async getGiteeLatestCommit (owner, repo) {
    const apiUrl = `https://gitee.com/api/v5/repos/${owner}/${repo}/commits`
    try {
      const response = await fetch(apiUrl)
      const commits = await response.json()
      if (commits.length > 0) {
        const latestCommit = commits[0]
        return {
          source: 'Gitee',
          owner,
          repo,
          sha: latestCommit.sha,
          author: latestCommit.commit.author.name,
          email: latestCommit.commit.author.email,
          date: moment(latestCommit.commit.author.date).format('YYYY-MM-DD HH:mm:ss'),
          message: latestCommit.commit.message.trim()
        }
      } else {
        return { error: '该仓库没有提交记录。' }
      }
    } catch (error) {
      logger.error(`[memz-plugin]查询 Gitee 提交失败：${error.message}`)
      return { error: '查询出错：' + error.message }
    }
  }

  async getGithubLatestCommit (owner, repo) {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits`
    try {
      const response = await fetch(apiUrl)
      const commits = await response.json()
      if (commits.length > 0) {
        const latestCommit = commits[0]
        return {
          source: 'GitHub',
          owner,
          repo,
          sha: latestCommit.sha,
          author: latestCommit.commit.author.name,
          email: latestCommit.commit.author.email,
          date: moment(latestCommit.commit.author.date).format('YYYY-MM-DD HH:mm:ss'),
          message: latestCommit.commit.message.trim()
        }
      } else {
        return { error: '该仓库没有提交记录。' }
      }
    } catch (error) {
      logger.error(`[memz-plugin]查询 GitHub 提交失败：${error.message}`)
      return { error: '查询出错：' + error.message }
    }
  }

  async sleep (ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

function init () {
  function gitRemoteUrl (remoteUrl) {
    const urlMatch = remoteUrl.match(
      /^(?:https?:\/\/)?(?:[^/]+\/)+([^/]+)\/([^/]+)(?:\.git)?$/i
    )
    const sshUrlMatch = remoteUrl.match(/^.+@(.+):([^/]+)\/([^/]+)\.git$/i)

    if (urlMatch) {
      const owner = urlMatch[1]
      const repo = urlMatch[2].replace('.git', '')
      const source = remoteUrl.includes('gitee') ? 'Gitee' : 'GitHub'
      REPOSITORY_LIST.push({
        source,
        owner,
        repo
      })
      logger.debug(`[memz-plugin]已添加仓库：${source}:${owner}/${repo}`)
    } else if (sshUrlMatch) {
      const owner = sshUrlMatch[2]
      const repo = sshUrlMatch[3]
      const source = remoteUrl.includes('gitee') ? 'Gitee' : 'GitHub'
      REPOSITORY_LIST.push({
        source,
        owner,
        repo
      })
      logger.debug(`[memz-plugin]已添加仓库：${source}:${owner}/${repo}`)
    } else {
      logger.debug(`[memz-plugin]未识别的仓库地址格式：${remoteUrl}`)
    }
  }

  if (Array.isArray(CUSTOM_REPOSITORY) && CUSTOM_REPOSITORY.length > 0) {
    CUSTOM_REPOSITORY.forEach((item) => {
      gitRemoteUrl(item)
    })
  } else {
    logger.debug('[memz-plugin]CUSTOM_REPOSITORY 配置为空或未正确读取')
  }

  logger.debug(`[memz-plugin]仓库更新推送初始化完成：${JSON.stringify(REPOSITORY_LIST)}`)
}
