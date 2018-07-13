const Q = require('q')

module.exports = {
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
