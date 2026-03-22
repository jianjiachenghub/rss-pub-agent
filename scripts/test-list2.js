const FOLO_SESSION_TOKEN = 'Efjg31ntpGYmReudnRG6Q5pgrbO5P0Et.b2I8QrgJD24eRpFfahCJ6ctyoVRo8071oO8STf%2FxTHc%3D';

async function test() {
  console.log('Testing GET /lists (to see if auth works)...');
  const res = await fetch(`https://api.follow.is/lists`, {
    headers: { Cookie: `__Secure-better-auth.session_token=${FOLO_SESSION_TOKEN}` }
  });
  console.log('GET /lists status:', res.status);
  if (res.ok) {
    const listJson = await res.json();
    console.log('Lists available:', listJson.data?.lists?.map(l => ({ id: l.id, title: l.title })));
  } else {
    console.log('Error text:', await res.text());
  }

  // Also try POST /entries with the body JSON including other fields just in case?
  console.log('\nTesting POST /entries without listId (to see what happens)...');
  const res2 = await fetch(`https://api.follow.is/entries`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      Cookie: `__Secure-better-auth.session_token=${FOLO_SESSION_TOKEN}` 
    },
    body: JSON.stringify({ })
  });
  console.log('POST status:', res2.status);
  console.log('POST error:', await res2.text());
}
test();
