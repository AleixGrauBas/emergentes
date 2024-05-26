const SSE = require('express-sse') //Server-side events
const events = require('events')

const STREAM = new SSE()

const emitter = new events.EventEmitter()

exports.eventStream = (req, res) => {
  console.log('Nueva conexion SSE ...')
  STREAM.init(req, res)
}

exports.start = () => {

    emitter.on('new-post', data => {
          STREAM.send(JSON.stringify(data), 'new-post')
    })

    //AQUI SE PONDRIAN OTROS EVENTOS

}

exports.emitter = emitter
exports.STREAM  = STREAM
