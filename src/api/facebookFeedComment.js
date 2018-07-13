const cheerio = require('cheerio')
const Q = require('q')
const { uniq } = require('underscore')
const FacebookAPI = require('./facebookAPI')
const {
  toProfile,
  removeNullProps,
  addLastFlag,
} = require('./utils')

class FacebookFeedComment extends FacebookAPI {
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
    const {
      feedId,
      replyTo,
      jumpReply,
      type,
    } = options
    const transporter = this.formReader.getTransporter(url)
    const { body } = await transporter.get()
    const $ = cheerio.load(body)
    let commentElems = null
    $('div[id^="composer-"]').remove()
    if ($('div[id^="ufi_"]').length) {
      commentElems = $('div[id^="ufi_"]')
        .children()
        .eq(0)
        .children()
        .eq(3)
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
          let replyLink = null
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
            replyLink = `https://mbasic.facebook.com${href}`
            if (jumpReply) {
              const reply = await this.getCommentsFromURL(replyLink, {
                goNext: false,
                goPrev: false,
                feedId,
                replyTo: id,
                jumpReply,
                type,
              })
              replies = replies.concat(reply)
            }
          }
          comments.push({
            id,
            name,
            message,
            ...toProfile(link),
            ...removeNullProps({ replyTo, feedId, replyLink }),
            createdAt: new Date(),
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
    let shouldGoNext = false
    let shouldGoPrev = false
    switch (type) {
      case 'FULL': {
        shouldGoNext = goNext && pageInfo.hasNextPage
        shouldGoPrev = goPrev && pageInfo.hasPreviousPage
        break
      }
      case 'LATEST': {
        shouldGoNext = pageInfo.hasNextPage
        shouldGoPrev = false
        break
      }
      default: {
        throw new Error('Unknown type')
      }
    }
    if (shouldGoNext) {
      const nextComments = await this
        .getCommentsFromURL(pageInfo.nextURL, {
          goNext,
          goPrev,
          feedId,
          replyTo,
          jumpReply,
          type,
        })
      return comments
        .concat(nextComments)
    }
    if (shouldGoPrev) {
      const prevComments = await this
        .getCommentsFromURL(pageInfo.prevURL, {
          goNext,
          goPrev,
          feedId,
          replyTo,
          jumpReply,
          type,
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
      jumpReply: true,
      type: 'FULL',
    }
    const comments = await this.getCommentsFromURL(url, options)
    return addLastFlag(comments)
  }

  async getNewReplies(feedId) {
    const replies = await this.Storage.find({
      feedId,
      replyTo: { $exists: true },
    }).toArray()
    const replyToIds = uniq(replies.map(r => r.replyTo))
    const mainCommentWithoutReply = await this.Storage.find({
      feedId,
      replyTo: { $exists: false },
      id: { $nin: replyToIds },
    }).toArray()
    return Q.all(
      mainCommentWithoutReply.map(
        ({ replyLink, id }) => this
          .getCommentsFromURL(replyLink, {
            goNext: false,
            goPrev: false,
            feedId,
            replyTo: id,
            jumpReply: false,
            type: 'FULL',
          }),
      ),
    ).then((reps) => {
      reps.forEach((rep) => {
        if (rep.length) {
          rep[rep.length - 1].isLast = true
        }
      })
      return Array(0).concat.apply([], reps)
    })
  }

  async getMoreComments(feedId) {
    // 50%
    if (Date.now() % 2 === 0) {
      const replies = await this.getNewReplies(feedId)
      if (replies.length) {
        this.Storage.insertMany(replies)
      }
      return replies
    }
    const lastComments = await this.Storage.find({ feedId, isLast: true }).toArray()
    const latestComments = await Q.all(lastComments.map(async (lastComment) => {
      const {
        curURL,
        goNext,
        goPrev,
        replyTo,
      } = lastComment
      let pageComments = await this.getCommentsFromURL(curURL, {
        goNext,
        goPrev,
        feedId,
        replyTo,
        jumpReply: false,
        type: 'FULL',
      })
      pageComments = addLastFlag(pageComments)
      const pageCommentIds = pageComments.map(c => c.id)
      const savedComments = await this.Storage.find({
        id: { $in: pageCommentIds },
      }).toArray()
      const savedCommentIds = savedComments.map(c => c.id)
      const newComments = pageComments.filter(c => !savedCommentIds.includes(c.id))
      await this.Storage.remove({ id: { $in: pageCommentIds } })
      await this.Storage.insertMany(pageComments)
      return newComments
    }))
    return Array(0).concat.apply([], latestComments)
  }
}

module.exports = FacebookFeedComment
