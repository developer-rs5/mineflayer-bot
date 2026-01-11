const express = require('express')
const mineflayer = require('mineflayer')
const cors = require("cors")
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')

const app = express()
app.use(cors())
app.use(express.json())

const bots = {}
const logs = {}
const manualStops = {} // 🔑 THIS FIXES YOUR ISSUE

function log(name, msg) {
  const line = `[${new Date().toISOString()}] ${msg}`
  if (!logs[name]) logs[name] = []
  logs[name].push(line)
  if (logs[name].length > 300) logs[name].shift()
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

  manualStops[name] = false // 👈 reset stop flag

  const bot = mineflayer.createBot({
    host,
    port,
    username: name
  })

  bot.loadPlugin(pathfinder)

  bots[name] = {
    bot,
    intervals: []
  }

  bot.once('spawn', () => {
    log(name, `✅ ${name} joined server`)

    setTimeout(() => {
      bot.chat(`/register ${password} ${password}`)
      bot.chat(`/login ${password}`)
      log(name, `🔐 ${name} tried register/login`)
    }, 2000)

    const mcData = require('minecraft-data')(bot.version)
    const movements = new Movements(bot, mcData)
    movements.allow1by1towers = false
    movements.canDig = false
    bot.pathfinder.setMovements(movements)

    bots[name].intervals.push(advancedAFK(bot))
    bots[name].intervals.push(randomChat(bot))
    bots[name].intervals.push(randomWalk(bot))
  })

  bot.on('end', () => {
    log(name, `❌ ${name} disconnected`)

    // clear intervals
    if (bots[name]) {
      bots[name].intervals.forEach(clearInterval)
      delete bots[name]
    }

    if (manualStops[name]) {
      log(name, `🛑 ${name} was manually stopped. No reconnect.`)
      delete manualStops[name]
      return
    }

    log(name, `🔄 ${name} reconnecting in 5s`)
    setTimeout(() => {
      startBot({ name, host, port, password })
    }, 5000)
  })

  bot.on('error', err => {
    log(name, `⚠️ ${name} error: ${err.message}`)
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
    setTimeout(() => bot.clearControlStates(), 400)

  }, rand(3000, 6000))
}

// 🚶 RANDOM WALK
function randomWalk(bot) {
  return setInterval(() => {
    if (!bot.entity || bot.pathfinder.isMoving()) return

    const pos = bot.entity.position
    bot.pathfinder.setGoal(
      new goals.GoalNear(
        pos.x + rand(-10, 10),
        pos.y,
        pos.z + rand(-10, 10),
        1
      )
    )
  }, rand(8000, 15000))
}

// 💬 RANDOM CHAT
function randomChat(bot) {
  return setInterval(() => {
    if (!bot.entity) return
    const msg = chatMessages[rand(0, chatMessages.length - 1)]
    bot.chat(msg)
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
  const data = bots[name]
  if (!data) return res.status(404).json({ error: 'Bot not found' })

  manualStops[name] = true
  data.intervals.forEach(clearInterval)
  data.bot.quit()

  delete bots[name]
  log(name, `🛑 ${name} stopped manually`)
  res.json({ status: 'Bot stopped' })
})

app.get('/bots', (req, res) => {
  res.json(Object.keys(bots))
})

app.get('/logs/:name', (req, res) => {
  res.json(logs[req.params.name] || [])
})

app.listen(3000, () => {
  console.log('🌐 API running on port 3000')
})
