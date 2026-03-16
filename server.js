const express = require('express');
const http = require('http');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { Server } = require('socket.io');

dotenv.config();

const connectDB = require('./config/db');
connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Trust proxy (important for Vercel / Render)
app.set('trust proxy', 1);

// Session Setup
app.use(session({
    secret: process.env.SESSION_SECRET || "supersecret123",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions',
        ttl: 24 * 60 * 60
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        secure: false,       // IMPORTANT for localhost
        sameSite: 'lax'
    }
}));

// Make socket.io accessible in controllers
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Socket.io Connection
io.on('connection', (socket) => {

    console.log('🔌 User connected');

    socket.on('joinVendorRoom', (vendorId) => {
        socket.join(vendorId);
        console.log(`Vendor joined room: ${vendorId}`);
    });

    socket.on('joinOrderRoom', (orderId) => {
        socket.join(orderId);
        console.log(`Customer joined room: ${orderId}`);
    });

    socket.on('disconnect', () => {
        console.log('❌ User disconnected');
    });

});

// Routes
const indexRoutes = require('./routes/indexRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const customerRoutes = require('./routes/customerRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use('/', indexRoutes);
app.use('/vendor', vendorRoutes);
app.use('/admin', adminRoutes);
app.use('/', customerRoutes);


// Start Server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});