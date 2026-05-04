import * as z from "zod";


export const ratingSchema = z.object({
    rating: z.number().min(1,"rating not be negative").max(5, "rating is not grater then 5"),
    title: z.string().max(20, "title will not more then 20 characters"),
    comment: z.string().max(50, "comment will not more then 50 characters")
})