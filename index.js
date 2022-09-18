const got = require('got')
const { slug } = require('cuid')

const Cap = require('./cap')

const KEY = process.argv[2] || slug()
const SEND_INTERVAL = 250
const RELAY_SERVER = 'https://byte-relay.herokuapp.com'

console.log({ KEY })

const stream = Cap.createStream(0)

const buffer = []
stream.on('data', data => buffer.push(data))

setTimeout(sendLoop, SEND_INTERVAL)

function sendLoop () {
  const toSend = buffer.splice(0)
  console.log('toSend.length', toSend.length)

  if (!KEY || !toSend.length) {
    return setTimeout(sendLoop, SEND_INTERVAL)
  }

  got
    .post(`${RELAY_SERVER}/${KEY}`, {
      body: JSON.stringify(toSend),
      headers: { 'content-type': 'application/json' }
    })
    .then(() => onSend())
    .catch(onSend)

  function onSend (err) {
    if (err) console.error(err)
    setTimeout(sendLoop, SEND_INTERVAL)
  }
}
