/**
 * Test script to demonstrate the payout system
 * Run with: node test-payout.js
 */

const { settleExpiredBets, getSettlementStats } = require('./utils/betSettlement')
const { triggerSettlement } = require('./utils/scheduler')

async function testPayoutSystem() {
  console.log('🧪 Testing Bet Payout System\n')
  
  try {
    // Get current settlement statistics
    console.log('📊 Current Settlement Statistics:')
    const stats = await getSettlementStats()
    console.log(JSON.stringify(stats, null, 2))
    console.log('\n')
    
    // Trigger manual settlement
    console.log('⚡ Triggering Manual Settlement...')
    const result = await triggerSettlement()
    console.log('Settlement Result:', JSON.stringify(result, null, 2))
    console.log('\n')
    
    // Get updated statistics
    console.log('📊 Updated Settlement Statistics:')
    const updatedStats = await getSettlementStats()
    console.log(JSON.stringify(updatedStats, null, 2))
    
    console.log('\n✅ Payout system test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error(error.stack)
  }
}

// Run the test
testPayoutSystem()
