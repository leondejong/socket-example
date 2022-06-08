// Formatted by StandardJS

const express = require('express')
const http = require('http')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = new Server(server)

const port = 3000
const sockets = {}
const users = {}
const primary = 'var(--dark)'

function compare (a, b, f = 'user') {
  if (a[f] < b[f]) return -1
  if (a[f] > b[f]) return 1
  return 0
}

function pad (num, len = 2, str = '0') {
  return num.toString().padStart(len, str)
}

function getDate (date) {
  return formatDate(date ? new Date(date) : new Date())
}

function formatDate (date) {
  const second = pad(date.getSeconds())
  const minute = pad(date.getMinutes())
  const hour = pad(date.getHours())
  const day = pad(date.getDate())
  const month = pad(date.getMonth() + 1)
  const year = date
    .getFullYear()
    .toString()
    .slice(2)

  return `${day}-${month}-${year} ${hour}:${minute}:${second}`
}

function validUser (socket) {
  return socket?.data?.user && socket?.data?.channel
}

function list (channel) {
  if (!channel) {
    return io.emit('list', {
      users
    })
  }

  return io.to(channel).emit('list', {
    users: Object.values(users)
      .filter(user => user.channel === channel)
      .sort(compare)
  })
}

function leave (socket) {
  if (typeof socket === 'string') {
    socket = sockets[socket]
  }

  if (validUser(socket)) {
    const date = getDate()
    const { user, channel } = socket.data
    const message = `${date} - User '${user}' left channel '${channel}'`

    delete users[user]
    socket.leave(channel)

    list(channel)

    return io
      .to(channel)
      .emit('message', { date, user, message, color: primary })
  }
}

function join (socket, data) {
  const date = getDate()

  if (!(data?.user && data?.channel)) {
    const message = `${date} - Could not join channel`

    return socket.emit('message', { date, message, color: primary })
  }

  const { user, channel } = data

  if (users[user] && users[user].channel === channel) {
    const message = `${date} - User '${user}' already exists on channel '${channel}'`

    return socket.emit('message', { date, message, color: primary })
  }

  leave(socket)
  socket.data = { ...data, active: false }
  users[user] = socket.data
  socket.join(channel)

  const message = `${date} - User '${user}' joined channel '${channel}'`

  list(channel)

  return io.to(channel).emit('message', { date, user, message, color: primary })
}

function message (socket, data) {
  const date = getDate()

  if (!(validUser(socket) && data?.text)) {
    const message = `${date} - Not connected`

    return socket.emit('message', { date, message, color: primary })
  }

  const color = socket?.data?.color || 'var(--medium)'
  const { user, channel } = socket.data
  const { text } = data

  const message = `${date} - ${user}: ${text}`

  return io.to(channel).emit('message', { date, user, message, color })
}

function active (socket) {
  if (validUser(socket)) {
    users[socket.data?.user].active = true
    list(socket.data?.channel)
  }
}

function inactive (socket) {
  if (validUser(socket)) {
    users[socket.data?.user].active = false
    list(socket.data?.channel)
  }
}

app.use(express.static(__dirname))

app.get('/', (request, response) => {
  response.sendFile(__dirname + '/index.html')
})

io.on('connection', socket => {
  sockets[socket.id] = socket

  socket.emit('id', socket.id)

  socket.onAny((...args) => {
    console.log(socket.id, args)
  })

  socket.on('disconnect', () => {
    delete sockets[socket.id]
    leave(socket)
  })

  socket.on('leave', id => {
    leave(id || socket)
  })

  socket.on('join', data => {
    join(socket, data)
  })

  socket.on('message', data => {
    message(socket, data)
  })

  socket.on('active', () => {
    active(socket)
  })

  socket.on('inactive', () => {
    inactive(socket)
  })
})

server.listen(port, () => {
  console.log(`listening on port ${port}`)
})
