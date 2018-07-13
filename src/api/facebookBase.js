const { FormReader } = require('form-reader')

const { USER_AGENT } = JSON.parse(process.env.SETTINGS)
class FacebookBase {
  constructor(bot) {
    this.bot = bot
    this.formReader = new FormReader({
      useCache: false,
      willSendRequest: {
        headers: {
          'User-Agent': USER_AGENT,
          cookie: bot.cookie,
        },
      },
    })
  }
}
module.exports = FacebookBase
