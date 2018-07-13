const FacebookUserActivity = require('./facebookUserActivity')
const FacebookFeedComment = require('./facebookFeedComment')
const FacebookFeedCreation = require('./facebookFeedCreation')

const FacebookFactory = {
  create(type, params) {
    const { gId, bot, Storage } = params
    switch (type) {
      case 'USER':
        return new FacebookUserActivity(bot)
      case 'COMMENT':
        return new FacebookFeedComment(gId, bot, Storage)
      case 'REACTION':
        return new FacebookFeedCreation(gId, bot, Storage)
      default:
        throw new Error(`Unknown type ${type}`)
    }
  },
}

module.exports = FacebookFactory
