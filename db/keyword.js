module.exports = ({ Keywords, Users }) => {
    
    let methods = {}

    methods.addrating = async (language, keyword, keywordkind, rate) => {
        console.log (language, keyword, keywordkind, rate);

        const response = await Keywords.update(
            { keyword, language, keywordkind },
            { $set: { rating: rate }, $inc: { numrated: 1 } }
        );

        console.log(response);
    }
    return methods;
}
