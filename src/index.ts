import { Context, Schema, h } from 'koishi'

export const name = 'last-man-standing'
export const usage = `## 🎮 使用

- 仅群聊触发
- 建议为各指令添加合适的指令别名

## 📝 命令

* \`lms\` - 显示最后一人站立游戏帮助信息
* \`lms.join\` - 加入游戏
* \`lms.quit\` - 退出游戏
* \`lms.start\` - 开始游戏
* \`lms.restart\` - 重新开始游戏
* \`lms.shoot\` - 开枪
* \`lms.points\` - 查看自己的积分
* \`lms.rank\` - 查看排行榜

## 🌠 后续计划

* 多种游戏模式（经典模式、战斗模式、挑战模式、团队模式）
* 开枪超时时间（默认 30 秒）
* 倒计时功能（显示剩余时间）
* 武器系统（手枪、猎枪、步枪、狙击枪、火箭筒、手榴弹）
* 抢夺武器（代替别人开火）
* 擦枪走火（干掉别人）
* 支持多场景（荒漠、城市、森林、火山）
* 生命值系统（每位玩家初始 10 点生命值）
* 超时不开枪惩罚系统（扣除积分、随机更换武器、增加失灵率或爆炸率、减少生命值）`

// 配置项：开枪超时时间、开枪命中率（自动或手动设置）、游戏模式（经典）、是否开启倒计时功能
export interface Config { }
export const Config: Schema<Config> = Schema.object({})

// TypeScript 用户需要进行类型合并
declare module 'koishi' {
  interface Tables {
    lms_games: LMSGames
    lms_rank: LMSRank
  }
}

// 拓展表接口
export interface LMSGames {
  id: number
  guildId: string
  isStarted: boolean
  members: string[]
  isHitRateAuto: boolean
  hitRate: number
  memberId: string
  score: number
}
export interface LMSRank {
  id: number
  userId: string
  userName: string
  score: number
}



// 插件主函数
export function apply(ctx: Context) {
  // 过滤上下文，仅群聊可用
  ctx = ctx.guild()
  // 拓展表
  extendAllTables(ctx)
  // 注册所有 Koishi 指令：lms（最后一人站立）、加入游戏、退出游戏、开始游戏、重新开始、开枪、我的积分、排行榜
  registerAllKoishiCommands(ctx)
}

// 拓展所有 Koishi 表
function extendAllTables(ctx: Context) {
  // 拓展 lms 游戏管理表
  ctx.model.extend('lms_games', {
    // 各字段类型
    id: 'unsigned',
    guildId: 'string',
    isStarted: 'boolean',
    members: 'list',
    isHitRateAuto: 'boolean',
    hitRate: 'float',
    memberId: 'string',
    score: 'integer',
  }, {
    // 使用自增的主键值
    autoInc: true,
  })

  // 拓展 lms 排行榜表
  ctx.model.extend('lms_rank', {
    // 各字段类型
    id: 'unsigned',
    userId: 'string',
    userName: 'string',
    score: 'integer',
  }, {
    // 使用自增的主键值
    autoInc: true,
  })
}

