const GraphQLJSON = require('graphql-type-json')

module.exports = {
  JSON: GraphQLJSON,
  Query: {
    comments: () => {
      return {
        added: [],
        changed: [],
        removed: [],
      }
    },
  },
}
