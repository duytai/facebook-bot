const GraphQLJSON = require('graphql-type-json')

module.exports = {
  JSON: GraphQLJSON,
  Mutation: {
    replyTo: async (_, { input }, { Comments, FacebookFactory }) => {
      const {
        commentId,
        message,
        bot,
        gId = '',
      } = input
      const facebookCommentCreation = FacebookFactory.create('COMMENT_CREATION', {
        gId,
        bot,
        Storage: Comments,
      }
    }
  },
  Query: {
    comments: async (_, { input }, { FacebookFactory, Comments }) => {
      const {
        feedId,
        bot,
        type,
        gId = '',
      } = input
      const facebookFeedComment = FacebookFactory.create('COMMENT', {
        gId,
        bot,
        Storage: Comments,
      })
      const feed = await Comments.findOne({ feedId })
      if (!feed) {
        const comments = await facebookFeedComment.getComments(feedId)
        await Comments.insertMany(comments)
      }
      switch (type) {
        case 'FULL': {
          return Comments.find({ feedId }).toArray()
        }
        case 'LATEST': {
          return facebookFeedComment.getMoreComments(feedId)
        }
        default: {
          throw new Error(`Unknown type ${type}`)
        }
      }
    },
  },
}
