const FacebookAPI = require('./facebookAPI')

class FacebookCommentCreation extends FacebookAPI {
  async post(commentId, message) {
    let replyURL = ''
    const comment = await this.Storage.findOne({ id: commentId })
    if (!comment) throw new Error('Comment is not found')
    const { replyTo, replyLink } = comment
    const latestReply = await this.Storage.findOne({
      replyTo: commentId,
      isLast: true,
    })
    if (!replyTo) {
      replyURL = latestReply ? latestReply.curURL : replyLink
    } else {
      replyURL = latestReply.curURL
    }
    return this.formReader.pipeline([
      {
        willSubmit: (requiredFields, submitFields) => ({
          ...requiredFields,
          ...submitFields,
          comment_text: message,
        }),
      },
    ]).startWith(replyURL)
  }
}

module.exports = FacebookCommentCreation
