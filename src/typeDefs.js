module.exports = `
  scalar JSON
  enum WatchingCommentType {
    FULL
    LATEST
  }
  input BotInput {
    fId: ID!
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
  input PostToGroupInput {
    gId: ID!
    message: String!
    images: [String!]
    bot: BotInput!
  }
  input DeleteFeedInput {
    feedId: ID!
    bot: BotInput!
  }
  type Mutation {
    replyTo(input: CommentInput): Boolean! 
    stopWatchingComment(feedId: ID!): Boolean!
    postToGroup(input: PostToGroupInput!): ID
    deleteFeed(input: DeleteFeedInput!): Boolean!
  }
  type Query {
    watchComments(input: WatchingCommentInput!): [JSON!]! 
  }
`
