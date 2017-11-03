module.exports = ({ Keywords, Users }) => {
    
    let methods = {}

    methods.addrating = async (lang, keyword, rate) => {
        console.log (lang, keyword, rate );

        const response = await Keywords.update({ keyword: keyword, language: lang }, {$set: {rating: rate}, $inc: { numrated: 1}});

        console.log(response);
    }
    return methods;
}