// 注册所有 Koishi 指令
function registerAllKoishiCommands(ctx: Context) {
  // 使用变量避免硬编码

  // 游戏 ID
  const GAME_ID = 'lms_games'
  const RANK_ID = 'lms_rank'
  // 消息
  const JOIN_SUCCESS = '您已成功加入游戏！'
  const JOIN_FAIL = '您已加入游戏，请不要重复加入！'
  const QUIT_SUCCESS = '您已成功退出游戏！'
  const QUIT_FAIL = '您还未加入游戏，怎么退出呢！'
  const START_SUCCESS = `游戏开始！`
  const START_FAIL = '人数不足，无法开始游戏！'
  const RESTART_SUCCESS = '游戏已重新开始！'
  const RESTART_FAIL = '游戏未开始，无需重开！'
  const SHOOT_SUCCESS = '砰！你死了！'
  const SHOOT_FAIL = '当前不是您的回合！'
  const SHOOT_SURVIVAL = '恭喜您存活了下来！'
  const POINTS_FAIL = '查无此人！'
  const GAME_STARTED = '游戏不存在或已开始！'
  const GAME_NOT_STARTED = '游戏未开始！'

  // 注册指令

  // lms 帮助
  ctx.command('lms', '最后一人站立游戏帮助')
    .action(({ session }) => {
      session.execute(`lms -h`)
    })
  // 加入游戏
  ctx.command('lms.join', '加入游戏')
    .action(async ({ session }) => {
      // 获取游戏信息
      const gameInfo = await getGameInfo(ctx, session.guildId)
      // 检查当前群组的游戏在表格中是否存在
      if (isGameTableNotExist(gameInfo)) {
        // 在表格中创建游戏
        createGame(ctx, session.guildId, session.userId)
        return JOIN_SUCCESS + `当前玩家人数：1 人！`
      }
      // 检查游戏是否已经开始
      if (checkGameStatus(gameInfo)) {
        return GAME_STARTED
      } else {
        // 获取成员列表
        let newMembers = gameInfo[0].members
        // 检查用户是否已经加入游戏
        if (checkMembership(newMembers, session.userId)) {
          return JOIN_FAIL
        } else {
          // 添加用户到成员列表
          newMembers.push(session.userId)
          // 更新成员列表
          await updateMembers(ctx, session.guildId, newMembers)
          return JOIN_SUCCESS + `当前玩家人数：${gameInfo[0].members.length} 人！`
        }
      }
    })
  // 退出游戏
  ctx.command('lms.quit', '退出游戏')
    .action(async ({ session }) => {
      // 获取游戏信息
      const gameInfo = await getGameInfo(ctx, session.guildId)
      // 检查游戏是否已经开始
      if (checkGameStatus(gameInfo)) {
        return GAME_STARTED
      } else {
        // 获取成员列表
        let newMembers = gameInfo[0].members
        // 检查用户是否已经加入游戏
        if (checkMembership(newMembers, session.userId)) {
          // 从成员列表中移除用户
          newMembers.splice(newMembers.indexOf(session.userId), 1)
          // 更新成员列表
          await updateMembers(ctx, session.guildId, newMembers)
          return QUIT_SUCCESS + `当前玩家人数：${gameInfo[0].members.length} 人！`
        } else {
          return QUIT_FAIL
        }
      }
    })
  // 开始游戏
  ctx.command('lms.start', '开始游戏')
    .action(async ({ session }) => {
      // 获取游戏信息
      const gameInfo = await getGameInfo(ctx, session.guildId)
      // 检查游戏是否已经开始
      if (checkGameStatus(gameInfo)) {
        return GAME_STARTED
      } else {
        // 检查用户是否达到两人
        if (checkMemberCountReachedTwo(gameInfo[0].members)) {
          // 获取成员列表
          let newMembers = gameInfo[0].members
          // 随机打乱列表顺序
          newMembers = shuffleArray(newMembers)
          // 根据玩家人数计算开枪成功率
          const hitRate = getHitRate(newMembers.length)
          // 获取获胜的积分
          const score = newMembers.length
          // 更新游戏状态
          updateGameState(ctx, session.guildId, true, newMembers, newMembers[0], hitRate, score)
          return START_SUCCESS + `\n接下来有请【${h.at(newMembers[0])}】开枪！`
        } else {
          return START_FAIL
        }
      }
    })
  // 重新开始
  ctx.command('lms.restart', '重新开始游戏')
    .action(async ({ session }) => {
      // 获取游戏信息
      const gameInfo = await getGameInfo(ctx, session.guildId)
      // 检查游戏是否已经开始
      if (checkGameStatus(gameInfo)) {
        if (isGameTableNotExist(gameInfo)) {
          return RESTART_FAIL
        }
        restartGame(ctx, session.guildId)
        return RESTART_SUCCESS
      } else {
        restartGame(ctx, session.guildId)
        return RESTART_SUCCESS
      }
    })
  // 开枪
  ctx.command('lms.shoot', '开枪')
    .action(async ({ session }) => {
      // 获取游戏信息
      const gameInfo = await getGameInfo(ctx, session.guildId)
      // 检查游戏是否已经开始
      if (checkGameStatus(gameInfo)) {
        if (isGameTableNotExist(gameInfo)) {
          return GAME_NOT_STARTED
        }
        // 检查是否轮到该玩家
        if (checkPlayerTurn(gameInfo[0].memberId, session.userId)) {
          // 获取成员列表
          let newMembers = gameInfo[0].members
          if (Math.random() < gameInfo[0].hitRate) {
            // 死亡
            await session.send(SHOOT_SUCCESS)
            // 从成员列表中移除用户
            newMembers.splice(newMembers.indexOf(session.userId), 1)
            // 获胜
            if (newMembers.length === 1) {
              // 为胜利者增加积分
              const rankInfo = await getRankInfo(ctx, newMembers[0])
              if (isRankTableNotExist(rankInfo)) {
                createPlayer(ctx, newMembers[0], (await session.bot.getUser(newMembers[0])).username, gameInfo[0].score)
                // createPlayer(ctx, newMembers[0], `${h.at(newMembers[0])}`, gameInfo[0].score)
              } else {
                updateScore(ctx, newMembers[0], rankInfo[0].score + gameInfo[0].score)
              }
              restartGame(ctx, session.guildId)
              await session.send(`${h.at(newMembers[0])} 赢了！获得 ${gameInfo[0].score} 点积分！`)
              return
            }
            // 根据玩家人数计算开枪成功率
            const hitRate = getHitRate(newMembers.length)
            updateGameStateOnDeath(ctx, session.guildId, newMembers, newMembers[0], hitRate)
            await session.send(`接下来有请 ${h.at(newMembers[0])} 开枪！`)
          } else {
            // 存活
            await session.send(SHOOT_SURVIVAL)
            // 获取下一位玩家 Id
            const memberId = getNextPlayerId(newMembers, gameInfo[0].memberId)
            updateGameStateOnSurvival(ctx, session.guildId, memberId)
            await session.send(`接下来有请 ${h.at(memberId)} 开枪！`)
          }
        } else {
          return SHOOT_FAIL
        }
      } else {
        return GAME_NOT_STARTED
      }
    })
  // 我的积分
  ctx.command('lms.points', '查看我的积分')
    .action(async ({ session }) => {
      // 获取游戏信息
      const rankInfo = await getRankInfo(ctx, session.userId)
      if (isRankTableNotExist(rankInfo)) {
        return POINTS_FAIL
      }
      return `您现在拥有 ${rankInfo[0].score} 点积分！`
    })
  // 排行榜
  ctx.command('lms.rank', '排行榜')
    .action(async ({ session }) => {
      // 获取游戏信息
      const rankInfo: LMSRank[] = await ctx.model.get('lms_rank', {})
      console.log(rankInfo)
      // 根据score属性进行降序排序
      rankInfo.sort((a, b) => b.score - a.score)
      // 只保留前十名玩家，并生成排行榜的纯文本
      const table: string = generateRankTable(rankInfo.slice(0, 10))
      return table
    })

  // 可以复用的辅助函数

  // 获取游戏信息
  async function getGameInfo(ctx: Context, guildId: string) {
    return await ctx.model.get(GAME_ID, { guildId: guildId })
  }
  // 获取排行榜信息
  async function getRankInfo(ctx: Context, userId: string) {
    return await ctx.model.get(RANK_ID, { userId: userId })
  }
  // 在表格中创建游戏
  async function createGame(ctx: Context, guildId: string, userId: string) {
    await ctx.model.create('lms_games', { guildId: guildId, isStarted: false, members: [`${userId}`], isHitRateAuto: true, hitRate: 0.5 })
  }
  // 在排行榜表格中创建成员
  async function createPlayer(ctx: Context, userId: string, userName: string, score: number) {
    await ctx.model.create('lms_rank', { userId: userId, userName: userName, score: score })
  }
  // 更新成员列表
  async function updateMembers(ctx: Context, guildId: string, newMembers: string[]) {
    await ctx.model.set(GAME_ID, { guildId: guildId }, { members: newMembers })
  }
  // 更新成员积分
  async function updateScore(ctx: Context, userId: string, score: number) {
    await ctx.model.set(RANK_ID, { userId: userId }, { score: score })
  }
  // 更新游戏状态
  async function updateGameState(ctx: Context, guildId: string, isStarted: boolean, newMembers: string[], memberId: string, hitRate: number, score: number) {
    await ctx.model.set(GAME_ID, { guildId: guildId }, { isStarted: isStarted, members: newMembers, memberId: memberId, hitRate: hitRate, score: score })
  }
  // 重新开始游戏
  async function restartGame(ctx: Context, guildId: string) {
    await ctx.model.set(GAME_ID, { guildId: guildId }, { isStarted: false, members: [''] })
  }
  // 玩家死亡更新游戏状态
  async function updateGameStateOnDeath(ctx: Context, guildId: string, newMembers: string[], memberId: string, hitRate: number) {
    await ctx.model.set(GAME_ID, { guildId: guildId }, { members: newMembers, memberId: memberId, hitRate: hitRate })
  }
  // 玩家存活更新游戏状态
  async function updateGameStateOnSurvival(ctx: Context, guildId: string, memberId: string) {
    await ctx.model.set(GAME_ID, { guildId: guildId }, { memberId: memberId })
  }
  // 检查游戏表格是否存在
  function isGameTableNotExist(gameInfo: any[]) {
    return gameInfo.length === 0
  }
  // 检查玩家排行榜信息是否存在
  function isRankTableNotExist(rankInfo: any[]) {
    return rankInfo.length === 0
  }
  // 检查游戏状态
  function checkGameStatus(gameInfo: any[]) {
    return gameInfo.length === 0 || gameInfo[0].isStarted === true
  }
  // 检查用户是否已加入或退出游戏
  function checkMembership(members: string[], userId: string) {
    return members.indexOf(userId) !== -1
  }
  // 检查用户人数是否达到两人
  function checkMemberCountReachedTwo(members: string[]): boolean {
    return members.length >= 2
  }
  // 随机打乱一个字符串数组的顺序
  function shuffleArray<T>(array: T[]): T[] {
    // 遍历数组，从后向前逐个交换元素
    for (let i = array.length - 1; i > 0; i--) {
      // 随机生成一个索引值，范围是 [0, i]
      const j = Math.floor(Math.random() * (i + 1));
      // 交换当前位置的元素和随机位置的元素
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  // 检查是否轮到该玩家
  function checkPlayerTurn(memberId: string, userId: string) {
    return memberId === userId
  }
  // 返回下一位玩家 Id
  function getNextPlayerId(newMembers: string[], memberId: string) {
    let currentIndex = newMembers.indexOf(memberId)
    return newMembers[(currentIndex + 1) % newMembers.length]
  }

  function getHitRate(n: number): number {
    // 假设命中率与玩家数量成对数关系，即p = k - a * log(n)，其中k和a是两个常数
    // 这里我们用最大似然估计了k和a的值，假设我们有一些真实的数据
    let k = 0.8; // 估计得到的k值
    let a = 0.1; // 估计得到的a值
    let p = k - a * Math.log(n);
    // 为了使命中率随机，我们可以给p加上一个随机的误差e，其中e服从正态分布
    // 这样可以保证e在-0.05到0.05之间，并且有一定的变化范围

    let e = randomNormal(0, 0.01); // 假设我们想让e的均值为0，标准差为0.01
    // 最后，我们返回p + e，并且限制其在0-1之间
    return Math.max(0, Math.min(1, p + e));
  }
  // 定义一个函数，生成一个服从正态分布的随机数
  function randomNormal(mean: number, std: number): number {
    // 使用Box-Muller变换
    let u = Math.random();
    let v = Math.random();
    let z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return mean + std * z;
  }


  // 定义一个函数来生成排行榜的纯文本
  function generateRankTable(rankInfo: LMSRank[]): string {
    // 定义排行榜的模板字符串
    const template = `
最后一人站立排行榜：
 排名  昵称   积分  
--------------------
${rankInfo.map((player, index) => ` ${String(index + 1).padStart(2, ' ')}   ${player.userName.padEnd(6, ' ')} ${player.score.toString().padEnd(4, ' ')}`).join('\n')}
`
    return template
  }



}








