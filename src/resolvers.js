const Q = require('q')
const fs = require('fs')
const GraphQLJSON = require('graphql-type-json')
const { downloadFile } = require('./api/utils')

module.exports = {
  JSON: GraphQLJSON,
  Mutation: {
    reloginBot: async (_, { input }, { FacebookFactory }) => {
      const { username, password } = input
      const bot = { fId: '', cookie: '' }
      const facebookUserValid = FacebookFactory.create('USER_VALID', { bot })
      return facebookUserValid.relogin(username, password)
    },
    deleteFeed: async (_, { input }, { FacebookFactory }) => {
      const { feedId, bot } = input
      const factoryParams = { gId: '', bot, Storage: null }
      const facebookFeedDeletion = FacebookFactory.create('FEED_DELETION', factoryParams)
      await facebookFeedDeletion.delete(feedId)
    },
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
    validBot: async (_, { input }, { FacebookFactory }) => {
      const { bot } = input
      const facebookUserValid = FacebookFactory.create('USER_VALID', { bot })
      return facebookUserValid.isValidCookie()
    },
    joinedGroups: async (_, { input }, { FacebookFactory }) => {
      const { bot } = input
      const facebookUserGroup = FacebookFactory.create('USER_GROUP', { bot })
      return facebookUserGroup.joinedGroups()
    },
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
