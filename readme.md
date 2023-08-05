# koishi-plugin-last-man-standing

[![npm](https://img.shields.io/npm/v/koishi-plugin-last-man-standing?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-last-man-standing)

## 🎈 介绍

玩家轮流拿起手枪对自己的脑门开枪，直到只剩下最后一个人。

这个幸存者将获得等同于游戏总人数的积分。

这是一个基于 Koishi 的 `koishi-plugin-last-man-standing` 插件，实现了一个类似俄罗斯轮盘或最后一人站立的群聊对战游戏。


## 📦 安装

```
前往 Koishi 插件市场添加该插件即可
```

## ⚙️ 配置

```
暂无配置项
```

## 🎮 使用

- 仅群聊触发
- 建议为各指令添加合适的指令别名

## 📝 命令

* `lms` - 显示最后一人站立游戏帮助信息
* `lms.join` - 加入游戏
* `lms.quit` - 退出游戏
* `lms.start` - 开始游戏
* `lms.restart` - 重新开始游戏
* `lms.shoot` - 开枪
* `lms.points` - 查看自己的积分
* `lms.rank` - 查看排行榜

## 🌠 后续计划

* 多种游戏模式（经典模式、战斗模式、挑战模式、团队模式）
* 开枪超时时间（默认 30 秒）
* 倒计时功能（显示剩余时间）
* 武器系统（手枪、猎枪、步枪、狙击枪、火箭筒、手榴弹）
* 抢夺武器（代替别人开火）
* 擦枪走火（干掉别人）
* 支持多场景（荒漠、城市、森林、火山）
* 生命值系统（每位玩家初始 10 点生命值）
* 超时不开枪惩罚系统（扣除积分、随机更换武器、增加失灵率或爆炸率、减少生命值）

## 🙏 致谢

* [Koishi](https://koishi.chat/) - 机器人框架

## 📄 License

MIT License © 2023