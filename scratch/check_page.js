async function test() {
  const res = await fetch('http://localhost:3040/admin/assignments');
  console.log('Status:', res.status);
  const text = await res.text();
  const idx = text.indexOf('id="__NEXT_DATA__"');
  if (idx !== -1) {
    const jsonStr = text.substring(idx, idx + 400);
    console.log('JSON:', jsonStr);
  } else {
    console.log('HTML snippet:', text.substring(0, 400));
  }
}
test().catch(console.error);
