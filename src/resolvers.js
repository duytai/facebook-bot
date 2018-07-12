const GraphQLJSON = require('graphql-type-json')

module.exports = {
  JSON: GraphQLJSON,
  Query: {
    comments: async (_, { feedId, gId, bot }, { FacebookGroupAPI, Comments }) => {
      let initialized = []
      let added = []
      const changed = []
      const removed = []
      const feed = await Comments.findOne({ feedId })
      const facebookGroupAPI = new FacebookGroupAPI(gId, bot)
      if (!feed) {
        initialized = await facebookGroupAPI.getComments(feedId)
        await Comments.insertMany(initialized)
      } else {
        initialized = await Comments.find({ feedId }).toArray()
        added = await facebookGroupAPI.getMoreComments(feedId, Comments)
      }
      return {
        initialized,
        added,
        changed,
        removed,
      }
    },
  },
}
