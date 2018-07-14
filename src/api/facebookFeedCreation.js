const { omit } = require('underscore')
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
    const addFirstPhoto = [
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
          file1: images[0],
          add_photo_done: submitFields.add_photo_done,
        }),
      },
    ]
    const addOtherPhotos = images.slice(1).map(image => [
      {
        willSubmit: requiredFields => ({
          ...omit(requiredFields, (value, key) => key.includes('remove_photo_overview')),
        }),
      },
      {
        willSubmit: (requiredFields, submitFields) => ({
          ...omit(requiredFields, (value, key) => key.includes('remove_photo')),
          file1: image,
          add_photo_done: submitFields.add_photo_done,
        }),
      },
    ]).reduce((r, n) => r.concat(n), [])
    const submitPhotos = [
      {
        willSubmit: (requiredFields, submitFields) => ({
          ...requiredFields,
          xc_message: message,
          view_post: submitFields.view_post,
        }),
      },
    ]
    const pipeline = addFirstPhoto.concat(addOtherPhotos).concat(submitPhotos)
    await this.formReader.pipeline(pipeline).startWith(URL)
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
