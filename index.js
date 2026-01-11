const express = require('express')
const mineflayer = require('mineflayer')
const cors = require("cors")

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

// 🤖 CREATE BOT
function startBot({ name, host, port, password }) {
  if (bots[name]) return 'Bot already running'

  const bot = mineflayer.createBot({
    host,
    port,
    username: name
  })

  bots[name] = bot

  bot.once('spawn', () => {
    log(`✅ ${name} joined server`)

    // 🔐 Register + Login
    setTimeout(() => {
      bot.chat(`/register ${password} ${password}`)
      bot.chat(`/login ${password}`)
      log(`🔐 ${name} tried register/login`)
    }, 2000)

    antiAFK(bot, name)
  })

  bot.on('end', () => {
    log(`❌ ${name} disconnected, reconnecting`)
    delete bots[name]
    setTimeout(() => startBot({ name, host, port, password }), 5000)
  })

  bot.on('error', err => {
    log(`⚠️ ${name} error: ${err.message}`)
  })

  return 'Bot started'
}

// 💤 Anti-AFK (NO EXTRA PACKAGES)
function antiAFK(bot, name) {
  setInterval(() => {
    if (!bot.entity) return

    const actions = ['forward', 'back', 'left', 'right']
    const move = actions[Math.floor(Math.random() * actions.length)]

    bot.setControlState(move, true)
    setTimeout(() => bot.setControlState(move, false), rand(400, 1200))

    bot.setControlState('jump', true)
    setTimeout(() => bot.setControlState('jump', false), 300)

    bot.setControlState('sneak', true)
    setTimeout(() => bot.setControlState('sneak', false), 600)

    bot.look(Math.random() * Math.PI * 2, 0, true)
  }, rand(3000, 6000))
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

//
// 🌐 EXPRESS APIs
//

// ➕ Start bot
app.post('/bot/start', (req, res) => {
  const { name, host, port, password } = req.body
  if (!name || !host || !port || !password)
    return res.status(400).json({ error: 'Missing fields' })

  const result = startBot({ name, host, port, password })
  res.json({ status: result })
})

// 🛑 Stop bot
app.post('/bot/stop', (req, res) => {
  const { name } = req.body
  const bot = bots[name]
  if (!bot) return res.status(404).json({ error: 'Bot not found' })

  bot.quit()
  delete bots[name]
  log(`🛑 ${name} stopped`)
  res.json({ status: 'Bot stopped' })
})

// 📋 List bots
app.get('/bots', (req, res) => {
  res.json(Object.keys(bots))
})

// 📜 Logs
app.get('/logs', (req, res) => {
  res.json(logs)
})

app.listen(3000, () => {
  log('🌐 API running on port 3000')
})