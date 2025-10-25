const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 5000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Database connection
const db = mysql.createConnection({
    host:"localhost",
    user:process.env.USER_NAME,
    password:process.env.PASSWORD,
    database:"college_database"
})

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Connected to MySQL database');
    }
});

// Routes
app.get('/', (req, res) => {
    if (req.session.userId) {
        if (req.session.userType === 'admin') {
            res.redirect('/admin');
        } else {
            res.redirect('/student');
        }
    } else {
        res.render('login', { error: null });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const [rows] = await db.promise().execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        
        if (rows.length > 0) {
            const user = rows[0];
            const validPassword = await bcrypt.compare(password, user.password);
            
            if (validPassword) {
                req.session.userId = user.id;
                req.session.userType = user.user_type;
                req.session.username = user.username;
                
                if (user.user_type === 'admin') {
                    res.redirect('/admin');
                } else {
                    res.redirect('/student');
                }
            } else {
                res.render('login', { error: 'Invalid credentials' });
            }
        } else {
            res.render('login', { error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', { error: 'Login failed. Please try again.' });
    }
});

// Enhanced Student Dashboard
app.get('/student', async (req, res) => {
    if (!req.session.userId || req.session.userType !== 'student') {
        return res.redirect('/');
    }
    
    try {
        // Get student details
        const [studentRows] = await db.promise().execute(
            'SELECT s.*, u.username FROM Student s JOIN users u ON s.user_id = u.id WHERE s.user_id = ?',
            [req.session.userId]
        );
        
        let student = null;
        let marks = [];
        let placements = [];
        
        if (studentRows.length > 0) {
            student = studentRows[0];
            
            // Get student marks
            const [marksRows] = await db.promise().execute(
                'SELECT * FROM Marks WHERE StudentID = ? ORDER BY Semester, Subject',
                [student.StudentID]
            );
            marks = marksRows;
            
            // Get student placements
            const [placementRows] = await db.promise().execute(
                'SELECT * FROM Placement WHERE StudentID = ? ORDER BY DatePlaced DESC',
                [student.StudentID]
            );
            placements = placementRows;
        }
        
        res.render('studentDasboard', { 
            student: student,
            marks: marks,
            placements: placements,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Student dashboard error:', error);
        res.render('studentDasboard', { 
            student: null,
            marks: [],
            placements: [],
            success: req.query.success,
            error: req.query.error
        });
    }
});

// Enhanced Admin Dashboard
app.get('/admin', async (req, res) => {
    if (!req.session.userId || req.session.userType !== 'admin') {
        return res.redirect('/');
    }
    
    try {
        // Get all students
        const [studentsRows] = await db.promise().execute(
            'SELECT s.*, u.username FROM Student s JOIN users u ON s.user_id = u.id'
        );
        
        // Get all departments
        const [departmentsRows] = await db.promise().execute('SELECT * FROM Department');
        
        res.render('admin', { 
            students: studentsRows,
            faculty: [],
            staff: [],
            departments: departmentsRows
        });
    } catch (error) {
        console.error('Admin panel error:', error);
        res.render('admin', { 
            students: [],
            faculty: [],
            staff: [],
            departments: []
        });
    }
});

// Student Detail View for Admin
app.get('/admin/student/:id', async (req, res) => {
    if (!req.session.userId || req.session.userType !== 'admin') {
        return res.redirect('/');
    }
    
    const studentId = req.params.id;
    
    try {
        // Get student details
        const [studentRows] = await db.promise().execute(
            'SELECT s.*, u.username FROM Student s JOIN users u ON s.user_id = u.id WHERE s.StudentID = ?',
            [studentId]
        );
        
        if (studentRows.length === 0) {
            return res.redirect('/admin?error=Student not found');
        }
        
        const student = studentRows[0];
        
        // Get student marks
        const [marksRows] = await db.promise().execute(
            'SELECT * FROM Marks WHERE StudentID = ? ORDER BY Semester, Subject',
            [studentId]
        );
        
        // Get student placements
        const [placementRows] = await db.promise().execute(
            'SELECT * FROM Placement WHERE StudentID = ? ORDER BY DatePlaced DESC',
            [studentId]
        );
        
        // Get department information (if student has department)
        const [departmentRows] = await db.promise().execute(
            'SELECT * FROM Department WHERE DeptID = ?',
            [student.DeptID || 0]
        );
        
        // Calculate academic statistics
        const totalMarks = marksRows.length;
        const averageScore = totalMarks > 0 ? 
            marksRows.reduce((sum, mark) => sum + mark.Score, 0) / totalMarks : 0;
        
        res.render('studentDetail', {
            student: student,
            marks: marksRows,
            placements: placementRows,
            department: departmentRows.length > 0 ? departmentRows[0] : null,
            stats: {
                totalMarks: totalMarks,
                averageScore: Math.round(averageScore * 100) / 100,
                totalPlacements: placementRows.length
            }
        });
    } catch (error) {
        console.error('Student detail error:', error);
        res.redirect('/admin?error=Failed to load student details');
    }
});

// Enhanced Add Student
app.post('/admin/add-student', async (req, res) => {
    const { username, password, name, address, dateOfBirth, email } = req.body;
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user first
        const [userResult] = await db.promise().execute(
            'INSERT INTO users (username, password, user_type) VALUES (?, ?, ?)',
            [username, hashedPassword, 'student']
        );
        
        const userId = userResult.insertId;
        
        // Create student record
        await db.promise().execute(
            'INSERT INTO Student (user_id, Name, Address, DateOfBirth, Email) VALUES (?, ?, ?, ?, ?)',
            [userId, name, address, dateOfBirth, email]
        );
        
        res.redirect('/admin');
    } catch (error) {
        console.error('Add student error:', error);
        res.redirect('/admin');
    }
});

// Enhanced Update Student
app.post('/admin/update-student', async (req, res) => {
    const { id, name, email, address, dateOfBirth } = req.body;
    
    try {
        await db.promise().execute(
            'UPDATE Student SET Name = ?, Email = ?, Address = ?, DateOfBirth = ? WHERE StudentID = ?',
            [name, email, address, dateOfBirth, id]
        );
        
        res.redirect('/admin');
    } catch (error) {
        console.error('Update student error:', error);
        res.redirect('/admin');
    }
});

// Add Student Marks
app.post('/admin/add-marks', async (req, res) => {
    const { student_id, subject, semester, score } = req.body;
    
    try {
        await db.promise().execute(
            'INSERT INTO Marks (StudentID, Subject, Semester, Score) VALUES (?, ?, ?, ?)',
            [student_id, subject, semester, score]
        );
        
        res.redirect('/admin');
    } catch (error) {
        console.error('Add marks error:', error);
        res.redirect('/admin');
    }
});

// Add Student Placement
app.post('/admin/add-placement', async (req, res) => {
    const { student_id, company, role, salary, datePlaced } = req.body;
    
    try {
        await db.promise().execute(
            'INSERT INTO Placement (StudentID, Company, Role, Salary, DatePlaced) VALUES (?, ?, ?, ?, ?)',
            [student_id, company, role, salary, datePlaced]
        );
        
        res.redirect('/admin');
    } catch (error) {
        console.error('Add placement error:', error);
        res.redirect('/admin');
    }
});

// Delete Student
app.post('/admin/delete-student', async (req, res) => {
    const { id } = req.body;
    
    try {
        // Get user_id first
        const [rows] = await db.promise().execute(
            'SELECT user_id FROM Student WHERE StudentID = ?',
            [id]
        );
        
        if (rows.length > 0) {
            const userId = rows[0].user_id;
            
            // Delete marks first
            await db.promise().execute('DELETE FROM Marks WHERE StudentID = ?', [id]);
            
            // Delete placements
            await db.promise().execute('DELETE FROM Placement WHERE StudentID = ?', [id]);
            
            // Delete student record
            await db.promise().execute('DELETE FROM Student WHERE StudentID = ?', [id]);
            
            // Delete user record
            await db.promise().execute('DELETE FROM users WHERE id = ?', [userId]);
        }
        
        res.redirect('/admin');
    } catch (error) {
        console.error('Delete student error:', error);
        res.redirect('/admin');
    }
});

// Student Update Personal Information
app.post('/student/update-personal-info', async (req, res) => {
    if (!req.session.userId || req.session.userType !== 'student') {
        return res.redirect('/');
    }
    
    const { username, password, confirmPassword, name, email, address, dateOfBirth } = req.body;
    
    // Basic validation
    if (!username || !name || !email) {
        return res.redirect('/student?error=Username, name and email are required');
    }
    
    // Username validation
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
        return res.redirect('/student?error=Username can only contain letters, numbers, and underscores');
    }
    
    // Password validation (if provided)
    if (password) {
        if (password.length < 6) {
            return res.redirect('/student?error=Password must be at least 6 characters long');
        }
        
        if (password !== confirmPassword) {
            return res.redirect('/student?error=Passwords do not match');
        }
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.redirect('/student?error=Please enter a valid email address');
    }
    
    try {
        // Get current student data for comparison
        const [currentStudentRows] = await db.promise().execute(
            'SELECT s.*, u.username FROM Student s JOIN users u ON s.user_id = u.id WHERE s.user_id = ?',
            [req.session.userId]
        );
        
        if (currentStudentRows.length === 0) {
            return res.redirect('/student?error=Student record not found');
        }
        
        const currentStudent = currentStudentRows[0];
        
        // Check if username already exists (excluding current user)
        const [existingUser] = await db.promise().execute(
            'SELECT id FROM users WHERE username = ? AND id != ?',
            [username.trim(), req.session.userId]
        );
        
        if (existingUser.length > 0) {
            return res.redirect('/student?error=Username already exists. Please choose a different username');
        }
        
        // Check if email already exists (only if email is being changed)
        if (email.trim() !== currentStudent.Email) {
            const [existingEmail] = await db.promise().execute(
                'SELECT StudentID FROM Student WHERE Email = ? AND user_id != ?',
                [email.trim(), req.session.userId]
            );
            
            if (existingEmail.length > 0) {
                return res.redirect('/student?error=Email already exists. Please choose a different email');
            }
        }
        
        // Update user credentials first
        let userUpdateQuery = 'UPDATE users SET username = ?';
        let userUpdateParams = [username.trim()];
        
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            userUpdateQuery += ', password = ?';
            userUpdateParams.push(hashedPassword);
        }
        
        userUpdateQuery += ' WHERE id = ?';
        userUpdateParams.push(req.session.userId);
        
        const [userResult] = await db.promise().execute(userUpdateQuery, userUpdateParams);
        
        // Update student personal information
        const [studentResult] = await db.promise().execute(
            'UPDATE Student SET Name = ?, Email = ?, Address = ?, DateOfBirth = ? WHERE user_id = ?',
            [name.trim(), email.trim(), address ? address.trim() : null, dateOfBirth || null, req.session.userId]
        );
        
        // Update session username if changed
        if (username.trim() !== req.session.username) {
            req.session.username = username.trim();
        }
        
        if (userResult.affectedRows > 0 || studentResult.affectedRows > 0) {
            res.redirect('/student?success=Personal information and credentials updated successfully');
        } else {
            res.redirect('/student?error=No changes were made');
        }
        
    } catch (error) {
        console.error('Update personal info error:', error);
        
        // Check for specific database errors
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.message.includes('username')) {
                return res.redirect('/student?error=Username already exists. Please choose a different username');
            } else if (error.message.includes('Email')) {
                return res.redirect('/student?error=Email already exists. Please choose a different email');
            }
        }
        
        res.redirect('/student?error=Failed to update personal information: ' + error.message);
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
});
