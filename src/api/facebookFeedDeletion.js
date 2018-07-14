const cheerio = require('cheerio')
const FacebookBase = require('./facebookBase')

class FacebookFeedDeletion extends FacebookBase {
  async delete(feedId) {
    const steps = [0, 1]
    let stepURL = `https://mbasic.facebook.com/${feedId}`
    while (steps.length) {
      const step = steps.shift()
      switch (step) {
        case 0: {
          const transporter = this.formReader.getTransporter(stepURL)
          const { body } = await transporter.get()
          const $ = cheerio.load(body)
          const deleteHref = $('a[href^="/delete.php?"]').eq(0).attr('href')
          if (!deleteHref) throw new Error(`Unable to delete feedId \`${feedId}\``)
          stepURL = `https://mbasic.facebook.com${deleteHref}`
          break
        }
        case 1: {
          await this.formReader.pipeline([
            {
              formAt: 1,
              willSubmit: (requiredFields, submitFields) => ({
                ...requiredFields,
                ...submitFields,
              }),
            },
          ]).startWith(stepURL)
          break
        }
        default: {
          throw new Error('Unknown step')
        }
      }
    }
    return true
  }
}

module.exports = FacebookFeedDeletion
