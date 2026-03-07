const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const testUpload = async () => {
  try {
    // First login to get token
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'adminissuhel06'
    });
    
    const token = loginRes.data.token;
    console.log('✅ Login successful');

    // Create a simple text file for testing (this should fail)
    const testFilePath = path.join(__dirname, 'test.txt');
    fs.writeFileSync(testFilePath, 'This is a test file');

    // Try to upload the text file (should fail with image error)
    const formData = new FormData();
    formData.append('name', 'Test Product');
    formData.append('category', 'some-category-id');
    formData.append('mrp', '100');
    formData.append('price', '90');
    formData.append('image', fs.createReadStream(testFilePath));

    try {
      const uploadRes = await axios.post('http://localhost:5000/api/products', formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('Upload success:', uploadRes.data);
    } catch (error) {
      console.log('❌ Upload failed as expected:', error.response?.data || error.message);
    }

    // Clean up
    fs.unlinkSync(testFilePath);
    console.log('✅ Test complete');

  } catch (error) {
    console.error('Test error:', error);
  }
};

testUpload();