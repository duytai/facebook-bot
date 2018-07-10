const fs = require('fs')
const cheerio = require('cheerio')
const Q = require('q')
const { FormReader } = require('form-reader')
const FacebookUserAPI = require('./facebookUserAPI')
const { sleepSync } = require('./utils')

const { USER_AGENT } = JSON.parse(process.env.SETTINGS)
class FacebookGroupAPI {
  constructor(gId, bot) {
    this.gId = gId
    this.bot = bot
    this.facebookUserAPI = new FacebookUserAPI(bot)
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
  async getCommentsFromURL(url, options = {}) {
    const commentConnection = {
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        nextURL: null,
        prevURL: null,
        curURL: url,
      },
      comments: []
    } 
    const transporter = this.formReader.getTransporter(url)
    const { body } = await transporter.get() 
    const $ = cheerio.load(body)
    let commentElems = null
    if ($(`div[id^="ufi_"]`).length) {
      commentElems = $(`div[id^="ufi_"]`)
        .children()
        .eq(0)
        .children()
        .eq(4)
        .children()
    } else {
      commentElems = $(`#root`)
        .children()
        .eq(0)
        .children()
        .eq(2)
        .children()
    } 
    for (let i = 0; i < commentElems.length; i++) {
      const commentElem = commentElems.eq(i)
      const id = commentElem.attr('id')
      const tag = commentElem.children().eq(0)
      switch (tag.prop('tagName')) {
        case 'DIV': {
          const wrapper = tag.children()
          const name = wrapper.eq(0).text()
          const link = wrapper 
            .eq(0)
            .children()
            .eq(0)
            .attr('href')
          const message = wrapper.eq(1).text()
          let replies = []
          if (tag.find('a[href^="/comment/replies"]').length) {
            const href = tag.find('a[href^="/comment/replies"]').attr('href')
            const replyLink = `https://mbasic.facebook.com${href}`
            replies = await this.getCommentsFromURL(replyLink, {
              goNext: false,
              goPrev: false,
            })
          }
          commentConnection.comments.push({
            id,
            name,
            link,
            message,
            replies,
          })
          break
        }
        case 'A': {
          const href = tag.attr('href') 
          const pageURL = `https://mbasic.facebook.com${href}`
          switch (i) {
            case 0: {
              commentConnection.pageInfo.hasPreviousPage = true
              commentConnection.pageInfo.prevURL = pageURL
              break
            }
            case commentElems.length - 1: {
              commentConnection.pageInfo.hasNextPage = true 
              commentConnection.pageInfo.nextURL = pageURL
              break
            }
          }
          break
        }
      }
    }
    // detect Jump template
    if (!options.goNext && !options.goPrev) {
      if (commentConnection.pageInfo.hasNextPage) {
        options.goNext = true
      }
      if (commentConnection.pageInfo.hasPreviousPage) {
        options.goPrev = true
      }
    }
    // jump
    if (options.goNext && commentConnection.pageInfo.hasNextPage) {
      const nextConnections = await this
        .getCommentsFromURL(commentConnection.pageInfo.nextURL, options)
      return [commentConnection]
        .concat(nextConnections)
    }
    if (options.goPrev && commentConnection.pageInfo.hasPreviousPage) {
      const prevConnections = await this
        .getCommentsFromURL(commentConnection.pageInfo.prevURL, options)
      return prevConnections.concat([commentConnection])
    }
    return [commentConnection] 
  }
  async getComments(postId) {
    const url = `https://mbasic.facebook.com/${postId}`
    const options = { 
      goNext: false, 
      goPrev: false,
    }
    const comments = await this.getCommentsFromURL(url, options)
    console.log(JSON.stringify(comments))
  }
  async post({ images = [], message }) {
    const URL = `https://mbasic.facebook.com/groups/${this.gId}`
    const imageFiles = {}
    for (let i = 0; i < images.length; i++) {
      imageFiles[`file${i+1}`] = images[i]
    }
    const { body, headers } = await this.formReader.pipeline([
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
          add_photo_done: submitFields.add_photo_done
        })
      },
      {
        willSubmit: (requiredFields, submitFields) => ({
          ...requiredFields,
          xc_message: message,
          view_post: submitFields.view_post,
        })
      }
    ]).startWith(URL)
    await sleepSync(1000)
    return this.facebookUserAPI.getLatestPostID()
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
      }
    ]).startWith(URL)
    await sleepSync(1000)
    return this.facebookUserAPI.getLatestPostID()
  }
}

module.exports = FacebookGroupAPI 
