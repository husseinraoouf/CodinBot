const { request, GraphQLClient } = require('graphql-request');

const client = new GraphQLClient("https://docs-as-a-service.herokuapp.com/graphql", { headers: {} });


const query = {



  all: `
    query getKeyword($keyword: String, $keywordkind: String, $language: String) {
      keyword(keyword: $keyword, keywordkind: $keywordkind, language: $language) {
        id
        keywordkind
        status
        link
        ...on HTMLTag {
          difintion
          examples{
            title
            code
            note
            link
          }
          attributes{
            name
            status
            details
            note
          }
        }
        ...on HTMLAttribute{
          tags
        }
      }
    }`,

  listTagsFromAttribute: `
    query getKeyword($keyword: String, $keywordkind: String, $language: String) {
      keyword(keyword: $keyword, keywordkind: $keywordkind, language: $language) {
        ...on HTMLAttribute{
          tags
        }
      }
    }`,

  querySyntax: `
    query getKeyword($keyword: String, $keywordkind: String, $language: String) {
      keyword(keyword: $keyword, keywordkind: $keywordkind, language: $language) {
        link
        ...on HTMLTag {
          difintion
        }
        ...on HTMLAttribute{
          tags
        }
      }
    }`,

  listTagsFromAttribute: `
    query getKeyword($keyword: String, $keywordkind: String, $language: String) {
      keyword(keyword: $keyword, keywordkind: $keywordkind, language: $language) {
        ...on HTMLTag {
          attributes{
            name
            status
            details
            note
          }
        }
      }
    }`,

  listExampleFromTag: `
    query getKeyword($keyword: String, $keywordkind: String, $language: String) {
      keyword(keyword: $keyword, keywordkind: $keywordkind, language: $language) {
        ...on HTMLTag {
          examples{
            title
            code
            note
            link
          }
        }
      }
    }`,

};

let methods = {}

methods.getKeyword = async (vars, querykind) => {
    const response = await client.request(query[querykind], vars)
    console.log(response);
    return response.keyword;
}


module.exports = methods