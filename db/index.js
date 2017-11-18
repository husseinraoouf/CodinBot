const {
  MongoClient
} = require('mongodb');

const buildDataloaders = require('./dataloaders');

const buildUser = require('./user');

// 1
const { MONGO_URL } = require('../lib/consts');

// 2
module.exports = async() => {
  const db = await MongoClient.connect(MONGO_URL);
  const col = {
    Users: db.collection('Users'),
  };

  const dataloaders = buildDataloaders(col);

  const userDB = buildUser(col, dataloaders);

  return {
    userDB,
  }

}
