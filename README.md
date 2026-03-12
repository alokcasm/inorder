# InOrder 🍽️

### Smart QR-Based Restaurant Ordering System

**InOrder** is a QR-based digital ordering system for restaurants. Customers can scan a QR code placed on the table, browse the menu, place orders instantly, and track their order status without waiting for a waiter.

This system helps restaurants improve service speed, reduce human errors, and provide a modern contactless dining experience.

---

## 🚀 Features

* 📱 Scan table QR code to access menu
* 🍔 Digital restaurant menu
* 🛒 Add items to cart
* 📦 Place orders instantly
* 🔔 Live order tracking
* 🧾 Order session management
* 🧑‍🍳 Restaurant dashboard for order management
* ⚡ Lightweight UI (optimized for slow networks like 2G)

---

## 🏗️ Tech Stack

**Frontend**

* HTML
* CSS
* JavaScript
* EJS Templates

**Backend**

* Node.js
* Express.js

**Database**

* MongoDB

**Other Tools**

* Socket.io (for live order updates)
* QR Code generation

---

## 📂 Project Structure

```
InOrder/
│
├── config/
│   └── db.js
│
├── controllers/
│   ├── adminController.js
│   ├── authController.js
│   ├── customerController.js
│   └── vendorController.js
│
├── middleware/
│   └── authMiddleware.js
│
├── models/
│   ├── Item.js
│   ├── Order.js
│   ├── Table.js
│   └── User.js
│
├── public/
│   ├── css/
│   ├── js/
│   └── uploads/
│
├── routes/
│   ├── adminRoutes.js
│   ├── customerRoutes.js
│   ├── indexRoutes.js
│   └── vendorRoutes.js
│
├── views/
│   │
│   ├── admin/
│   │   ├── dashboard.ejs
│   │   └── vendors.ejs
│   │
│   ├── auth/
│   │   ├── login.ejs
│   │   └── register.ejs
│   │
│   ├── customer/
│   │   ├── cart.ejs
│   │   ├── menu.ejs
│   │   ├── occupied.ejs
│   │   ├── receipt.ejs
│   │   └── track.ejs
│   │
│   ├── vendor/
│   │   ├── dashboard.ejs
│   │   ├── menu.ejs
│   │   ├── reports.ejs
│   │   └── settings.ejs
│   │
│   ├── partials/
│   │   ├── alerts.ejs
│   │   ├── footer.ejs
│   │   └── header.ejs
│   │
│   └── index.ejs
│
├── .env
├── package.json
├── package-lock.json
├── README.md
└── server.js
```

---

## ⚙️ Installation

Clone the repository

```
git clone https://github.com/alokcasm/inorder.git
```

Go to project folder

```
cd inorder
```

Install dependencies

```
npm install
```

Create `.env` file

```
PORT=3000
MONGO_URI=your_mongodb_connection
SESSION_SECRET=your_secret_key
```

Run the project

```
npm start
```

Server will run on:

```
http://localhost:3000
```

---

## 📱 How It Works

1. Restaurant registers on the platform.
2. Restaurant adds menu items and number of tables.
3. System generates a **unique QR code for each table**.
4. Customer scans QR code.
5. Menu opens instantly on phone.
6. Customer places order.
7. Restaurant receives order in dashboard.

---

## 🌟 Future Improvements

* Payment integration (UPI / Stripe)
* AI-based food recommendations
* Multi-language support
* Offline-first ordering system
* Analytics dashboard for restaurants

---

## 👨‍💻 Author

Upparwala

GitHub:
https://github.com/alokcasm

---

## 📜 License

This project is licensed under the MIT License.
