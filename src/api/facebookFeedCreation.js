const { sleepSync } = require('./utils')
const FacebookAPI = require('./facebookAPI')
const FacebookUserActivity = require('./facebookUserActivity')

class FacebookFeedCreation extends FacebookAPI {
  constructor(gId, bot, Storage) {
    super(gId, bot, Storage)
    this.userActivity = new FacebookUserActivity(bot)
  }

  async post({ images = [], message }) {
    const URL = `https://mbasic.facebook.com/groups/${this.gId}`
    const imageFiles = {}
    for (let i = 0; i < images.length; i++) {
      imageFiles[`file${i + 1}`] = images[i]
    }
    await this.formReader.pipeline([
      {
        formAt: 1,
        willSubmit: (requiredFields, submitFields) => ({
          ...requiredFields,
          view_photo: submitFields.view_photo,
        }),
      },
      {
        willSubmit: (requiredFields, submitFields) => ({
          ...requiredFields,
          ...imageFiles,
          add_photo_done: submitFields.add_photo_done,
        }),
      },
      {
        willSubmit: (requiredFields, submitFields) => ({
          ...requiredFields,
          xc_message: message,
          view_post: submitFields.view_post,
        }),
      },
    ]).startWith(URL)
    await sleepSync(1000)
    return this.userActivity.getLatestPostID()
  }

  async postMessage(message) {
    const URL = `https://mbasic.facebook.com/groups/${this.gId}`
    await this.formReader.pipeline([
      {
        formAt: 1,
        willSubmit: (requiredFields, submitFields) => ({
          ...requiredFields,
          xc_message: message,
          view_post: submitFields.view_post,
        }),
      },
    ]).startWith(URL)
    await sleepSync(1000)
    return this.userActivity.getLatestPostID()
  }
}

module.exports = FacebookFeedCreation
