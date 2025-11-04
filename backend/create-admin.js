/**
 * Script to create an admin user
 * Run with: node create-admin.js
 */

const bcrypt = require('bcryptjs')
const User = require('./models/user')
const sequelize = require('./database')

async function createAdmin() {
  try {
    console.log('🔧 Creating admin user...')
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ where: { role: 'admin' } })
    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin.username)
      return
    }
    
    // Create admin user
    const adminId = 'admin-' + Date.now()
    const saltRounds = 10
    const passwordHash = await bcrypt.hash('admin123', saltRounds)
    
    const admin = await User.create({
      id: adminId,
      username: 'admin',
      passwordHash: passwordHash,
      role: 'admin',
      balance: 10000.00 // Give admin a higher balance
    })
    
    console.log('✅ Admin user created successfully!')
    console.log('Username: admin')
    console.log('Password: admin123')
    console.log('Role: admin')
    console.log('Balance: $10,000')
    console.log('\n⚠️  Please change the password after first login!')
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message)
  } finally {
    await sequelize.close()
  }
}

createAdmin()
