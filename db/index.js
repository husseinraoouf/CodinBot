const {
  MongoClient
} = require('mongodb');

const buildDataloaders = require('./dataloaders');

const buildUser = require('./user');
const buildKeyword = require('./keyword');

// 1
const { MONGO_URL } = require('../lib/consts');

// 2
module.exports = async() => {
  const db = await MongoClient.connect(MONGO_URL);
  const col = {
    Users: db.collection('Users'),
    Keywords: db.collection('Keywords'),
  };

  const dataloaders = buildDataloaders(col);

  const userDB = buildUser(col, dataloaders);
  const keywordDB = buildKeyword(col, dataloaders);

  return {
    userDB,
    keywordDB,
  }

}
