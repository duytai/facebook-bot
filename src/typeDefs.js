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
  input CommentInput {
    commentId: ID!
    message: String!
    bot: BotInput!
  }
  type Mutation {
    replyTo(input: CommentInput): Boolean! 
    stopWatchingComment(feedId: ID!): Boolean!
  }
  type Query {
    comments(input: WatchingCommentInput!): [JSON!]! 
  }
`
