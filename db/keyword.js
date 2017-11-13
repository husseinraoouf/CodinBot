module.exports = ({ Keywords, Users }) => {
    
    let methods = {}

    methods.addrating = async (language, keyword, rate) => {
        console.log (language, keyword, rate);

        const response = await Keywords.update(
            { keyword, language },
            { $set: { rating: rate }, $inc: { numrated: 1 } }
        );
    }


    methods.getKeyword = async ({ language, keyword, keywordkind }) => {
        const response = await Keywords.findOne(
            { keyword, language, keywordkind }
        );

        return response;
    }
    return methods;
}
