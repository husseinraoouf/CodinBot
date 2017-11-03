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


    methods.getKeyword = async ({ language, keyword, keywordkind }) => {
        console.log (language, keyword, keywordkind);

        const response = await Keywords.findOne(
            { keyword, language, keywordkind }
        );

        console.log(response);

        return response;
    }
    return methods;
}
