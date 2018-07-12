module.exports = `
  scalar JSON
  input BotInput {
    fbId: ID!
    cookie: String!
  }
  type WatchingData {
    initialized: [JSON!]!
    added: [JSON!]!
    changed: [JSON!]!
    removed: [JSON!]!
  }
  type Query {
    comments(gId: ID!, feedId: ID!, bot: BotInput!): WatchingData! 
  }
`
