# Admin User Seeding Guide

## ✅ Admin Credentials in `.env.local`

Your `.env.local` file already contains admin credentials:

```env
ADMIN_EMAIL="rahulraj21480@gmail.com"
ADMIN_PASSWORD="Admin@123456"
ADMIN_NAME="Rahul Raj Modi"
ADMIN_MOBILE="+919973162148"
```

## 🌱 How to Seed Admin User

### Step 1: Run the Seed Script

```bash
npm run seed:admin
```

This will:
- ✅ Connect to MongoDB
- ✅ Check if admin already exists
- ✅ Hash the password securely with bcrypt
- ✅ Create the admin user with role `admin`
- ✅ Automatically set `currentRole` to `admin`

### Step 2: Output

You should see:

```
✅ Connected to MongoDB
✅ Admin user created successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Admin Account Created:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email:   rahulraj21480@gmail.com
Name:    Rahul Raj Modi
Mobile:  +919973162148
Role:    Admin
Password: Admin@123456
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔐 You can now login with these credentials!
```

## 🔐 Login to Admin Dashboard

1. Go to `http://localhost:3000/login`
2. Enter credentials:
   - **Email:** rahulraj21480@gmail.com
   - **Password:** Admin@123456
3. You'll be redirected to `/admin` dashboard
4. Now you can:
   - Add categories
   - Add groceries
   - Manage delivery partners
   - View orders
   - And more!

## 🌾 Other Seed Scripts Available

### Seed Categories
Go to `http://localhost:3000/api/admin/seed-categories` in your browser (requires admin login)

Or call the endpoint:
```bash
curl -X POST http://localhost:3000/api/admin/seed-categories \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## ⚠️ Important Notes

- **Password Hashing:** Passwords are hashed with bcrypt (salt rounds: 10)
- **Duplicate Check:** If admin already exists, it won't create duplicate
- **Role Assignment:** Admin automatically gets `admin` role and `currentRole: "admin"`
- **Database:** Uses MongoDB URI from `.env.local`

## 🔄 If Admin Already Exists

If you run the script twice, it will skip creation:

```
⚠️  Admin user already exists: rahulraj21480@gmail.com
Skipping creation...
```

To reset, delete the admin user from MongoDB and run the script again.

## 🚀 What's Next?

After seeding admin:

1. **Seed Categories** → Click the categories button in admin dashboard
2. **Add Groceries** → Go to "Add Groceries" page
3. **Add Banners** → Customize home page banners
4. **Configure Settings** → Set up COD, delivery fees, etc.
5. **Invite Delivery Partners** → Add delivery boys

Happy Coding! 🎉
