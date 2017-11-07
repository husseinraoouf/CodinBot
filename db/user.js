const {
  ObjectID
} = require('mongodb');


module.exports = ({ Users }, { userByID }) => {
    
    let methods = {}
    
    methods.addusert = async (sender_psid, name) => {

      const response = await Users.insert(
          { sender_psid, name },
      );

      console.log(response);
  }

    
    return methods;
};
