const cheerio = require('cheerio')
const FacebookBase = require('./facebookBase')

class FacebookUserValid extends FacebookBase {
  async isValidCookie() {
    const profileURL = `https://mbasic.facebook.com/${this.bot.fId}`
    const transporter = this.formReader.getTransporter(profileURL)
    const { body } = await transporter.get()
    const $ = cheerio.load(body)
    const logoutTag = $('a[href^="/logout.php"]')
    const photoTag = $('a[href^="/photo.php"]')
    if (logoutTag.length && photoTag.length) {
      const photoHref = photoTag.attr('href')
      const id = /&id=(\d+)&/.exec(photoHref)[1]
      return id === this.bot.fId
    }
    return false
  }
}

module.exports = FacebookUserValid
