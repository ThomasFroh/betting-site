# Admin Authentication System

## Overview

The admin panel is now protected by role-based authentication. Only users with the `admin` role can access the admin panel and perform administrative functions.

## Features Implemented

### 1. User Role System
- Added `role` field to user model with values: `'user'` (default) or `'admin'`
- Updated login system to include role in JWT tokens
- Role information is stored in user session

### 2. Admin Authentication Middleware
- `requireAdmin` - Protects admin-only endpoints
- `requireAuth` - General authentication middleware
- JWT token validation with role checking

### 3. Protected Endpoints
All admin endpoints now require admin authentication:
- `GET /api/bets/admin/pending` - Get all pending bets
- `PUT /api/bets/settle/:betId` - Settle individual bet
- `PUT /api/bets/settle-event/:eventId` - Settle all bets for an event

### 4. Frontend Protection
- Admin panel tab only visible to admin users
- Admin panel component requires authentication
- API calls include JWT tokens for authentication

## Setup Instructions

### 1. Run Database Migration
```bash
cd backend
node migrate-add-role.js
```

### 2. Create Admin User
```bash
cd backend
node create-admin.js
```

This creates an admin user with:
- Username: `admin`
- Password: `admin123`
- Role: `admin`
- Balance: $10,000

### 3. Start the Application
```bash
# Backend
cd backend
npm run dev

# Frontend
cd frontend
npm run dev
```

## Usage

### Login as Admin
1. Go to the login form
2. Enter username: `admin`
3. Enter password: `admin123`
4. Click "Login"

### Access Admin Panel
1. After logging in as admin, you'll see the "Admin Panel" tab
2. Click "Admin Panel" to access administrative functions
3. Regular users won't see this tab

### Admin Functions
- **View Pending Bets**: See all pending bets across all users
- **Bulk Settlement**: Settle all bets for an entire event
- **Individual Settlement**: Settle specific bets one by one
- **Event Management**: Choose event results (Home Wins/Away Wins)

## Security Features

### 1. JWT Token Authentication
- All admin API calls require valid JWT tokens
- Tokens include user role information
- Tokens expire after 1 hour

### 2. Role-Based Access Control
- Only users with `admin` role can access admin functions
- Regular users cannot see admin panel
- API endpoints reject non-admin requests

### 3. Token Validation
- Tokens are validated on every admin request
- Expired tokens are rejected
- Invalid tokens are rejected

## API Authentication

### Headers Required
All admin API calls must include:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Example API Call
```bash
curl -X GET http://localhost:3001/api/bets/admin/pending \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## User Roles

### Regular User (`role: 'user'`)
- Can place bets
- Can view their betting history
- Can cancel pending bets
- Cannot access admin panel
- Cannot settle bets

### Admin User (`role: 'admin'`)
- All regular user permissions
- Can access admin panel
- Can view all pending bets
- Can settle individual bets
- Can settle all bets for an event
- Can view settlement statistics

## Database Schema

### User Model Updates
```javascript
{
  id: String (Primary Key),
  username: String,
  passwordHash: String,
  balance: Decimal(10,2),
  role: ENUM('user', 'admin'), // NEW FIELD
  createdAt: Date,
  updatedAt: Date
}
```

## Error Handling

### Authentication Errors
- `401 Unauthorized`: No token provided
- `401 Unauthorized`: Invalid token
- `401 Unauthorized`: Token expired
- `403 Forbidden`: Admin privileges required

### Frontend Error Messages
- "Authentication required" - No valid token
- "Access denied. Admin privileges required." - Non-admin user
- "Access denied. Token expired." - Expired token

## Testing

### Test Admin Access
1. Create admin user: `node create-admin.js`
2. Login with admin credentials
3. Verify admin panel is visible
4. Test admin functions

### Test Regular User Access
1. Register a new user (defaults to 'user' role)
2. Login with regular user credentials
3. Verify admin panel is NOT visible
4. Verify admin API calls are rejected

### Test API Authentication
```bash
# This should work (with valid admin token)
curl -X GET http://localhost:3001/api/bets/admin/pending \
  -H "Authorization: Bearer ADMIN_TOKEN"

# This should fail (no token)
curl -X GET http://localhost:3001/api/bets/admin/pending

# This should fail (regular user token)
curl -X GET http://localhost:3001/api/bets/admin/pending \
  -H "Authorization: Bearer USER_TOKEN"
```

## Troubleshooting

### Common Issues

1. **Admin Panel Not Visible**
   - Check if user role is 'admin'
   - Verify user is logged in
   - Check browser console for errors

2. **API Calls Failing**
   - Verify JWT token is included in headers
   - Check if token is expired
   - Ensure user has admin role

3. **Database Migration Issues**
   - Run migration script: `node migrate-add-role.js`
   - Check database connection
   - Verify user model is synced

4. **Token Issues**
   - Check if token is valid
   - Verify token includes role information
   - Try logging out and back in

### Debug Commands

```javascript
// Check user roles in database
const users = await User.findAll({
  attributes: ['id', 'username', 'role']
})
console.log(users)

// Verify JWT token
const jwt = require('jsonwebtoken')
const decoded = jwt.verify(token, SECRET)
console.log(decoded)
```

## Security Recommendations

1. **Change Default Admin Password**
   - Change admin password after first login
   - Use strong passwords
   - Consider password rotation

2. **Token Security**
   - Use HTTPS in production
   - Implement token refresh
   - Consider shorter token expiration

3. **Access Logging**
   - Log admin actions
   - Monitor failed authentication attempts
   - Track sensitive operations

4. **Role Management**
   - Implement role hierarchy
   - Add role assignment interface
   - Consider temporary admin access

## Future Enhancements

1. **Role Hierarchy**
   - Super admin role
   - Moderator role
   - Read-only admin role

2. **Advanced Authentication**
   - Two-factor authentication
   - Single sign-on (SSO)
   - OAuth integration

3. **Audit Trail**
   - Log all admin actions
   - Track user role changes
   - Generate audit reports

4. **Permission System**
   - Granular permissions
   - Feature-based access control
   - Dynamic role assignment

The admin authentication system is now fully implemented and secure!
