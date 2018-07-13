const FacebookBase = require('./facebookBase')

class FacebookAPI extends FacebookBase {
  constructor(gId, bot, Storage) {
    super(bot)
    this.gId = gId
    this.Storage = Storage
  }
}

module.exports = FacebookAPI
