const {
  ObjectID
} = require('mongodb');


module.exports = ({ Users }, { userByID }) => {
    
    let methods = {}
    
    methods.deleteUser = async ({id}, jwt) => {

    }

    
    return methods;
};
