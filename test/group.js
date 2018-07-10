const fs = require('fs')
const path = require('path')
const { expect } = require('chai')
const { MongoClient } = require('mongodb')
const { FacebookGroupAPI, FacebookUserAPI } = require('../')
const { MONGO_URL, DB } = JSON.parse(process.env.SETTINGS)

describe('FacebookAPI', async () => {
  let facebookGroupAPI = null 
  let facebookUserAPI = null
  let client = null
  before(async() => {
    client = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true })
    const db = client.db(DB)
    const Bots = db.collection('bots')
    const Groups = db.collection('groups')
    const bot = await Bots.findOne()
    const group = await Groups.findOne({ id: bot.groups[0] })
    facebookGroupAPI = new FacebookGroupAPI(group.gId, bot)
    facebookUserAPI = new FacebookUserAPI(bot)
  })
  //it('get all comments of a single post', async () => {
    //await facebookGroupAPI.getComments('941270282746165')
  //})
  //it('post message to group', async () => {
    //const postId = await facebookGroupAPI.postMessage('Say hello')
    //expect(/\d+/.test(postId)).to.be.true
  //})
  //it('post image to group', async () => {
    //const imgPath = path.join(__dirname, 'img.jpg')
    //const postId = await facebookGroupAPI.post({
      //message: 'PEW PEW',
      //images: [
        //fs.createReadStream(imgPath),
      //]
    //})
    //expect(/\d+/.test(postId)).to.be.true
  //})
  after(() => {
    client.close()
  })
})

