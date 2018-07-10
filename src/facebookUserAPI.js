const cheerio = require('cheerio')
const { FormReader } = require('form-reader')

const { USER_AGENT } = JSON.parse(process.env.SETTINGS)
class FacebookUserAPI {
  constructor(bot) {
    this.bot = bot
    this.formReader = new FormReader({
      useCache: false,
      willSendRequest: {
        headers: {
          'User-Agent': USER_AGENT,
          cookie: bot.cookie,
        }
      }
    })
  }
  async getLatestPostID() {
    const URL = `https://mbasic.facebook.com/${this.bot.fId}/allactivity` 
    const transporter = this.formReader.getTransporter(URL)
    const { body } = await transporter.get() 
    const $ = cheerio.load(body)
    const latestTag = $('#root').find('a').eq(1)
    const postId = latestTag
      .attr('href')
      .split('?view=permalink&id=')[1]
    return postId
  }
}

module.exports = FacebookUserAPI
