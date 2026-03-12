const express = require('express');
const http = require('http');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

// Initialize App and Server
const app = express();
const server = http.createServer(app);
const io = new Server(server); // Initialize Socket.io for real-time updates

// Set up View Engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json()); // To parse JSON data
app.use(express.urlencoded({ extended: true })); // To parse form data
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files (CSS, JS, Images)

// Session Setup (For Login states and Customer Carts)
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day cookie
}));

// Pass socket.io to the request object so we can use it inside our routes
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Real-time Socket.io Connection
io.on('connection', (socket) => {
    console.log('A user connected via WebSocket');
    
    // Vendor joins their dashboard room
    socket.on('joinVendorRoom', (vendorId) => {
        socket.join(vendorId);
        console.log(`Vendor joined room: ${vendorId}`);
    });

    // Customer joins their specific order tracking room
    socket.on('joinOrderRoom', (orderId) => {
        socket.join(orderId);
        console.log(`Customer joined tracking room: ${orderId}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// --- REPLACE THE ROUTE PLACEHOLDERS IN server.js WITH THIS ---

// --- UPDATE YOUR ROUTES IN server.js ---
// --- UPDATE ROUTES IN server.js ---
const indexRoutes = require('./routes/indexRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const customerRoutes = require('./routes/customerRoutes');
const adminRoutes = require('./routes/adminRoutes'); // <-- Add this

app.use('/', indexRoutes);
app.use('/vendor', vendorRoutes);
app.use('/admin', adminRoutes); // <-- Add this
app.use('/', customerRoutes); 
// ----------------------------------
app.get("/",(req,res)=>{
    res.render("index");
})
// ---------------------------------------

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running in development mode on http://localhost:${PORT}`);
});