const FacebookUserActivity = require('./facebookUserActivity')
const FacebookFeedComment = require('./facebookFeedComment')
const FacebookFeedCreation = require('./facebookFeedCreation')
const FacebookCommentCreation = require('./FacebookCommentCreation')

const FacebookFactory = {
  create(type, params) {
    const { gId, bot, Storage } = params
    switch (type) {
      case 'USER':
        return new FacebookUserActivity(bot)
      case 'COMMENT':
        return new FacebookFeedComment(gId, bot, Storage)
      case 'COMMENT_CREATION':
        return new FacebookCommentCreation(gId, bot, Storage)
      case 'FEED_CREATION':
        return new FacebookFeedCreation(gId, bot, Storage)
      default:
        throw new Error(`Unknown type ${type}`)
    }
  },
}

module.exports = FacebookFactory
