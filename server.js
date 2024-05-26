//server.js

var express = require("express")
var { createHandler } = require("graphql-http/lib/use/express")
var { buildSchema } = require("graphql")
var { ruruHTML } = require("ruru/server")

const cors = require('cors')

const {root, schema, sse} = require('./controllers')

const app = express()

app.use(cors())

// Create and use the GraphQL handler.
app.all(
  "/graphql",
  createHandler({
    schema: schema,
    rootValue: root,
  })
)

// Serve the GraphiQL IDE.
app.get("/", (_req, res) => {
  res.type("html")
  res.end(ruruHTML({ endpoint: "/graphql" }))
})


//Static content (web app)
app.use('/web',  express.static('public'))

//Endpoint for SSE stream
app.use('/news', sse.eventStream)

app.listen(8080, () => console.log('Listening on 8080'))

