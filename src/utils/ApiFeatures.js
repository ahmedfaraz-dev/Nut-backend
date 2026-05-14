class ApiFeature {
    constructor( query, queryString ){
        this.query = query;
        this.queryString = queryString;
    }

    search(){
        if(this.queryString.search){
            this.query = this.query.find({
                name: {
                    $regex: this.queryString.search,
                    $options: "i",
                }
            })
        }
        return this;
    };

    paginate(){
        const page = Number(this.queryString.page) || 1;
        const limit = 9;

        const skip = ( page - 1)* limit;

        this.query = this.query.skip( skip ).limit ( limit );

        return this 
    }

    
};

export { ApiFeature };