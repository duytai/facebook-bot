module.exports = `
  scalar JSON
  enum WatchingCommentType {
    FULL
    LATEST
  }
  input BotInput {
    fbId: ID!
    cookie: String!
  }
  input WatchingCommentInput {
    feedId: ID!
    bot: BotInput!
    type: WatchingCommentType!
  }
  type Query {
    comments(input: WatchingCommentInput!): [JSON!]! 
  }
`
