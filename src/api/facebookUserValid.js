const cheerio = require('cheerio')
const FacebookBase = require('./facebookBase')

class FacebookUserValid extends FacebookBase {
  async relogin(username, password) {
    const loginURL = 'https://mbasic.facebook.com/'
    const { headers } = await this.formReader.pipeline([
      {
        formAt: 0,
        willSubmit: (requiredFields, submitFields) => ({
          ...requiredFields,
          login: submitFields.login,
          email: username,
          pass: password,
        }),
      },
    ]).startWith(loginURL)
    const cookie = headers['set-cookie']
      .map(c => c.split(';')[0])
      .join(';')
    if (!/c_user=(\d+)/.test(cookie)) throw new Error('Invalid user/password')
    const fId = /c_user=(\d+)/.exec(cookie)[1]
    return {
      fId,
      cookie,
    }
  }

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
