module.exports = ({ Keywords, Users }) => {
    
    let methods = {}

    methods.addrating = async (language, keyword, rate) => {
        console.log (language, keyword, rate);

        const response = await Keywords.update(
            { keyword, language },
            { $set: { rating: rate }, $inc: { numrated: 1} }
        );

        console.log(response);
    }
    return methods;
}
