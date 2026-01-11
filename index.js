const express = require('express')
const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const mcDataLoader = require('minecraft-data')

const app = express()
app.use(express.json())

const bots = {}
const logs = []

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}`
  logs.push(entry)
  if (logs.length > 500) logs.shift()
  console.log(entry)
}

// 🤖 CREATE BOT
function createBot({ name, host, port, password }) {
  if (bots[name]) return 'Bot already exists'

  const bot = mineflayer.createBot({
    host,
    port,
    username: name
  })

  bots[name] = bot
  bot.loadPlugin(pathfinder)

  bot.once('spawn', () => {
    log(`✅ ${name} spawned`)

    const mcData = mcDataLoader(bot.version)
    const movements = new Movements(bot, mcData)
    bot.pathfinder.setMovements(movements)

    // 🔐 Register + Login (AuthMe safe)
    setTimeout(() => {
      bot.chat(`/register ${password} ${password}`)
      bot.chat(`/login ${password}`)
      log(`🔐 ${name} tried register/login`)
    }, 2000)

    antiAFK(bot, name)
    randomWalk(bot)
    fakeAFK(bot, name)
  })

  bot.on('end', () => {
    log(`❌ ${name} disconnected, reconnecting`)
    delete bots[name]
    setTimeout(() => createBot({ name, host, port, password }), 5000)
  })

  bot.on('error', err => {
    log(`⚠️ ${name} error: ${err.message}`)
  })

  return 'Bot started'
}

// 💤 Anti-AFK
function antiAFK(bot, name) {
  setInterval(() => {
    if (!bot.entity) return

    bot.setControlState('jump', true)
    setTimeout(() => bot.setControlState('jump', false), 300)

    bot.setControlState('sneak', true)
    setTimeout(() => bot.setControlState('sneak', false), 600)

    bot.look(Math.random() * Math.PI * 2, 0, true)
  }, rand(4000, 7000))
}

// 🚶 Pathfinder walking
function randomWalk(bot) {
  setInterval(() => {
    if (!bot.entity) return
    const pos = bot.entity.position
    bot.pathfinder.setGoal(
      new goals.GoalXZ(
        pos.x + rand(-8, 8),
        pos.z + rand(-8, 8)
      )
    )
  }, rand(12000, 20000))
}

// 😴 Fake AFK
function fakeAFK(bot, name) {
  setInterval(() => {
    log(`😴 ${name} fake AFK`)
    bot.clearControlStates()
  }, rand(60000, 120000))
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

  const result = createBot({ name, host, port, password })
  res.json({ status: result })
})

// ❌ Stop bot
app.post('/bot/stop', (req, res) => {
  const { name } = req.body
  if (!bots[name]) return res.status(404).json({ error: 'Bot not found' })

  bots[name].quit()
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
  log('🌐 API running on http://localhost:3000')
})
