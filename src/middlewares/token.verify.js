import { verifyToken } from "../helpers/token.js"

export async function verifyUser(req, res, next) {
    try {
        // @check if token exists
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) throw ({ message : "Unauthorized" });

        // @verify token
        const decoded = verifyToken(token);
        req.user = decoded;
        
        next();
    } catch (error) {
        return res.status(401).json({ type : "error", message : error?.message, data : null })
    }
}