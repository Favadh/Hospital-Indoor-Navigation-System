import http from 'http';

http.get('http://localhost:8000/api/navigation/shortest-path?start=main_entrance&destination=icu', (res) => {
  let rawData = '';
  res.on('data', (chunk) => { rawData += chunk; });
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', JSON.parse(rawData));
  });
}).on('error', (e) => {
  console.error(`Got error: ${e.message}`);
});
