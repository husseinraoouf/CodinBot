module.exports = ({ Keywords, Users }) => {
    
    let methods = {}

    methods.addrating = async (language, keyword, rate) => {
        console.log (language, keyword, rate);

        const response = await Keywords.update(
            { keyword, language, keywordkind },
            { $set: { rating: rate }, $inc: { numrated: 1 } }
        );
    }


    methods.getKeyword = async ({ language, keyword }) => {
        const response = await Keywords.findOne(
            { keyword, language }
        );

        return response;
    }
    return methods;
}
