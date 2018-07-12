const GraphQLJSON = require('graphql-type-json')

module.exports = {
  JSON: GraphQLJSON,
  Query: {
    comments: async (_, { input }, { FacebookGroupAPI, Comments }) => {
      const {
        feedId,
        bot,
        type,
        gId = '',
      } = input
      const feed = await Comments.findOne({ feedId })
      const facebookGroupAPI = new FacebookGroupAPI(gId, bot, Comments)
      if (!feed) {
        const comments = await facebookGroupAPI.getComments(feedId)
        await Comments.insertMany(comments)
      }
      switch (type) {
        case 'FULL': {
          return Comments.find({ feedId }).toArray()
        }
        case 'LATEST': {
          return facebookGroupAPI.getMoreComments(feedId)
        }
        default: {
          throw new Error(`Unknown type ${type}`)
        }
      }
    },
  },
}
