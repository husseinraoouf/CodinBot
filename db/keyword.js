module.exports = ({ Keywords, Users }) => {
    
    let methods = {}

    methods.addrating = async (result, rate) => {
        console.log(result, rate)
        const result = await Keywords.update({keyword: result}, {$set: {rating: rate}});

    }
    return methods;
}
