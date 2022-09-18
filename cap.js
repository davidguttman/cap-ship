let Cap
try {
  Cap = require('cap').Cap
} catch (err) {
  console.error(err)
  Cap = { deviceList: () => {} }
}

const ipHeader = require('ip-header')
const udpHeader = require('udp-header')
const through = require('through2').obj
const { get } = require('lodash')

const startIPHeader = 14
const startUDPHeader = 34
const startData = 42

module.exports = { list, createStream }

function list () {
  return Cap.deviceList().filter(d => get(d, 'addresses[0].addr'))
}

function createStream (iDevice) {
  const stream = through()

  const dev = list()[iDevice]
  // console.log(dev)
  const addr = get(dev, 'addresses[0].addr')
  // console.log({ dev, addr })

  const c = new Cap()
  const device = Cap.findDevice(addr)
  const filter = 'udp and udp[0:2] > 1024 and udp[2:2] > 1024'
  const bufSize = 10 * 1024 * 1024
  const buffer = Buffer.alloc(65535)

  c.open(device, filter, bufSize, buffer)
  c.setMinBytes && c.setMinBytes(0)

  c.on('packet', function (nbytes, trunc) {
    const packet = buffer.slice(0, nbytes)

    const decoded = decode(packet)
    if (!decoded) return
    stream.write(decoded)
    // console.log('decoded', decoded)
  })

  return stream
}

function decode (buf) {
  try {
    const iHeader = ipHeader(buf, startIPHeader)
    const uHeader = udpHeader(buf, startUDPHeader)

    uHeader.srcport = uHeader.srcPort
    uHeader.dstport = uHeader.dstPort

    const data = buf.slice(startData)
    const decoded = {
      data: data.toString('hex'),
      ip: iHeader,
      udp: uHeader,
      ts: Date.now()
    }

    const whitelist = '160.72.227.57'

    if (iHeader.src !== whitelist && iHeader.dst !== whitelist) return

    return decoded
  } catch (err) {
    console.error(err)
    return null
  }
}
