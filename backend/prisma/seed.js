require('dotenv').config({ path: '../.env' })
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()
const ROUNDS = 10

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}
function daysFromNow(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

async function main() {
  console.log('Seeding database...')

  // ── Users ────────────────────────────────────────────────────────────────────
  const superadminHash = await bcrypt.hash('Admin@123456', ROUNDS)
  const superadmin = await prisma.user.upsert({
    where: { email: 'superadmin@careerlabs.in' },
    update: {},
    create: {
      name: 'Super Admin', email: 'superadmin@careerlabs.in',
      passwordHash: superadminHash, role: 'SUPERADMIN',
      isActive: true, isEmailVerified: true,
      adminProfile: { create: { department: 'Management' } }
    }
  })
  console.log('Created SUPERADMIN:', superadmin.email)

  const adminHash = await bcrypt.hash('Admin@123456', ROUNDS)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@careerlabs.in' },
    update: {},
    create: {
      name: 'Admin User', email: 'admin@careerlabs.in',
      passwordHash: adminHash, role: 'ADMIN',
      isActive: true, isEmailVerified: true,
      adminProfile: { create: { department: 'Operations' } }
    }
  })
  console.log('Created ADMIN:', admin.email)

  const trainerHash = await bcrypt.hash('Trainer@123', ROUNDS)
  const trainer = await prisma.user.upsert({
    where: { email: 'trainer@careerlabs.in' },
    update: {},
    create: {
      name: 'Senthil Kumar', email: 'trainer@careerlabs.in',
      passwordHash: trainerHash, role: 'TRAINER',
      isActive: true, isEmailVerified: true,
      adminProfile: { create: { department: 'Training' } }
    }
  })
  console.log('Created TRAINER:', trainer.email)

  const studentHash = await bcrypt.hash('Student@123', ROUNDS)
  const studentUsers = [
    { name: 'Ramesh Kumar',  email: 'ramesh@student.com', enrollmentNo: 'CL-2024-001', phone: '9876543210' },
    { name: 'Priya Sharma',  email: 'priya@student.com',  enrollmentNo: 'CL-2024-002', phone: '9876543211' },
    { name: 'Arjun Patel',   email: 'arjun@student.com',  enrollmentNo: 'CL-2024-003', phone: '9876543212' },
  ]
  const createdStudents = []
  for (const s of studentUsers) {
    const u = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        name: s.name, email: s.email, phone: s.phone,
        passwordHash: studentHash, role: 'STUDENT',
        isActive: true, isEmailVerified: true,
        studentProfile: {
          create: { enrollmentNo: s.enrollmentNo, qualification: 'B.Tech', placementStatus: 'SEEKING' }
        }
      },
      include: { studentProfile: true }
    })
    createdStudents.push(u)
    console.log('Created STUDENT:', u.email)
  }
  const rameshUser    = createdStudents[0]
  const rameshProfile = rameshUser.studentProfile

  // ── Courses ──────────────────────────────────────────────────────────────────
  const python = await prisma.course.upsert({
    where: { slug: 'python-full-stack' },
    update: {},
    create: {
      title: 'Python Full Stack Development',
      slug: 'python-full-stack',
      description: 'Master Python, Django, REST APIs, and full-stack web development. Build real-world projects and gain industry-ready skills.',
      duration: '3 months',
      level: 'INTERMEDIATE',
      isActive: true
    }
  })

  const digital = await prisma.course.upsert({
    where: { slug: 'digital-marketing' },
    update: {},
    create: {
      title: 'Digital Marketing Mastery',
      slug: 'digital-marketing',
      description: 'Learn SEO, SEM, social media marketing, content strategy and analytics. Become a certified digital marketer.',
      duration: '2 months',
      level: 'BEGINNER',
      isActive: true
    }
  })

  const java = await prisma.course.upsert({
    where: { slug: 'java-development' },
    update: {},
    create: {
      title: 'Java Full Stack Development',
      slug: 'java-development',
      description: 'Comprehensive Java training covering Core Java, Spring Boot, Hibernate, Microservices and cloud deployment.',
      duration: '4 months',
      level: 'INTERMEDIATE',
      isActive: true
    }
  })
  console.log('Created courses')

  // ── Syllabus for Python ───────────────────────────────────────────────────────
  const syllabusModulesData = [
    {
      title: 'Python Fundamentals', order: 1,
      topics: ['Variables & Data Types', 'Control Flow & Loops', 'Functions & Scope', 'Object-Oriented Programming', 'File Handling & I/O', 'Error Handling & Exceptions']
    },
    {
      title: 'Data Structures & Algorithms', order: 2,
      topics: ['Lists, Tuples & Sets', 'Dictionaries & HashMaps', 'Sorting & Searching Algorithms', 'Recursion & Dynamic Programming', 'Time & Space Complexity']
    },
    {
      title: 'Django Framework', order: 3,
      topics: ['Django Setup & Project Structure', 'Models & ORM', 'Views & URL Routing', 'Templates & Static Files', 'Authentication & Authorization', 'Admin Interface']
    },
    {
      title: 'REST APIs & Databases', order: 4,
      topics: ['REST API Design Principles', 'Django REST Framework', 'PostgreSQL & MySQL Integration', 'API Authentication (JWT)', 'Testing APIs with Postman']
    },
    {
      title: 'Deployment & DevOps', order: 5,
      topics: ['Git & GitHub Workflow', 'Linux Basics & SSH', 'Nginx & Gunicorn Setup', 'Docker Fundamentals']
    }
  ]

  const createdModules = []
  for (const mod of syllabusModulesData) {
    const m = await prisma.syllabusModule.create({
      data: {
        courseId: python.id,
        title: mod.title,
        order: mod.order
      }
    })
    const topics = []
    for (let i = 0; i < mod.topics.length; i++) {
      const t = await prisma.syllabusTopic.create({
        data: { moduleId: m.id, title: mod.topics[i], order: i + 1 }
      })
      topics.push(t)
    }
    createdModules.push({ ...m, topics })
  }
  console.log('Created syllabus modules')

  // ── Batches ───────────────────────────────────────────────────────────────────
  const batch12 = await prisma.batch.create({
    data: {
      name: 'Python Batch 12',
      courseId: python.id,
      trainerId: trainer.id,
      startDate: new Date('2024-03-01'),
      endDate: new Date('2024-06-30'),
      timing: 'Mon-Fri 6:00PM-8:00PM',
      mode: 'ONLINE',
      maxStudents: 30,
      isActive: true
    }
  })

  const batch11 = await prisma.batch.create({
    data: {
      name: 'Python Batch 11',
      courseId: python.id,
      trainerId: trainer.id,
      startDate: new Date('2023-11-01'),
      endDate: new Date('2024-02-28'),
      timing: 'Mon-Fri 6:00PM-8:00PM',
      mode: 'HYBRID',
      maxStudents: 30,
      isActive: false
    }
  })
  console.log('Created batches')

  // ── Daily Classes (30 for batch12) ────────────────────────────────────────────
  const classTitles = [
    'Python Setup & Variables', 'Data Types & Operators', 'Control Flow — if/else/match',
    'Loops — for/while/comprehensions', 'Functions & Default Args', 'OOP Part 1 — Classes & Objects',
    'OOP Part 2 — Inheritance & Polymorphism', 'File Handling & JSON', 'Error Handling & Custom Exceptions',
    'Modules & Packages', 'Lists, Tuples & Sets Deep Dive', 'Dictionaries & Counter',
    'Sorting Algorithms', 'Recursion & Problem Solving', 'Complexity & Big-O',
    'Django Intro & Project Setup', 'Django Models & Migrations', 'Django Views & URL Routing',
    'Django Templates & Static Files', 'Django Admin & Auth', 'REST API Design',
    'Django REST Framework Setup', 'Serializers & ViewSets', 'JWT Authentication',
    'PostgreSQL Integration', 'Testing APIs with Postman', 'Git & GitHub Workflow',
    'Linux & SSH Basics', 'Nginx & Gunicorn Setup', 'Docker Fundamentals'
  ]

  const allTopicsFlat = createdModules.flatMap(m => m.topics)
  const createdClasses = []
  const startDate = new Date('2024-03-01')
  let dayOffset = 0
  for (let i = 0; i < 30; i++) {
    // Skip weekends
    const classDate = new Date(startDate)
    classDate.setDate(startDate.getDate() + dayOffset)
    while (classDate.getDay() === 0 || classDate.getDay() === 6) {
      dayOffset++
      classDate.setDate(startDate.getDate() + dayOffset)
    }
    dayOffset++

    const isToday  = i === 28
    const isFuture = i >= 29

    let status = 'COMPLETED'
    let useDate = classDate
    if (isToday) {
      status = 'SCHEDULED'
      useDate = new Date()
      useDate.setHours(18, 0, 0, 0)
    } else if (isFuture) {
      status = 'SCHEDULED'
      useDate = daysFromNow(i - 28)
      useDate.setHours(18, 0, 0, 0)
    }

    const topicToLink = allTopicsFlat[i] ? allTopicsFlat[i].id : undefined

    const cls = await prisma.dailyClass.create({
      data: {
        batchId: batch12.id,
        date: useDate,
        title: `Day ${i + 1} — ${classTitles[i] || 'Advanced Topics'}`,
        notes: i < 28 ? `Class notes for Day ${i + 1}. Topics covered in detail.` : null,
        recordingUrl: i < 28 ? `https://www.youtube.com/watch?v=placeholder${i + 1}` : null,
        meetLink: 'https://meet.google.com/abc-defg-hij',
        status,
        ...(topicToLink ? { topics: { connect: [{ id: topicToLink }] } } : {})
      }
    })
    createdClasses.push(cls)
  }
  console.log('Created 30 daily classes')

  // ── Enroll Ramesh into Python Batch 12 ───────────────────────────────────────
  await prisma.batchEnrollment.upsert({
    where: { batchId_studentId: { batchId: batch12.id, studentId: rameshProfile.id } },
    update: {},
    create: { batchId: batch12.id, studentId: rameshProfile.id }
  })
  console.log('Enrolled Ramesh in Python Batch 12')

  // ── Attendance (28 completed classes) ────────────────────────────────────────
  // 24 PRESENT, 2 ABSENT, 2 LATE
  const attendanceStatuses = [
    'PRESENT','PRESENT','PRESENT','PRESENT','PRESENT','PRESENT','PRESENT','PRESENT',
    'ABSENT', 'PRESENT','PRESENT','PRESENT','PRESENT','PRESENT','PRESENT','PRESENT',
    'LATE',  'PRESENT','PRESENT','ABSENT', 'PRESENT','PRESENT','PRESENT','LATE',
    'PRESENT','PRESENT','PRESENT','PRESENT'
  ]
  for (let i = 0; i < 28; i++) {
    await prisma.attendance.upsert({
      where: { studentId_classId: { studentId: rameshProfile.id, classId: createdClasses[i].id } },
      update: {},
      create: {
        studentId: rameshProfile.id,
        classId: createdClasses[i].id,
        status: attendanceStatuses[i],
        markedAt: createdClasses[i].date
      }
    })
  }
  console.log('Created attendance records')

  // ── Topic Completions (first 16 topics) ───────────────────────────────────────
  const completedTopics = allTopicsFlat.slice(0, 16)
  for (const topic of completedTopics) {
    await prisma.topicCompletion.upsert({
      where: { topicId_studentId: { topicId: topic.id, studentId: rameshProfile.id } },
      update: {},
      create: { topicId: topic.id, studentId: rameshProfile.id }
    })
  }
  console.log('Created topic completions')

  // ── Course Materials ──────────────────────────────────────────────────────────
  const materialsData = [
    { title: 'Python Cheat Sheet', type: 'PDF', fileUrl: 'https://example.com/files/python-cheatsheet.pdf', fileSize: '1.2 MB' },
    { title: 'Django Quick Reference', type: 'CHEATSHEET', fileUrl: 'https://example.com/files/django-reference.pdf', fileSize: '856 KB' },
    { title: 'DSA Interview Guide', type: 'PDF', fileUrl: 'https://example.com/files/dsa-guide.pdf', fileSize: '3.4 MB' },
    { title: 'Python OOP Notes', type: 'SLIDE', fileUrl: 'https://example.com/files/oop-slides.pdf', fileSize: '2.1 MB' },
    { title: 'Git & GitHub Basics', type: 'PDF', fileUrl: 'https://example.com/files/git-basics.pdf', fileSize: '980 KB' },
    { title: 'SQL Fundamentals', type: 'EBOOK', fileUrl: 'https://example.com/files/sql-ebook.pdf', fileSize: '5.7 MB' },
    { title: 'REST API Design Guide', type: 'PDF', fileUrl: 'https://example.com/files/rest-api-guide.pdf', fileSize: '1.8 MB' },
    { title: 'Deployment Checklist', type: 'CHEATSHEET', fileUrl: 'https://example.com/files/deploy-checklist.pdf', fileSize: '420 KB' },
  ]
  for (const m of materialsData) {
    await prisma.courseMaterial.create({
      data: { courseId: python.id, batchId: batch12.id, ...m }
    })
  }
  console.log('Created course materials')

  // ── Recorded Sessions ─────────────────────────────────────────────────────────
  const sessionsData = [
    { title: 'Day 1 - Python Setup & Environment', duration: '1:45:22', order: 1, gradient: 'from-purple-600 to-violet-700', classDate: createdClasses[0].date, views: 142 },
    { title: 'Day 2 - Variables & Data Types', duration: '1:52:10', order: 2, gradient: 'from-indigo-600 to-blue-700', classDate: createdClasses[1].date, views: 138 },
    { title: 'Day 5 - Functions Deep Dive', duration: '2:05:33', order: 3, gradient: 'from-violet-600 to-purple-700', classDate: createdClasses[4].date, views: 121 },
    { title: 'Day 8 - OOP Part 1', duration: '1:58:45', order: 4, gradient: 'from-fuchsia-600 to-violet-700', classDate: createdClasses[7].date, views: 115 },
    { title: 'Day 10 - OOP Part 2 & Inheritance', duration: '2:10:08', order: 5, gradient: 'from-purple-700 to-indigo-700', classDate: createdClasses[9].date, views: 108 },
    { title: 'Day 15 - Django Introduction', duration: '1:48:20', order: 6, gradient: 'from-blue-600 to-indigo-700', classDate: createdClasses[15].date, views: 97 },
    { title: 'Day 20 - REST APIs with DRF', duration: '2:15:40', order: 7, gradient: 'from-violet-500 to-purple-600', classDate: createdClasses[19].date, views: 89 },
    { title: 'Day 25 - Database Integration', duration: '1:55:12', order: 8, gradient: 'from-indigo-500 to-violet-600', classDate: createdClasses[24].date, views: 76 },
  ]
  for (const s of sessionsData) {
    await prisma.recordedSession.create({
      data: {
        courseId: python.id,
        batchId: batch12.id,
        videoUrl: `https://www.youtube.com/watch?v=placeholder${s.order}`,
        thumbnail: null,
        ...s
      }
    })
  }
  console.log('Created recorded sessions')

  // ── Assignments ───────────────────────────────────────────────────────────────
  const asgn1 = await prisma.assignment.create({
    data: {
      batchId: batch12.id,
      title: 'Python Basics Exercise',
      description: 'Complete the Python fundamentals exercises covering variables, loops, functions, and file handling. Submit a .py file with all solutions.',
      dueDate: daysAgo(3),
      maxMarks: 100,
      createdAt: daysAgo(10)
    }
  })
  await prisma.assignmentSubmission.create({
    data: {
      assignmentId: asgn1.id,
      studentId: rameshProfile.id,
      fileUrl: 'https://example.com/submissions/ramesh-basics.py',
      notes: 'Completed all exercises. Used list comprehensions for the sorting task.',
      grade: 87,
      feedback: 'Excellent work! Good use of list comprehensions. Minor improvement: add docstrings to your functions.',
      status: 'GRADED',
      submittedAt: daysAgo(4),
      gradedAt: daysAgo(2)
    }
  })

  const asgn2 = await prisma.assignment.create({
    data: {
      batchId: batch12.id,
      title: 'OOP Assignment',
      description: 'Design a library management system using OOP principles. Implement at least 4 classes with proper inheritance.',
      dueDate: daysAgo(5),
      maxMarks: 100,
      createdAt: daysAgo(12)
    }
  })
  await prisma.assignmentSubmission.create({
    data: {
      assignmentId: asgn2.id,
      studentId: rameshProfile.id,
      fileUrl: 'https://example.com/submissions/ramesh-oop.py',
      notes: 'Implemented LibrarySystem, Book, Member, and Transaction classes.',
      status: 'SUBMITTED',
      submittedAt: daysAgo(6)
    }
  })

  const asgn3 = await prisma.assignment.create({
    data: {
      batchId: batch12.id,
      title: 'Django Blog Project',
      description: 'Build a full-featured blog application using Django with user authentication, CRUD operations, and a clean UI using Bootstrap.',
      dueDate: daysFromNow(2),
      maxMarks: 100,
      createdAt: daysAgo(7)
    }
  })

  const asgn4 = await prisma.assignment.create({
    data: {
      batchId: batch12.id,
      title: 'REST API Project',
      description: 'Build a complete REST API for an e-commerce product catalog using Django REST Framework with JWT authentication and Swagger documentation.',
      dueDate: daysFromNow(7),
      maxMarks: 100,
      createdAt: daysAgo(3)
    }
  })
  console.log('Created assignments')

  // ── Quizzes ───────────────────────────────────────────────────────────────────
  const pythonFundQs = [
    {
      text: 'What is the output of print(type([]))?',
      options: [
        { text: "<class 'list'>", isCorrect: true },
        { text: "<class 'array'>", isCorrect: false },
        { text: "<class 'tuple'>", isCorrect: false },
        { text: "None", isCorrect: false }
      ],
      explanation: "[] creates a list object. type([]) returns <class 'list'>."
    },
    {
      text: 'Which keyword is used to define a function in Python?',
      options: [
        { text: 'func', isCorrect: false },
        { text: 'define', isCorrect: false },
        { text: 'def', isCorrect: true },
        { text: 'function', isCorrect: false }
      ],
      explanation: "Python uses the 'def' keyword to define functions."
    },
    {
      text: 'What does the len() function return for an empty list?',
      options: [
        { text: 'null', isCorrect: false },
        { text: '0', isCorrect: true },
        { text: '-1', isCorrect: false },
        { text: 'None', isCorrect: false }
      ],
      explanation: 'len([]) returns 0 because the list has no elements.'
    },
    {
      text: 'Which of the following is immutable in Python?',
      options: [
        { text: 'List', isCorrect: false },
        { text: 'Dictionary', isCorrect: false },
        { text: 'Set', isCorrect: false },
        { text: 'Tuple', isCorrect: true }
      ],
      explanation: 'Tuples are immutable — you cannot change their elements after creation.'
    },
    {
      text: 'What is the correct way to create a virtual environment in Python?',
      options: [
        { text: 'python -m venv myenv', isCorrect: true },
        { text: 'python create venv myenv', isCorrect: false },
        { text: 'virtualenv create myenv', isCorrect: false },
        { text: 'pip install venv myenv', isCorrect: false }
      ],
      explanation: 'python -m venv myenv creates a virtual environment using the built-in venv module.'
    }
  ]

  const dsaQs = [
    {
      text: 'What is the time complexity of binary search?',
      options: [
        { text: 'O(n)', isCorrect: false },
        { text: 'O(log n)', isCorrect: true },
        { text: 'O(n log n)', isCorrect: false },
        { text: 'O(1)', isCorrect: false }
      ],
      explanation: 'Binary search halves the search space each step, giving O(log n) complexity.'
    },
    {
      text: 'Which data structure uses LIFO (Last In First Out) principle?',
      options: [
        { text: 'Queue', isCorrect: false },
        { text: 'Stack', isCorrect: true },
        { text: 'Array', isCorrect: false },
        { text: 'Linked List', isCorrect: false }
      ],
      explanation: 'Stack follows LIFO — the last element pushed is the first to be popped.'
    },
    {
      text: 'What is the worst case time complexity of QuickSort?',
      options: [
        { text: 'O(n log n)', isCorrect: false },
        { text: 'O(n)', isCorrect: false },
        { text: 'O(n²)', isCorrect: true },
        { text: 'O(log n)', isCorrect: false }
      ],
      explanation: 'QuickSort worst case O(n²) occurs when the pivot is always the smallest or largest element.'
    },
    {
      text: 'In Python, what is the time complexity of appending to a list?',
      options: [
        { text: 'O(n)', isCorrect: false },
        { text: 'O(log n)', isCorrect: false },
        { text: 'O(1) amortized', isCorrect: true },
        { text: 'O(n²)', isCorrect: false }
      ],
      explanation: 'Python lists use dynamic arrays. Append is O(1) amortized due to occasional resizing.'
    }
  ]

  const djangoQs = [
    {
      text: 'What command creates a new Django project?',
      options: [
        { text: 'django-admin startproject myproject', isCorrect: true },
        { text: 'django new myproject', isCorrect: false },
        { text: 'python manage.py createproject myproject', isCorrect: false },
        { text: 'pip install myproject', isCorrect: false }
      ],
      explanation: 'django-admin startproject creates the project scaffolding.'
    },
    {
      text: 'What does the __str__ method in a Django model do?',
      options: [
        { text: 'Defines the primary key', isCorrect: false },
        { text: 'Returns a string representation of the object', isCorrect: true },
        { text: 'Creates a database index', isCorrect: false },
        { text: 'Sets model permissions', isCorrect: false }
      ],
      explanation: '__str__ returns the string representation shown in admin and shell.'
    },
    {
      text: 'Which file in Django maps URLs to views?',
      options: [
        { text: 'views.py', isCorrect: false },
        { text: 'models.py', isCorrect: false },
        { text: 'urls.py', isCorrect: true },
        { text: 'settings.py', isCorrect: false }
      ],
      explanation: 'urls.py contains URL patterns that map to view functions or classes.'
    }
  ]

  const restQs = [
    {
      text: 'What HTTP method is used to create a new resource in REST?',
      options: [
        { text: 'GET', isCorrect: false },
        { text: 'POST', isCorrect: true },
        { text: 'PUT', isCorrect: false },
        { text: 'DELETE', isCorrect: false }
      ],
      explanation: 'POST is used to create a new resource on the server.'
    },
    {
      text: 'What status code represents a successful resource creation?',
      options: [
        { text: '200 OK', isCorrect: false },
        { text: '201 Created', isCorrect: true },
        { text: '204 No Content', isCorrect: false },
        { text: '302 Found', isCorrect: false }
      ],
      explanation: '201 Created is the correct response when a new resource is successfully created.'
    },
    {
      text: 'In Django REST Framework, what does a Serializer do?',
      options: [
        { text: 'Handles URL routing', isCorrect: false },
        { text: 'Converts complex data to JSON/XML and validates input', isCorrect: true },
        { text: 'Manages database connections', isCorrect: false },
        { text: 'Handles user authentication', isCorrect: false }
      ],
      explanation: 'Serializers convert model instances to Python dicts/JSON and validate incoming data.'
    }
  ]

  const today = new Date()
  const quiz1 = await prisma.quiz.create({
    data: {
      title: 'Python Fundamentals Quiz',
      description: 'Test your knowledge of Python basics — data types, functions, and OOP.',
      courseId: python.id,
      batchId: batch12.id,
      duration: 30,
      totalMarks: 5,
      passMark: 3,
      isPublished: true,
      dueDate: daysAgo(10),
      questions: {
        create: pythonFundQs.map((q, i) => ({
          text: q.text, type: 'MCQ', options: q.options,
          marks: 1, order: i + 1, explanation: q.explanation
        }))
      }
    }
  })

  const quiz2 = await prisma.quiz.create({
    data: {
      title: 'Data Structures Quiz',
      description: 'Test your understanding of data structures and algorithmic complexity.',
      courseId: python.id,
      batchId: batch12.id,
      duration: 40,
      totalMarks: 4,
      passMark: 2,
      isPublished: true,
      dueDate: daysAgo(7),
      questions: {
        create: dsaQs.map((q, i) => ({
          text: q.text, type: 'MCQ', options: q.options,
          marks: 1, order: i + 1, explanation: q.explanation
        }))
      }
    }
  })

  const quiz3 = await prisma.quiz.create({
    data: {
      title: 'Django Basics Quiz',
      description: 'Check your Django fundamentals — models, views, and templates.',
      courseId: python.id,
      batchId: batch12.id,
      duration: 35,
      totalMarks: 3,
      passMark: 2,
      isPublished: true,
      dueDate: daysAgo(3),
      questions: {
        create: djangoQs.map((q, i) => ({
          text: q.text, type: 'MCQ', options: q.options,
          marks: 1, order: i + 1, explanation: q.explanation
        }))
      }
    }
  })

  const quiz4 = await prisma.quiz.create({
    data: {
      title: 'REST API Quiz',
      description: 'Test your understanding of RESTful API design and Django REST Framework.',
      courseId: python.id,
      batchId: batch12.id,
      duration: 30,
      totalMarks: 3,
      passMark: 2,
      isPublished: true,
      dueDate: daysFromNow(3),
      questions: {
        create: restQs.map((q, i) => ({
          text: q.text, type: 'MCQ', options: q.options,
          marks: 1, order: i + 1, explanation: q.explanation
        }))
      }
    }
  })

  // Quiz Attempts for Ramesh (first 3 quizzes)
  await prisma.quizAttempt.create({
    data: {
      quizId: quiz1.id,
      studentId: rameshProfile.id,
      answers: { q1: 0, q2: 2, q3: 1, q4: 3, q5: 0 },
      score: 4,
      totalMarks: 5,
      passed: true,
      timeTaken: 1420,
      startedAt: daysAgo(9),
      submittedAt: daysAgo(9)
    }
  })
  await prisma.quizAttempt.create({
    data: {
      quizId: quiz2.id,
      studentId: rameshProfile.id,
      answers: { q1: 1, q2: 1, q3: 2, q4: 2 },
      score: 3,
      totalMarks: 4,
      passed: true,
      timeTaken: 1850,
      startedAt: daysAgo(6),
      submittedAt: daysAgo(6)
    }
  })
  await prisma.quizAttempt.create({
    data: {
      quizId: quiz3.id,
      studentId: rameshProfile.id,
      answers: { q1: 0, q2: 1, q3: 2 },
      score: 3,
      totalMarks: 3,
      passed: true,
      timeTaken: 1240,
      startedAt: daysAgo(2),
      submittedAt: daysAgo(2)
    }
  })
  console.log('Created quizzes and attempts')

  // ── Mock Interviews ────────────────────────────────────────────────────────────
  await prisma.mockInterview.create({
    data: {
      studentId: rameshProfile.id,
      scheduledAt: daysAgo(15),
      interviewerName: 'Senthil Kumar',
      feedback: 'Good fundamentals, needs work on DSA problem solving and system design basics.',
      strengths: ['Python OOP', 'Communication skills', 'Django basics'],
      improvements: ['DSA problem solving', 'System design basics'],
      rating: 4,
      status: 'COMPLETED'
    }
  })
  await prisma.mockInterview.create({
    data: {
      studentId: rameshProfile.id,
      scheduledAt: daysAgo(7),
      interviewerName: 'Senthil Kumar',
      feedback: 'Improved significantly on DSA. Django REST skills are solid.',
      strengths: ['Problem solving', 'Django REST Framework', 'Code structure'],
      improvements: ['Database query optimization', 'System design patterns'],
      rating: 4,
      status: 'COMPLETED'
    }
  })
  await prisma.mockInterview.create({
    data: {
      studentId: rameshProfile.id,
      scheduledAt: daysFromNow(3),
      interviewerName: 'Senthil Kumar',
      meetLink: 'https://meet.google.com/abc-defg-hij',
      strengths: [],
      improvements: [],
      status: 'SCHEDULED'
    }
  })
  console.log('Created mock interviews')

  // ── Placement Updates ─────────────────────────────────────────────────────────
  await prisma.placementUpdate.create({
    data: {
      studentId: rameshProfile.id,
      title: 'Resume shortlisted by TCS',
      body: 'Your profile has been shortlisted for the TCS NQT campus drive. Aptitude test scheduled next week.',
      type: 'SHORTLIST',
      createdAt: daysAgo(10)
    }
  })
  await prisma.placementUpdate.create({
    data: {
      studentId: rameshProfile.id,
      title: 'Interview scheduled with Infosys',
      body: 'Infosys technical interview scheduled. Prepare Python, SQL, and basic system design topics.',
      type: 'INTERVIEW',
      createdAt: daysAgo(7)
    }
  })
  await prisma.placementUpdate.create({
    data: {
      studentId: rameshProfile.id,
      title: 'Complete LinkedIn profile optimization',
      body: 'Your LinkedIn profile needs updating. Add your Python and Django projects with GitHub links for better visibility.',
      type: 'ACTION',
      createdAt: daysAgo(5)
    }
  })
  await prisma.placementUpdate.create({
    data: {
      studentId: rameshProfile.id,
      title: 'Mock interview feedback available',
      body: 'Your second mock interview feedback from Senthil Kumar is now available. Overall rating: 4/5.',
      type: 'FEEDBACK',
      createdAt: daysAgo(2)
    }
  })
  console.log('Created placement updates')

  // ── Announcements ─────────────────────────────────────────────────────────────
  await prisma.announcement.create({
    data: {
      batchId: batch12.id,
      title: 'Holiday on Friday',
      body: 'There will be no class on Friday due to Eid. Class will resume on Monday.',
      isPinned: false,
      createdAt: daysAgo(3)
    }
  })
  await prisma.announcement.create({
    data: {
      batchId: batch12.id,
      title: 'Guest lecture on DevOps this Saturday',
      body: 'We have a special guest lecture by industry expert Karthik Raj on DevOps practices and CI/CD pipelines. Attendance is mandatory.',
      isPinned: true,
      createdAt: daysAgo(2)
    }
  })
  await prisma.announcement.create({
    data: {
      batchId: batch12.id,
      title: 'Assignment deadline extended by 2 days',
      body: 'The Django Blog Project assignment deadline has been extended by 2 days due to the holiday. New deadline is updated in the assignments section.',
      isPinned: false,
      createdAt: daysAgo(1)
    }
  })
  console.log('Created announcements')

  // ── Notifications for Ramesh ──────────────────────────────────────────────────
  const notifs = [
    { title: 'Assignment Graded', body: 'Your Python Basics Exercise has been graded. You scored 87/100!', type: 'SUCCESS', createdAt: daysAgo(2) },
    { title: 'New Quiz Available', body: 'REST API Quiz is now available. Due in 3 days. 3 questions, 30 minutes.', type: 'INFO', createdAt: daysAgo(1) },
    { title: 'Mock Interview Scheduled', body: 'Your 3rd mock interview is scheduled for 3 days from now with Senthil Kumar.', type: 'SUCCESS', createdAt: daysAgo(1) },
    { title: 'Placement Update', body: 'Mock interview feedback is now available in your placement dashboard.', type: 'INFO', createdAt: daysAgo(2) },
    { title: 'Class Rescheduled', body: "Tomorrow's class (Day 30) has been rescheduled to Friday due to technical issues.", type: 'WARNING', createdAt: daysAgo(1) },
    { title: 'New Material Uploaded', body: 'REST API Design Guide PDF has been uploaded to course materials.', type: 'INFO', createdAt: daysAgo(3) },
    { title: 'Assignment Due Soon', body: 'Django Blog Project is due in 2 days. Make sure to submit on time.', type: 'WARNING', createdAt: daysAgo(1) },
    { title: 'Batch Announcement', body: 'Guest lecture on DevOps is scheduled this Saturday. Attendance is mandatory.', type: 'INFO', createdAt: daysAgo(2) },
  ]
  for (const n of notifs) {
    await prisma.notification.create({
      data: { userId: rameshUser.id, ...n, isRead: false }
    })
  }
  console.log('Created notifications')

  // ── Extra Quizzes (only if quiz count < 5) ────────────────────────────────────
  const quizCount = await prisma.quiz.count()
  if (quizCount < 5) {
    // 1. Aptitude Test
    await prisma.quiz.create({
      data: {
        title: 'Aptitude Test — Quantitative Reasoning',
        description: 'Test your aptitude skills in number series, percentages, averages, ratios and time & work.',
        quizType: 'APTITUDE',
        category: 'Aptitude',
        duration: 45,
        totalMarks: 10,
        passMark: 7,
        isPublished: true,
        dueDate: daysFromNow(14),
        questions: {
          create: [
            {
              text: 'If 40% of a number is 120, what is the number?',
              type: 'MCQ', topic: 'Percentages', difficulty: 'MEDIUM', marks: 1, order: 1,
              options: [{ text: '200', isCorrect: false }, { text: '250', isCorrect: false }, { text: '300', isCorrect: true }, { text: '350', isCorrect: false }],
              explanation: '40% of x = 120 → x = 120 / 0.4 = 300'
            },
            {
              text: 'A shopkeeper marks his goods 20% above cost price and gives a 10% discount. What is his profit percentage?',
              type: 'MCQ', topic: 'Percentages', difficulty: 'HARD', marks: 1, order: 2,
              options: [{ text: '6%', isCorrect: false }, { text: '8%', isCorrect: true }, { text: '10%', isCorrect: false }, { text: '12%', isCorrect: false }],
              explanation: 'SP = 0.9 × 1.2 × CP = 1.08 × CP. Profit = 8%'
            },
            {
              text: 'The average of 5 numbers is 20. If one number is excluded, the average becomes 18. What is the excluded number?',
              type: 'MCQ', topic: 'Averages', difficulty: 'MEDIUM', marks: 1, order: 3,
              options: [{ text: '24', isCorrect: false }, { text: '26', isCorrect: false }, { text: '28', isCorrect: true }, { text: '30', isCorrect: false }],
              explanation: 'Sum of 5 = 100. Sum of 4 = 72. Excluded = 100 - 72 = 28'
            },
            {
              text: 'The average of first 50 natural numbers is?',
              type: 'MCQ', topic: 'Averages', difficulty: 'MEDIUM', marks: 1, order: 4,
              options: [{ text: '24.5', isCorrect: false }, { text: '25', isCorrect: false }, { text: '25.5', isCorrect: true }, { text: '26', isCorrect: false }],
              explanation: 'Sum = n(n+1)/2 = 1275. Average = 1275/50 = 25.5'
            },
            {
              text: 'Find the next number in the series: 2, 6, 12, 20, 30, __',
              type: 'MCQ', topic: 'Number Series', difficulty: 'MEDIUM', marks: 1, order: 5,
              options: [{ text: '38', isCorrect: false }, { text: '40', isCorrect: false }, { text: '42', isCorrect: true }, { text: '44', isCorrect: false }],
              explanation: 'Pattern: n×(n+1). Series is 1×2, 2×3, 3×4, 4×5, 5×6, 6×7 = 42'
            },
            {
              text: 'What comes next: 1, 1, 2, 3, 5, 8, 13, __',
              type: 'MCQ', topic: 'Number Series', difficulty: 'EASY', marks: 1, order: 6,
              options: [{ text: '18', isCorrect: false }, { text: '20', isCorrect: false }, { text: '21', isCorrect: true }, { text: '24', isCorrect: false }],
              explanation: 'Fibonacci series: each number is sum of two preceding. 8+13=21'
            },
            {
              text: 'The ratio of boys to girls in a class is 3:2. If there are 30 students, how many girls are there?',
              type: 'MCQ', topic: 'Ratios', difficulty: 'EASY', marks: 1, order: 7,
              options: [{ text: '10', isCorrect: false }, { text: '12', isCorrect: true }, { text: '14', isCorrect: false }, { text: '18', isCorrect: false }],
              explanation: 'Girls = (2/5) × 30 = 12'
            },
            {
              text: 'Two numbers are in the ratio 4:5. Their LCM is 120. What is the larger number?',
              type: 'MCQ', topic: 'Ratios', difficulty: 'HARD', marks: 1, order: 8,
              options: [{ text: '20', isCorrect: false }, { text: '24', isCorrect: false }, { text: '25', isCorrect: false }, { text: '30', isCorrect: true }],
              explanation: 'Let numbers be 4k and 5k. LCM = 20k = 120. k=6. Larger = 5×6 = 30'
            },
            {
              text: 'A can do a work in 10 days, B in 15 days. How many days will they take together?',
              type: 'MCQ', topic: 'Time & Work', difficulty: 'MEDIUM', marks: 1, order: 9,
              options: [{ text: '4', isCorrect: false }, { text: '5', isCorrect: false }, { text: '6', isCorrect: true }, { text: '8', isCorrect: false }],
              explanation: 'Combined rate = 1/10 + 1/15 = 3/30 + 2/30 = 5/30 = 1/6. Time = 6 days'
            },
            {
              text: 'A can do a piece of work in 12 days. With B\'s help it takes 4 days. How long does B take alone?',
              type: 'MCQ', topic: 'Time & Work', difficulty: 'HARD', marks: 1, order: 10,
              options: [{ text: '4 days', isCorrect: false }, { text: '6 days', isCorrect: true }, { text: '8 days', isCorrect: false }, { text: '10 days', isCorrect: false }],
              explanation: 'B\'s rate = 1/4 - 1/12 = 3/12 - 1/12 = 2/12 = 1/6. B takes 6 days alone'
            }
          ]
        }
      }
    })
    console.log('Created Aptitude Quiz')

    // 2. Python Interview Prep Quiz
    await prisma.quiz.create({
      data: {
        title: 'Python Interview Prep',
        description: 'Real interview-level Python questions covering OOP, data structures, decorators, error handling and generators.',
        quizType: 'INTERVIEW_PREP',
        category: 'Python',
        duration: 30,
        totalMarks: 10,
        passMark: 7,
        isPublished: true,
        dueDate: daysFromNow(21),
        questions: {
          create: [
            {
              text: 'What is the difference between @staticmethod and @classmethod in Python?',
              type: 'MCQ', topic: 'OOP', difficulty: 'HARD', marks: 1, order: 1,
              options: [
                { text: 'Both are the same', isCorrect: false },
                { text: '@staticmethod takes no implicit argument; @classmethod takes cls as first argument', isCorrect: true },
                { text: '@staticmethod takes self; @classmethod takes cls', isCorrect: false },
                { text: '@classmethod is used only for abstract methods', isCorrect: false }
              ],
              explanation: '@staticmethod has no access to class or instance; @classmethod receives the class (cls) as first argument.'
            },
            {
              text: 'Which Python built-in data structure is best for O(1) average lookup time?',
              type: 'MCQ', topic: 'Data Structures', difficulty: 'MEDIUM', marks: 1, order: 2,
              options: [
                { text: 'List', isCorrect: false },
                { text: 'Tuple', isCorrect: false },
                { text: 'Dictionary', isCorrect: true },
                { text: 'Set (for membership tests)', isCorrect: false }
              ],
              explanation: 'Both dict and set provide O(1) average lookup; dict is typically meant for key-value retrieval.'
            },
            {
              text: 'What does the __slots__ attribute do in a Python class?',
              type: 'MCQ', topic: 'OOP', difficulty: 'HARD', marks: 1, order: 3,
              options: [
                { text: 'Enables multiple inheritance', isCorrect: false },
                { text: 'Restricts instance attributes and reduces memory usage', isCorrect: true },
                { text: 'Makes all attributes private', isCorrect: false },
                { text: 'Allows dynamic attribute addition', isCorrect: false }
              ],
              explanation: '__slots__ restricts the attributes an instance can have, saving memory by avoiding __dict__ per instance.'
            },
            {
              text: 'What is a decorator in Python?',
              type: 'MCQ', topic: 'Decorators', difficulty: 'MEDIUM', marks: 1, order: 4,
              options: [
                { text: 'A design pattern for UI components', isCorrect: false },
                { text: 'A function that takes a function and returns a modified function', isCorrect: true },
                { text: 'A class that inherits from another class', isCorrect: false },
                { text: 'A built-in Python module', isCorrect: false }
              ],
              explanation: 'Decorators wrap a function to modify its behavior without changing its source code.'
            },
            {
              text: 'Which statement correctly handles a specific exception AND has a finally block?',
              type: 'MCQ', topic: 'Error Handling', difficulty: 'MEDIUM', marks: 1, order: 5,
              options: [
                { text: 'try...except ValueError...else', isCorrect: false },
                { text: 'try...except ValueError...finally', isCorrect: true },
                { text: 'try...catch ValueError...finally', isCorrect: false },
                { text: 'try...except...end', isCorrect: false }
              ],
              explanation: 'Python uses try/except/finally. The finally block always executes regardless of exceptions.'
            },
            {
              text: 'What is the output of: list(range(1, 10, 3))?',
              type: 'MCQ', topic: 'Data Structures', difficulty: 'EASY', marks: 1, order: 6,
              options: [
                { text: '[1, 4, 7]', isCorrect: true },
                { text: '[1, 3, 6, 9]', isCorrect: false },
                { text: '[1, 4, 7, 10]', isCorrect: false },
                { text: '[3, 6, 9]', isCorrect: false }
              ],
              explanation: 'range(1, 10, 3) generates 1, 4, 7. The step is 3, stops before 10.'
            },
            {
              text: 'What is a generator in Python and how is it different from a list?',
              type: 'MCQ', topic: 'Generators', difficulty: 'HARD', marks: 1, order: 7,
              options: [
                { text: 'A generator stores all values in memory upfront like a list', isCorrect: false },
                { text: 'A generator uses yield to produce values lazily, one at a time', isCorrect: true },
                { text: 'Generators and lists are identical in memory usage', isCorrect: false },
                { text: 'Generators cannot be iterated more than once like lists', isCorrect: false }
              ],
              explanation: 'Generators are lazy iterators using yield; they produce values on demand and use much less memory than lists.'
            },
            {
              text: 'What does the *args syntax in a function definition do?',
              type: 'MCQ', topic: 'OOP', difficulty: 'MEDIUM', marks: 1, order: 8,
              options: [
                { text: 'Passes a dictionary of keyword arguments', isCorrect: false },
                { text: 'Collects extra positional arguments into a tuple', isCorrect: true },
                { text: 'Makes all arguments optional', isCorrect: false },
                { text: 'Unpacks a list when calling the function', isCorrect: false }
              ],
              explanation: '*args collects any number of positional arguments into a tuple inside the function.'
            },
            {
              text: 'Which method is called when an instance is created from a class?',
              type: 'MCQ', topic: 'OOP', difficulty: 'EASY', marks: 1, order: 9,
              options: [
                { text: '__create__', isCorrect: false },
                { text: '__new__', isCorrect: false },
                { text: '__init__', isCorrect: true },
                { text: '__start__', isCorrect: false }
              ],
              explanation: '__init__ is the constructor called to initialize the new instance after __new__ creates it.'
            },
            {
              text: 'What is the purpose of the "with" statement in Python?',
              type: 'MCQ', topic: 'Error Handling', difficulty: 'MEDIUM', marks: 1, order: 10,
              options: [
                { text: 'It is used to create loops', isCorrect: false },
                { text: 'It ensures proper resource cleanup using context managers', isCorrect: true },
                { text: 'It replaces try/except for exception handling', isCorrect: false },
                { text: 'It imports a module locally', isCorrect: false }
              ],
              explanation: 'The "with" statement is a context manager that ensures __enter__ and __exit__ are called, ideal for file handling.'
            }
          ]
        }
      }
    })
    console.log('Created Python Interview Prep Quiz')

    // 3. DSA Mock Test
    await prisma.quiz.create({
      data: {
        title: 'DSA Mock Test',
        description: 'Comprehensive Data Structures & Algorithms mock test covering arrays, linked lists, sorting, binary search and recursion.',
        quizType: 'MCQ',
        category: 'DSA',
        isFeatured: true,
        duration: 60,
        totalMarks: 10,
        passMark: 7,
        isPublished: true,
        dueDate: daysFromNow(30),
        questions: {
          create: [
            {
              text: 'Given this Python code, what does it output?\n\narr = [3, 1, 4, 1, 5, 9, 2, 6]\narr.sort()\nprint(arr[len(arr)//2])',
              type: 'MCQ', topic: 'Arrays', difficulty: 'MEDIUM', marks: 1, order: 1,
              codeSnippet: 'arr = [3, 1, 4, 1, 5, 9, 2, 6]\narr.sort()\nprint(arr[len(arr)//2])',
              options: [
                { text: '4', isCorrect: false },
                { text: '5', isCorrect: true },
                { text: '3', isCorrect: false },
                { text: '6', isCorrect: false }
              ],
              explanation: 'After sort: [1,1,2,3,4,5,6,9]. len=8, 8//2=4. arr[4]=5'
            },
            {
              text: 'What is the time complexity of inserting at the beginning of an array (not linked list)?',
              type: 'MCQ', topic: 'Arrays', difficulty: 'MEDIUM', marks: 1, order: 2,
              options: [
                { text: 'O(1)', isCorrect: false },
                { text: 'O(log n)', isCorrect: false },
                { text: 'O(n)', isCorrect: true },
                { text: 'O(n²)', isCorrect: false }
              ],
              explanation: 'Inserting at the beginning requires shifting all existing elements one position right — O(n).'
            },
            {
              text: 'In a singly linked list, what is the time complexity to find the middle element?',
              type: 'MCQ', topic: 'Linked Lists', difficulty: 'MEDIUM', marks: 1, order: 3,
              options: [
                { text: 'O(1)', isCorrect: false },
                { text: 'O(log n)', isCorrect: false },
                { text: 'O(n)', isCorrect: true },
                { text: 'O(n log n)', isCorrect: false }
              ],
              explanation: 'Use the two-pointer (fast/slow) technique which still requires O(n) traversal.'
            },
            {
              text: 'What is the key advantage of a doubly linked list over a singly linked list?',
              type: 'MCQ', topic: 'Linked Lists', difficulty: 'EASY', marks: 1, order: 4,
              options: [
                { text: 'Faster search', isCorrect: false },
                { text: 'Less memory usage', isCorrect: false },
                { text: 'Traversal in both directions', isCorrect: true },
                { text: 'O(1) access by index', isCorrect: false }
              ],
              explanation: 'Doubly linked lists have both next and prev pointers, enabling bidirectional traversal.'
            },
            {
              text: 'Which sorting algorithm has the best average-case time complexity for large datasets?',
              type: 'MCQ', topic: 'Sorting', difficulty: 'MEDIUM', marks: 1, order: 5,
              options: [
                { text: 'Bubble Sort — O(n²)', isCorrect: false },
                { text: 'Merge Sort — O(n log n)', isCorrect: true },
                { text: 'Insertion Sort — O(n²)', isCorrect: false },
                { text: 'Selection Sort — O(n²)', isCorrect: false }
              ],
              explanation: 'Merge Sort guarantees O(n log n) in all cases. QuickSort is O(n log n) average but O(n²) worst.'
            },
            {
              text: 'What is the space complexity of Merge Sort?',
              type: 'MCQ', topic: 'Sorting', difficulty: 'HARD', marks: 1, order: 6,
              options: [
                { text: 'O(1)', isCorrect: false },
                { text: 'O(log n)', isCorrect: false },
                { text: 'O(n)', isCorrect: true },
                { text: 'O(n log n)', isCorrect: false }
              ],
              explanation: 'Merge Sort requires an auxiliary array of size n for merging, giving O(n) space complexity.'
            },
            {
              text: 'Binary search requires the array to be:',
              type: 'MCQ', topic: 'Binary Search', difficulty: 'EASY', marks: 1, order: 7,
              options: [
                { text: 'Randomly shuffled', isCorrect: false },
                { text: 'Sorted', isCorrect: true },
                { text: 'Stored in a linked list', isCorrect: false },
                { text: 'Unique elements only', isCorrect: false }
              ],
              explanation: 'Binary search relies on comparing mid element to narrow the search range — only works on sorted data.'
            },
            {
              text: 'What does this recursive function compute?\n\ndef f(n):\n    if n <= 1: return n\n    return f(n-1) + f(n-2)',
              type: 'MCQ', topic: 'Recursion', difficulty: 'EASY', marks: 1, order: 8,
              codeSnippet: 'def f(n):\n    if n <= 1: return n\n    return f(n-1) + f(n-2)',
              options: [
                { text: 'Factorial of n', isCorrect: false },
                { text: 'Fibonacci of n', isCorrect: true },
                { text: 'Sum of 1 to n', isCorrect: false },
                { text: 'Power of 2', isCorrect: false }
              ],
              explanation: 'Classic Fibonacci recursive definition: f(0)=0, f(1)=1, f(n)=f(n-1)+f(n-2)'
            },
            {
              text: 'In binary search on a sorted array of 1000 elements, what is the maximum number of comparisons?',
              type: 'MCQ', topic: 'Binary Search', difficulty: 'HARD', marks: 1, order: 9,
              options: [
                { text: '10', isCorrect: true },
                { text: '50', isCorrect: false },
                { text: '100', isCorrect: false },
                { text: '500', isCorrect: false }
              ],
              explanation: 'Binary search is O(log n). log₂(1000) ≈ 9.97, so maximum 10 comparisons.'
            },
            {
              text: 'What is the base case in recursion?',
              type: 'MCQ', topic: 'Recursion', difficulty: 'EASY', marks: 1, order: 10,
              options: [
                { text: 'The condition that causes infinite recursion', isCorrect: false },
                { text: 'The condition that stops the recursive calls', isCorrect: true },
                { text: 'The initial value passed to the function', isCorrect: false },
                { text: 'The return type of the function', isCorrect: false }
              ],
              explanation: 'The base case defines when recursion stops — preventing infinite calls and stack overflow.'
            }
          ]
        }
      }
    })
    console.log('Created DSA Mock Test Quiz (Featured)')
  } else {
    console.log('Quiz count >= 5, skipping extra quizzes')
  }

  // ── Company Drives ────────────────────────────────────────────────────────────
  const driveCount = await prisma.companyDrive.count()
  if (driveCount === 0) {
    await prisma.companyDrive.createMany({ data: [
      {
        companyName: 'TCS Digital', role: 'Junior Developer',
        package: '3.36 - 7 LPA', location: 'Chennai / Coimbatore',
        driveDate: new Date(Date.now() + 15 * 86400000),
        applyDeadline: new Date(Date.now() + 8 * 86400000),
        description: 'TCS Digital hiring Python developers for their digital transformation team.',
        requirements: ['B.Tech/MCA', '60% throughout', 'No backlogs'],
        skills: ['Python', 'Django', 'SQL', 'Git'], driveType: 'CAMPUS', status: 'ACTIVE', batchId: batch12.id
      },
      {
        companyName: 'Infosys', role: 'Systems Engineer',
        package: '3.6 LPA', location: 'Bangalore / Hyderabad',
        driveDate: new Date(Date.now() + 25 * 86400000),
        applyDeadline: new Date(Date.now() + 18 * 86400000),
        description: 'Infosys InfyTQ drive for Systems Engineers. Online aptitude + technical + HR rounds.',
        requirements: ['Any degree', '65% throughout', 'Max 2 year gap'],
        skills: ['Aptitude', 'Python/Java', 'Communication'], driveType: 'ONLINE', status: 'UPCOMING', batchId: batch12.id
      },
      {
        companyName: 'Zoho Corporation', role: 'Software Developer',
        package: '5 - 8 LPA', location: 'Chennai',
        driveDate: new Date(Date.now() + 5 * 86400000),
        applyDeadline: new Date(Date.now() + 2 * 86400000),
        description: 'Zoho is hiring software developers. Multiple coding rounds with data structures focus.',
        requirements: ['CS/IT preferred', 'Strong DSA skills', 'No CGPA cutoff'],
        skills: ['DSA', 'Python/Java/C++', 'Problem Solving'], driveType: 'WALKIN', status: 'ACTIVE'
      }
    ]})
    console.log('Created company drives')
  }

  // ── Skills for Ramesh ─────────────────────────────────────────────────────────
  const skillCount = await prisma.studentSkill.count({ where: { studentId: rameshProfile.id } })
  if (skillCount === 0) {
    const skillsData = [
      { name: 'Python', category: 'Programming', proficiency: 4, yearsExp: 1.5 },
      { name: 'Django', category: 'Framework', proficiency: 3, yearsExp: 0.5 },
      { name: 'SQL', category: 'Database', proficiency: 3, yearsExp: 1.0 },
      { name: 'Git', category: 'Tool', proficiency: 4, yearsExp: 1.0 },
      { name: 'PostgreSQL', category: 'Database', proficiency: 2, yearsExp: 0.5 },
      { name: 'REST APIs', category: 'Framework', proficiency: 3, yearsExp: 0.5 },
      { name: 'Docker', category: 'Tool', proficiency: 2, yearsExp: null },
      { name: 'Communication', category: 'Soft Skill', proficiency: 4, yearsExp: null },
      { name: 'Problem Solving', category: 'Soft Skill', proficiency: 3, yearsExp: null },
    ]
    for (const skill of skillsData) {
      await prisma.studentSkill.create({ data: { studentId: rameshProfile.id, ...skill } })
    }
    console.log('Created skills for Ramesh')
  }

  console.log('\n✓ Seeding complete!')
  console.log('\nLogin credentials:')
  console.log('  Student:  ramesh@student.com / Student@123')
  console.log('  Trainer:  trainer@careerlabs.in / Trainer@123')
  console.log('  Admin:    admin@careerlabs.in / Admin@123456')
}

main()
  .catch(err => { console.error('Seed error:', err); process.exit(1) })
  .finally(() => prisma.$disconnect())
