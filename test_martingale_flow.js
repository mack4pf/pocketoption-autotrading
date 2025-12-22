// test_martingale_flow.js
// Standalone script to test logic

// Mock User Class
class MockUser {
    constructor(id, baseAmount) {
        this._id = id;
        this.email = `user${id}@test.com`;
        this.tradingSettings = {
            defaultAmount: baseAmount,
            maxTradeAmount: 1000,
            martingaleEnabled: true
        };
        this.martingale = {
            currentLevel: 0,
            lossStreak: 0,
            multiplier: 2.0,
            maxSteps: 6
        };
    }

    markModified() { }
    async save() {
        console.log(`[DB] Saved state for ${this._id}: Level ${this.martingale.currentLevel}, Amount Next: (calced separately)`);
    }
}

const MartingaleEngine = require('./src/core/MartingaleEngine');
const engine = new MartingaleEngine();

async function runTest() {
    console.log("🚀 Starting Martingale Simulation\n");

    const user = new MockUser(1, 10.00); // $10 Base Amount

    // Test 1: Initial Amount
    console.log("--- Test 1: Initial State ---");
    let amount = engine.calculateNextAmount(user);
    console.log(`Amount (Level 0): $${amount} (Expected: $10)`);
    if (amount !== 10) throw new Error("Initial amount wrong");

    // Test 2: Loss (Level 0 -> 1)
    console.log("\n--- Test 2: User Loses (Level 0 -> 1) ---");
    await engine.updateState(user, 'loss');
    amount = engine.calculateNextAmount(user);
    console.log(`Amount (Level 1): $${amount} (Expected: $20)`); // 10 * 2^1
    if (amount !== 20) throw new Error("Level 1 amount wrong");

    // Test 3: Loss (Level 1 -> 2)
    console.log("\n--- Test 3: User Loses (Level 1 -> 2) ---");
    await engine.updateState(user, 'loss');
    amount = engine.calculateNextAmount(user);
    console.log(`Amount (Level 2): $${amount} (Expected: $40)`); // 10 * 2^2
    if (amount !== 40) throw new Error("Level 2 amount wrong");

    // Test 4: Loss (Level 2 -> 3)
    console.log("\n--- Test 4: User Loses (Level 2 -> 3) ---");
    await engine.updateState(user, 'loss');
    amount = engine.calculateNextAmount(user);
    console.log(`Amount (Level 3): $${amount} (Expected: $80)`); // 10 * 2^3
    if (amount !== 80) throw new Error("Level 3 amount wrong");

    // Test 5: Win (Reset -> 0)
    console.log("\n--- Test 5: User Wins (Reset) ---");
    await engine.updateState(user, 'win');
    amount = engine.calculateNextAmount(user);
    console.log(`Amount (Level 0): $${amount} (Expected: $10)`);
    if (amount !== 10) throw new Error("Reset amount wrong");

    console.log("\n✅ All Tests Passed!");
}

runTest().catch(console.error);
