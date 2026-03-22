const FOLO_SESSION_TOKEN = 'Efjg31ntpGYmReudnRG6Q5pgrbO5P0Et.b2I8QrgJD24eRpFfahCJ6ctyoVRo8071oO8STf%2FxTHc%3D';
const listId = '258516112881818624';

async function test() {
  console.log('Testing GET /lists/:id/entries...');
  let res = await fetch(`https://api.follow.is/lists/${listId}/entries`, {
    headers: { Cookie: `__Secure-better-auth.session_token=${FOLO_SESSION_TOKEN}` }
  });
  console.log('GET status:', res.status);
  
  if (res.ok) {
    const j = await res.json();
    console.log('GET response entries length (data):', j.data?.entries?.length || 0);
  }

  console.log('\nTesting GET /entries?listId=...');
  res = await fetch(`https://api.follow.is/entries?listId=${listId}`, {
    headers: { Cookie: `__Secure-better-auth.session_token=${FOLO_SESSION_TOKEN}` }
  });
  console.log('GET 2 status:', res.status);
  
  if (res.ok) {
    const j = await res.json();
    console.log('GET 2 response entries length (data):', j.data?.entries?.length || 0);
  }

  console.log('\nTesting POST /entries...');
  res = await fetch(`https://api.follow.is/entries`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      Cookie: `__Secure-better-auth.session_token=${FOLO_SESSION_TOKEN}` 
    },
    body: JSON.stringify({ listId })
  });
  console.log('POST status:', res.status);
  
  if (res.ok) {
    const j = await res.json();
    console.log('POST response code:', j.code);
    console.log('POST response entries length (data):', j.data?.entries?.length || 0);
  }
}
test();
