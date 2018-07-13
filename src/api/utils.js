const Q = require('q')
const { groupBy } = require('underscore')

module.exports = {
  addLastFlag(comments) {
    const commentsByGroup = groupBy(comments, ({ replyTo }) => replyTo)
    return Object.keys(commentsByGroup).map((replyTo) => {
      const cmts = commentsByGroup[replyTo]
      const lastComment = cmts[cmts.length - 1]
      lastComment.isLast = true
      return cmts
    }).reduce((r, n) => r.concat(n), [])
  },
  removeNullProps(object) {
    const retVal = {}
    for (const key in object) {
      if (object[key]) retVal[key] = object[key]
    }
    return retVal
  },
  toProfile(link) {
    const profile = {}
    const fId = link.includes('profile.php')
      ? link.split('id=')[1].split('&')[0]
      : ''
    if (fId) profile.fId = fId
    const vanity = !link.includes('profile.php')
      ? link.split('?')[0].split('/')[1]
      : ''
    if (vanity) profile.vanity = vanity
    return profile
  },
  async sleepSync(millisecs) {
    const { promise, resolve } = Q.defer()
    setTimeout(resolve, millisecs)
    return promise
  },
}
