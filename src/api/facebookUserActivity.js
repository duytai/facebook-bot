const cheerio = require('cheerio')
const FacebookBase = require('./facebookBase')

class FacebookUserActivity extends FacebookBase {
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

module.exports = FacebookUserActivity
