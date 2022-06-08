// Formatted by StandardJS

const socket = io()

const text = document.getElementById('text')
const list = document.getElementById('list')

const connect = document.getElementById('connect')
const user = document.getElementById('user')
const channel = document.getElementById('channel')
const color = document.getElementById('color')

const entry = document.getElementById('entry')
const message = document.getElementById('message')

function debounce (start, end, delay) {
  let timer
  let trigger = true
  return function (...args) {
    clearTimeout(timer)
    if (trigger) {
      start.apply(this, args)
      trigger = false
    }
    timer = setTimeout(() => {
      end.apply(this, args)
      trigger = true
    }, delay)
  }
}

function updateList (users) {
  list.innerHTML = ''
  users.forEach(({ user, active, color }) => {
    const div = document.createElement('div')
    div.setAttribute('id', `${user}`)
    div.setAttribute('class', 'user')
    div.setAttribute('style', `color: ${color};`)
    if (active) div.classList.add('active')
    div.append(user)
    list.append(div)
  })
}

function addEntry (message, color = 'rgba(0, 0, 0, 1)') {
  const div = document.createElement('div')
  div.setAttribute('class', 'message')
  div.setAttribute('style', `color: ${color};`)
  div.append(message)
  text.append(div)
  text.scrollTo(0, text.scrollHeight)
}

function main () {
  connect.addEventListener('submit', function (event) {
    event.preventDefault()
    if (user.value && channel.value && color.value) {
      socket.emit('join', {
        user: user.value,
        channel: channel.value,
        color: color.value
      })
      user.value = ''
      channel.value = ''
      color.value = 'var(--medium)'
    }
  })

  entry.addEventListener('submit', function (event) {
    event.preventDefault()
    if (message.value) {
      socket.emit('message', {
        text: message.value
      })
      message.value = ''
    }
  })

  message.addEventListener(
    'keyup',
    debounce(
      () => {
        socket.emit('active')
      },
      () => {
        socket.emit('inactive')
      },
      1000
    )
  )

  socket.on('list', ({ users }) => {
    updateList(users)
  })

  socket.on('message', ({ message, color }) => {
    addEntry(message, color)
  })
}

main()
