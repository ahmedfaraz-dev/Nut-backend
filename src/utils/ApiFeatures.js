class ApiFeature {
    constructor(query, queryString) {
        this.query = query;
        this.queryString = queryString;
        this.page = Number(queryString.page) || 1;
        this.limit = Number(queryString.limit) || 6;
    }

    search() {
        const search = this.queryString.search?.trim();
        if (search) {
            this.query = this.query.find({
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { discription: { $regex: search, $options: "i" } },
                ],
            });
        }
        return this;
    }

    filterPrice() {
        const { minPrice, maxPrice } = this.queryString;
        if (!minPrice && !maxPrice) return this;

        const price = {};
        if (minPrice !== undefined && minPrice !== "") {
            price.$gte = Number(minPrice);
        }
        if (maxPrice !== undefined && maxPrice !== "") {
            price.$lte = Number(maxPrice);
        }

        if (Object.keys(price).length > 0) {
            this.query = this.query.find({ price });
        }
        return this;
    }

    async filterCategory(Category, categoryName) {
        if (!categoryName || categoryName === "All") return this;

        const escaped = String(categoryName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const categoryDoc = await Category.findOne({
            name: { $regex: new RegExp(`^${escaped}$`, "i") },
        }).select("_id");

        if (categoryDoc) {
            this.query = this.query.find({ category: categoryDoc._id });
        }
        return this;
    }

    async filterDiscount(Deal, userId) {
        const minDiscount = Number(this.queryString.minDiscount);
        if (this.queryString.minDiscount === undefined || this.queryString.minDiscount === "" || Number.isNaN(minDiscount)) {
            return this;
        }

        const deals = await Deal.find({
            discount: { $gte: minDiscount },
            user: userId,
        }).select("_id");

        const dealIds = deals.map((d) => d._id);
        this.query = this.query.find({ activeDeal: { $in: dealIds } });
        return this;
    }

    async countDocuments() {
        const Model = this.query.model;
        return Model.countDocuments(this.query.getQuery());
    }

    paginate() {
        const skip = (this.page - 1) * this.limit;
        this.query = this.query.skip(skip).limit(this.limit);
        return this;
    }
}

export { ApiFeature };
