// Simple test to verify frontend can connect to backend
const axios = require('axios');

async function testConnection() {
  try {
    console.log('Testing backend connection...');
    
    // Test health endpoint
    const healthResponse = await axios.get('http://localhost:5000/api/health');
    console.log('✅ Health check:', healthResponse.data);
    
    // Test login
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@empresa.com',
      password: 'admin123'
    });
    console.log('✅ Login successful:', loginResponse.data.usuario.nombre);
    
    // Test consumibles with token
    const token = loginResponse.data.token;
    const consumiblesResponse = await axios.get('http://localhost:5000/api/consumibles', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Consumibles loaded:', consumiblesResponse.data.consumibles.length, 'items');
    
    console.log('All tests passed! Backend is working correctly.');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testConnection();
