const express = require('express')
const mineflayer = require('mineflayer')
const cors = require("cors")
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')

const app = express()
app.use(cors())
app.use(express.json())

const bots = {}
const logs = []

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`
  logs.push(line)
  if (logs.length > 300) logs.shift()
  console.log(line)
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const chatMessages = [
  "this bot is powered by zenuxs 🚀",
  "join zenuxs at : https://discord.zenuxs.in",
  "make your own free bot at zenuxs discord server",
  "zenuxs bots go brrrr 🔥",
  "coding + minecraft = zenuxs 😎"
]

// 🤖 START BOT
function startBot({ name, host, port, password }) {
  if (bots[name]) return 'Bot already running'

  const bot = mineflayer.createBot({
    host,
    port,
    username: name
  })

  bot.loadPlugin(pathfinder)
  bots[name] = bot

  let afkInterval, chatInterval, walkInterval

  bot.once('spawn', () => {
    log(`✅ ${name} joined server`)

    setTimeout(() => {
      bot.chat(`/register ${password} ${password}`)
      bot.chat(`/login ${password}`)
      log(`🔐 ${name} tried register/login`)
    }, 2000)

    const mcData = require('minecraft-data')(bot.version)
    const movements = new Movements(bot, mcData)
    movements.allow1by1towers = false
    movements.canDig = false
    bot.pathfinder.setMovements(movements)

    afkInterval = advancedAFK(bot)
    chatInterval = randomChat(bot)
    walkInterval = randomWalk(bot)
  })

  bot.on('playerCollect', (collector, itemDrop) => {
    if (collector.username !== bot.username) return
    bot.lookAt(itemDrop.position.offset(0, 1, 0))
  })

  bot.on('end', () => {
    log(`❌ ${name} disconnected, reconnecting`)
    clearInterval(afkInterval)
    clearInterval(chatInterval)
    clearInterval(walkInterval)
    delete bots[name]
    setTimeout(() => startBot({ name, host, port, password }), 5000)
  })

  bot.on('error', err => {
    log(`⚠️ ${name} error: ${err.message}`)
  })

  return 'Bot started'
}

// 🧍 HUMAN AFK
function advancedAFK(bot) {
  return setInterval(() => {
    if (!bot.entity) return

    if (Math.random() > 0.6) {
      const yaw = Math.random() * Math.PI * 2
      const pitch = (Math.random() - 0.5) * Math.PI / 4
      bot.look(yaw, pitch, true)
    }

    if (Math.random() > 0.7) bot.setControlState('jump', true)
    setTimeout(() => bot.clearControlStates(), 500)

  }, rand(3000, 6000))
}

// 🚶 RANDOM WALK USING PATHFINDER
function randomWalk(bot) {
  return setInterval(() => {
    if (!bot.entity || bot.pathfinder.isMoving()) return

    const x = bot.entity.position.x + rand(-10, 10)
    const z = bot.entity.position.z + rand(-10, 10)
    const y = bot.entity.position.y

    bot.pathfinder.setGoal(
      new goals.GoalNear(x, y, z, 1)
    )
  }, rand(8000, 15000))
}

// 💬 RANDOM CHAT
function randomChat(bot) {
  return setInterval(() => {
    if (!bot.entity) return
    const msg = chatMessages[rand(0, chatMessages.length - 1)]
    bot.chat(msg)
    log(`💬 Bot said: ${msg}`)
  }, rand(120000, 240000))
}

//
// 🌐 API
//

app.post('/bot/start', (req, res) => {
  const { name, host, port, password } = req.body
  if (!name || !host || !port || !password)
    return res.status(400).json({ error: 'Missing fields' })

  const result = startBot({ name, host, port, password })
  res.json({ status: result })
})

app.post('/bot/stop', (req, res) => {
  const { name } = req.body
  const bot = bots[name]
  if (!bot) return res.status(404).json({ error: 'Bot not found' })

  bot.quit()
  delete bots[name]
  log(`🛑 ${name} stopped`)
  res.json({ status: 'Bot stopped' })
})

app.get('/bots', (req, res) => {
  res.json(Object.keys(bots))
})

app.get('/logs', (req, res) => {
  res.json(logs)
})

app.listen(3000, () => {
  log('🌐 API running on port 3000')
})
