import jwt from 'jsonwebtoken';
import 'dotenv/config';

const secret_key = process.env.JWT_SECRET_KEY;

//Middleware para verificar el token JWT
export const authentication = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.sendStatus(401);
    }

    const token = authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, secret_key, (err) => {
        if (err) return res.sendStatus(403);
        next();
    });
}