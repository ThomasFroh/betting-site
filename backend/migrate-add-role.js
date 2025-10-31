/**
 * Migration script to add role field to existing users
 * Run with: node migrate-add-role.js
 */

const User = require('./models/user')
const sequelize = require('./database')

async function migrateAddRole() {
  try {
    console.log('🔄 Starting migration to add role field...')
    
    // Sync the model to add the role column
    await User.sync({ alter: true })
    console.log('✅ Role field added to user table')
    
    // Update existing users to have 'user' role
    const [updatedCount] = await User.update(
      { role: 'user' },
      { 
        where: { role: null },
        returning: true 
      }
    )
    
    console.log(`✅ Updated ${updatedCount} existing users with 'user' role`)
    
    // Check if any users exist
    const userCount = await User.count()
    console.log(`📊 Total users in database: ${userCount}`)
    
    console.log('✅ Migration completed successfully!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error(error.stack)
  } finally {
    await sequelize.close()
  }
}

migrateAddRole()
