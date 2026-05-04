import * as z from "zod";


const userRegisterSchema = z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters long"),
    email: z.email("Please provide a valid email address").trim(),
    password: z.string().min(8, "Password must be at least eight characters long")
})

export { userRegisterSchema }