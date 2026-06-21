// Main application entry point
// Will be expanded in Phase 2

console.log('Constellation AR - Initialization complete');
console.log('Astronomy Engine loaded:', typeof Astronomy !== 'undefined');
console.log('Three.js loaded:', typeof THREE !== 'undefined');

// Test data loading
async function testDataLoading() {
    try {
        const response = await fetch('./data/constellations.lines.json');
        const data = await response.json();
        console.log('✅ Constellation lines data loaded:', Object.keys(data).length, 'constellations');
    } catch (error) {
        console.error('❌ Failed to load data:', error);
    }
}

testDataLoading();
