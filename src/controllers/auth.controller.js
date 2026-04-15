import { generateToken } from "../utils/token-generator.js";
import bcrypt from 'bcrypt';


const default_user = {
    id: 1,
    username: "admin26"
    //password: "LuFa_2026"
}

export const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'username y password son requeridos' });
    }

    if (!process.env.ADMIN_PASS_HASH) {
        return res.status(500).json({ error: 'Falta ADMIN_PASS_HASH en variables de entorno' });
    }

    //Se debe verificar las credenciales del usuario, se utilizo HASH con bcrypt 

    const isMatch = await bcrypt.compare(password, process.env.ADMIN_PASS_HASH);

    //Ejemplo de usuario autenticado
    const user = { id: 1, username };

    if (username === default_user.username && isMatch) {
        const token = generateToken(user);
        return res.json({ token });
    } else {
        return res.sendStatus(401);
    }
}