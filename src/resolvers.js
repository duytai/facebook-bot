const Q = require('q')
const fs = require('fs')
const GraphQLJSON = require('graphql-type-json')
const { downloadFile } = require('./api/utils')

module.exports = {
  JSON: GraphQLJSON,
  Mutation: {
    postToGroup: async (_, { input }, { FacebookFactory }) => {
      const {
        gId,
        message,
        images,
        bot,
      } = input
      const factoryParams = { gId, bot, Storage: null }
      const facebookFeedCreation = FacebookFactory.create('FEED_CREATION', factoryParams)
      if (!images) {
        return facebookFeedCreation.postMessage(message)
      }
      return Q.all(images.map(downloadFile)).then((files) => {
        return facebookFeedCreation.post({
          images: files.map(file => fs.createReadStream(file)),
          message,
        }).then((feedId) => {
          files.map(file => fs.unlinkSync(file))
          return feedId
        })
      })
    },
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
    watchComments: async (_, { input }, { FacebookFactory, Comments }) => {
      const {
        feedId,
        bot,
        type,
        gId = '',
      } = input
      const factoryParams = { gId, bot, Storage: Comments }
      const facebookFeedComment = FacebookFactory.create('COMMENT', factoryParams)
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
