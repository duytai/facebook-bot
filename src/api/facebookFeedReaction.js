const cheerio = require('cheerio')
const FacebookAPI = require('./facebookAPI')
const { toProfile } = require('./utils')

class FacebookFeedReaction extends FacebookAPI {
  async getReactionsFromURL(reactLink) {
    const reactionConnection = {
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        nextURL: null,
        prevURL: null,
        curURL: reactLink,
      },
      users: [],
    }
    const transporter = this.formReader.getTransporter(reactLink)
    const { body } = await transporter.get()
    const $ = cheerio.load(body)
    const lis = $('li')
    for (let i = 0; i < lis.length; i++) {
      const li = lis.eq(i)
      const numImgTags = li.find('img').length
      switch (numImgTags) {
        case 0: {
          const href = li.find('a').attr('href')
          const nextURL = `https://mbasic.facebook.com${href}`
            .replace('limit=10', 'limit=500')
          reactionConnection.pageInfo.hasNextPage = true
          reactionConnection.pageInfo.nextURL = nextURL
          break
        }
        case 2: {
          const img = li.find('img').last()
          const link = li.find('a').first().attr('href')
          const reactType = img.attr('alt')
          const profile = toProfile(link)
          reactionConnection.users.push({
            reactType,
            ...profile,
          })
          break
        }
        default:
          throw new Error('Unexpected errors')
      }
    }
    if (reactionConnection.pageInfo.hasNextPage) {
      return [reactionConnection].concat(
        await this.getReactionsFromURL(reactionConnection.pageInfo.nextURL),
      )
    }
    return [reactionConnection]
  }

  async getReactions(postId) {
    const reactLink = `https://mbasic.facebook.com/ufi/reaction/profile/browser/?ft_ent_identifier=${postId}`
    return this.getReactionsFromURL(reactLink)
  }
}

module.exports = FacebookFeedReaction
