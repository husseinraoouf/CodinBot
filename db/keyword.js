module.exports = ({ Keywords, Users }) => {
    
    let methods = {}

    methods.addrating = async (lang, keyword, rate) => {
        const response = await Keywords.update({ keyword: keyword, language: lang }, {$set: {rating: rate}});

    }
    return methods;
}
