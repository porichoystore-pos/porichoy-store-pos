export const testConnection = async () => {
  const results = [];
  
  // Test 1: Check if we can reach the backend
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('http://192.168.1.105:5000/api/auth/test', {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    results.push({ test: 'Backend Connection', status: '✅ Success', data: await response.text() });
  } catch (error) {
    results.push({ test: 'Backend Connection', status: '❌ Failed', error: error.message });
  }
  
  // Test 2: Check CORS
  try {
    const response = await fetch('http://192.168.1.105:5000/api/auth/test', {
      mode: 'cors',
      credentials: 'include'
    });
    results.push({ test: 'CORS', status: '✅ Working' });
  } catch (error) {
    results.push({ test: 'CORS', status: '❌ Failed', error: error.message });
  }
  
  console.table(results);
  return results;
};