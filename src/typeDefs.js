module.exports = `
  scalar JSON
  type WatchingData {
    added: [JSON!]!
    changed: [JSON!]!
    removed: [JSON!]!
  }
  type Query {
    comments(gId: ID!, bot: JSON!): WatchingData! 
  }
`
