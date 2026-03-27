import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { authentication } from './src/middlewares/authentication.js';
import authRouter from './src/routes/auth.routes.js';
import clipsRouter from './src/routes/clips.routes.js';
import notFound from './src/middlewares/not-found.js';

const app = express();

app.use(express.json());

app.use(cors());

app.use((req, res, next) => {
    //res.json({ message: "Hola Middleware"});
    //console.log(req.method);
    next();
});

app.get('/', (req, res) => {
    res.json({message: "Bienvenidos a la API REST de Iván"});
});

app.use(bodyParser.json());
app.use('/auth', authRouter);

app.use('/api', authentication, clipsRouter);

app.use(notFound);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));