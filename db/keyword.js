module.exports = ({ Keywords, Users }) => {
    
    let methods = {}

    methods.addrating = async (result, rate) => {
        const x = result.split("+");
        console.log(x[0], x[1], rate)
        const response = await Keywords.update({ keyword: x[1], language: x[0] }, {$set: {rating: rate}});

    }
    return methods;
}
