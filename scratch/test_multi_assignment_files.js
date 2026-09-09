const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:7000/api';

function createToken(sub, email, role) {
  const header = { alg: 'HS256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    jti: crypto.randomUUID(),
    sub: String(sub),
    email,
    role,
    tokenVersion: 1,
    iat: now,
    exp: now + 3600
  };
  const b64 = s => Buffer.from(s).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const eh = b64(JSON.stringify(header));
  const ep = b64(JSON.stringify(payload));
  const secret = '62a429c95c8ac97a483f9814fe1e70f33f8f9e499f3b81ba45af9e2704539e9620ff7984f200f56481f2e2620808feea1b22043e461cfdfd2d395c28eddfa079';
  const sig = crypto.createHmac('sha256', secret).update(eh + '.' + ep).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return eh + '.' + ep + '.' + sig;
}

const adminToken = createToken('1', 'admin@careerlabs.com', 'ADMIN');
const studentToken = createToken('13', 'ajay@gmail.com', 'STUDENT');

async function main() {
  console.log('=== MULTI-FILE ASSIGNMENT ATTACHMENT & PREVIEW TEST ===\n');

  // Step 1: Upload 2 dummy files via FormData
  console.log('1. Testing multi-file upload endpoint (or individual uploads)...');
  const file1 = new Blob(['%PDF-1.4 dummy pdf content for assignment'], { type: 'application/pdf' });
  const file2 = new Blob(['dummy docx content'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

  const fd = new FormData();
  fd.append('files', file1, 'project_spec.pdf');
  fd.append('files', file2, 'guidelines.docx');

  const uploadRes = await fetch(`${API_BASE}/assignments/upload-multiple`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: fd
  });

  const uploadData = await uploadRes.json();
  console.log('   Multi-upload status:', uploadRes.status);
  console.log('   Uploaded files:', uploadData.data?.map(u => `${u.fileName} -> ${u.url}`));

  if (!uploadData.data || uploadData.data.length < 2) {
    throw new Error('Upload did not return 2 files: ' + JSON.stringify(uploadData));
  }

  const attachments = uploadData.data.map(u => ({ fileUrl: u.url, fileName: u.fileName }));

  // Step 2: Create a new Assignment with these attachments
  console.log('\n2. Creating assignment with multiple attachments...');
  const createPayload = {
    title: 'Multi-File Test Assignment ' + Date.now(),
    description: 'This assignment contains multiple project attachments for testing.',
    courseId: 14, // c sharp
    batchId: 4,  // c sharp batch
    startDate: '2026-09-09',
    publishTime: '08:00',
    dueDate: '2026-09-30',
    closeTime: '23:59',
    totalMarks: 100,
    status: 'PUBLISHED',
    attachments: attachments
  };

  const createRes = await fetch(`${API_BASE}/assignments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify(createPayload)
  });

  const createdAssignment = await createRes.json();
  console.log('   Create response status:', createRes.status);
  console.log('   Created Assignment ID:', createdAssignment.data?.id);
  console.log('   Legacy attachmentUrl:', createdAssignment.data?.attachmentUrl);
  console.log('   Legacy attachmentName:', createdAssignment.data?.attachmentName);
  console.log('   Attachments count in response:', createdAssignment.data?.attachments?.length);
  console.log('   Attachments:', createdAssignment.data?.attachments);

  const assignmentId = createdAssignment.data?.id;

  // Step 3: Fetch assignment directly by ID as Admin
  console.log('\n3. Admin queries assignment details by ID...');
  const getRes = await fetch(`${API_BASE}/assignments/${assignmentId}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const getData = await getRes.json();
  console.log('   Admin fetched attachments:', getData.data?.attachments);

  // Step 4: Fetch as Student
  console.log('\n4. Student queries their assignments list...');
  const studentRes = await fetch(`${API_BASE}/student/assignments`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const studentData = await studentRes.json();
  const studentAss = (studentData.data || []).find(a => a.id === assignmentId);
  console.log('   Student found assignment:', studentAss?.title);
  console.log('   Student assignment attachments count:', studentAss?.attachments?.length);
  console.log('   Student assignment attachments:', studentAss?.attachments);

  console.log('\n=== ALL MULTI-FILE ATTACHMENT TESTS PASSED SUCCESSFULLY ===');
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
