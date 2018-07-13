const GraphQLJSON = require('graphql-type-json')

module.exports = {
  JSON: GraphQLJSON,
  Mutation: {
    stopWatchingComment: async (_, { feedId }, { Comments }) => {
      await Comments.remove({ feedId })
      return true
    },
    replyTo: async (_, { input }, { Comments, FacebookFactory }) => {
      const {
        commentId,
        message,
        bot,
        gId = '',
      } = input
      const factoryParams = { gId, bot, Storage: Comments }
      const facebookCommentCreation = FacebookFactory
        .create('COMMENT_CREATION', factoryParams)
      await facebookCommentCreation.reply(commentId, message)
      return true
    },
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
          if (!feed) {
            return Comments.find({ feedId }).toArray()
          }
          return facebookFeedComment.getMoreComments(feedId)
        }
        default: {
          throw new Error(`Unknown type ${type}`)
        }
      }
    },
  },
}
