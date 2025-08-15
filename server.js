// server.js
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const User = require("./models/User");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Middlewares
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || "teki-secret",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB conectado!"))
    .catch(err => console.error(err));

// Middleware para proteger rotas
function ensureAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ error: "Não autenticado" });
}

// Passport config
passport.serializeUser((user, done) => {
    done(null, user.id);
});
passport.deserializeUser((id, done) => {
    User.findById(id).then(user => done(null, user));
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL}/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
            user = new User({
                googleId: profile.id,
                email: profile.emails[0].value
            });
            await user.save();
        }
        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));

// Rotas de autenticação
app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
    passport.authenticate("google", { failureRedirect: process.env.FRONTEND_URL }),
    (req, res) => {
        res.redirect(`${process.env.FRONTEND_URL}?logged=true`);
    }
);

// Checar se usuário logado
app.get("/me", ensureAuth, (req, res) => {
    res.json({
        loggedIn: true,
        user: req.user,
        firstTime: !req.user.username
    });
});

// Definir username
app.post("/set-username", ensureAuth, async (req, res) => {
    const { username } = req.body;

    if (!username || username.length < 3) {
        return res.status(400).json({ error: "Username inválido" });
    }

    const exists = await User.findOne({ username: username.toLowerCase() });
    if (exists) {
        return res.status(400).json({ error: "Esse username já existe" });
    }

    req.user.username = username.toLowerCase();
    await req.user.save();
    res.json({ success: true, username });
});

// WebSocket - Chat
io.on("connection", socket => {
    console.log("Novo usuário conectado");

    socket.on("sendMessage", data => {
        io.emit("newMessage", data);
    });

    socket.on("disconnect", () => {
        console.log("Usuário desconectado");
    });
});

// Start
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
