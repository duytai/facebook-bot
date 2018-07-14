const cheerio = require('cheerio')
const FacebookBase = require('./facebookBase')

class FacebookUserGroup extends FacebookBase {
  async joinedGroups() {
    const groups = []
    const groupURL = 'https://mbasic.facebook.com/groups/?seemore&refid=27'
    const transporter = this.formReader.getTransporter(groupURL)
    const { body } = await transporter.get()
    const $ = cheerio.load(body)
    const tags = $('#root').find('a')
    for (let i = 1; i < tags.length; i += 1) {
      const tag = tags.eq(i)
      const href = tag.attr('href')
      const name = tag.text()
      const id = href
        .replace('?refid=27', '')
        .replace('/groups/', '')
      groups.push({ id, name })
    }
    return groups
  }
}

module.exports = FacebookUserGroup
