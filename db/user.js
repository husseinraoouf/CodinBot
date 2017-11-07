const {
  ObjectID
} = require('mongodb');


module.exports = ({ Users }, { userByID }) => {
    
    let methods = {}
    
    methods.addusert = async (sender_psid, name) => {
      console.log (language, keyword, keywordkind, rate);

      const response = await Users.insert(
          { keyword, language, keywordkind },
          { $set: { rating: rate }, $inc: { numrated: 1 } }
      );

      console.log(response);
  }

    
    return methods;
};
