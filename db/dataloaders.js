const DataLoader = require('dataloader');

// 2
module.exports = ({ Users }) => {

    async function batchByID(collection, keys) {
        return await collection.find({ _id: { $in: keys } }).toArray();
    }

    let methods = {}

    methods.userByID = new DataLoader(
        keys => batchByID(Users, keys),
        { cacheKeyFn: key => key.toString() },
    )


    return methods;
};
