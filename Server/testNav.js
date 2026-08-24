import http from 'http';

// Now uses node name instead of nodeId
const start = encodeURIComponent('Main Entrance');
const destination = encodeURIComponent('ICU');

http.get(`http://localhost:8000/api/navigation/shortest-path?start=${start}&destination=${destination}`, (res) => {
  let rawData = '';
  res.on('data', (chunk) => { rawData += chunk; });
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', JSON.parse(rawData));
  });
}).on('error', (e) => {
  console.error(`Got error: ${e.message}`);
});
