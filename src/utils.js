const Q = require('q')

module.exports = {
  async sleepSync(millisecs){
    const { promise, resolve } = Q.defer()
    setTimeout(resolve, millisecs)
    return promise
  }
}
