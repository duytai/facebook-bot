const { groupBy } = require('underscore')
const cheerio = require('cheerio')
const { FormReader } = require('form-reader')
const FacebookUserAPI = require('./facebookUserAPI')
const { sleepSync, toProfile, removeNullProps } = require('./utils')

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
    const reactions = await this.getReactionsFromURL(reactLink)
  }

  async getCommentsFromURL(url, options = {}) {
    let comments = []
    let replies = []
    const pageInfo = {
      hasNextPage: false,
      hasPreviousPage: false,
      nextURL: null,
      prevURL: null,
      curURL: url,
    }
    let { goNext, goPrev } = options
    const { feedId, replyTo } = options
    const transporter = this.formReader.getTransporter(url)
    const { body } = await transporter.get()
    const $ = cheerio.load(body)
    let commentElems = null
    if ($('div[id^="ufi_"]').length) {
      commentElems = $('div[id^="ufi_"]')
        .children()
        .eq(0)
        .children()
        .eq(4)
        .children()
    } else {
      commentElems = $('#root')
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
          const message = wrapper.eq(1).text() || ''
          if (tag.find('a[href^="/comment/replies"]').length) {
            const href = tag.find('a[href^="/comment/replies"]').attr('href')
            const replyLink = `https://mbasic.facebook.com${href}`
            const reply = await this.getCommentsFromURL(replyLink, {
              goNext: false,
              goPrev: false,
              feedId,
              replyTo: id,
            })
            replies = replies.concat(reply)
          }
          comments.push({
            id,
            name,
            message,
            ...toProfile(link),
            ...removeNullProps({ replyTo, feedId }),
          })
          break
        }
        case 'A': {
          const href = tag.attr('href')
          const pageURL = `https://mbasic.facebook.com${href}`
          switch (i) {
            case 0: {
              pageInfo.hasPreviousPage = true
              pageInfo.prevURL = pageURL
              break
            }
            case commentElems.length - 1: {
              pageInfo.hasNextPage = true
              pageInfo.nextURL = pageURL
              break
            }
            default:
              throw new Error('Unexpected errors')
          }
          break
        }
        case 'INPUT': {
          // REPLY TO COMMENTS
          break
        }
        default:
          throw new Error('Unexpected errors')
      }
    }
    // detect Jump template
    if (!goNext && !goPrev) {
      if (pageInfo.hasNextPage) {
        goNext = true
      }
      if (pageInfo.hasPreviousPage) {
        goPrev = true
      }
    }
    // add pageInfo
    comments = comments.map(comment => ({
      ...comment,
      nextURL: pageInfo.nextURL,
      prevURL: pageInfo.prevURL,
      curURL: pageInfo.curURL,
      goNext,
      goPrev,
    })).concat(replies)
    // jump
    if (goNext && pageInfo.hasNextPage) {
      const nextComments = await this
        .getCommentsFromURL(pageInfo.nextURL, {
          goNext,
          goPrev,
          feedId,
          replyTo,
        })
      return comments
        .concat(nextComments)
    }
    if (goPrev && pageInfo.hasPreviousPage) {
      const prevComments = await this
        .getCommentsFromURL(pageInfo.prevURL, {
          goNext,
          goPrev,
          feedId,
          replyTo,
        })
      return prevComments.concat(comments)
    }
    return comments
  }

  async getComments(postId) {
    const url = `https://mbasic.facebook.com/${postId}`
    const options = {
      goNext: false,
      goPrev: false,
      feedId: postId,
      replyTo: null,
    }
    const comments = await this.getCommentsFromURL(url, options)
    // DETECT LAST COMMENT and REPLY of post
    const commentsByGroup = groupBy(comments, ({ replyTo }) => replyTo)
    for (const replyTo in commentsByGroup) {
      const cmts = commentsByGroup[replyTo]
      const lastComment = cmts[cmts.length - 1]
      lastComment.isLast = true
    }
    return comments
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
      },
    ]).startWith(URL)
    await sleepSync(1000)
    return this.facebookUserAPI.getLatestPostID()
  }
}

module.exports = FacebookGroupAPI
