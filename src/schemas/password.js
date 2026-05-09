import * as z from "zod";

export const passwordSchema = z.object({
    oldPassword: z.string().min(8, "Password must be at least eight characters long"),
    newPassword: z.string().min(8, "Password must be at least eight characters long")
})