const { MongoClient } = require('mongodb')
const { ApolloServer } = require('apollo-server-express')
const express = require('express')
const {
  FacebookFactory,
  typeDefs,
  resolvers,
} = require('./src')

const { MONGO_URL, DB, PORT } = JSON.parse(process.env.SETTINGS)
MongoClient.connect(MONGO_URL, { useNewUrlParser: true }, (error, client) => {
  if (error) throw error
  const db = client.db(DB)
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: {
      Comments: db.collection('comments'),
      FacebookFactory,
    },
  })
  const app = express()
  server.applyMiddleware({ app })

  app.listen({ port: PORT }, () =>
    console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`)
  )
})
