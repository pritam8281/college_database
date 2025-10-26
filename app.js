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
        
        // Get department information for the student
        let department = null;
        if (student && (student.DeptID || student.Department)) {
            const deptId = student.DeptID || student.Department;
            const [deptRows] = await db.promise().execute(
                'SELECT d.*, f.Name as FacultyHeadName FROM Department d LEFT JOIN Faculty f ON d.HeadFacultyID = f.FacultyID WHERE d.DeptID = ?',
                [deptId]
            );
            department = deptRows.length > 0 ? deptRows[0] : null;
        }
        
        // Calculate current semester
        let currentSemester = 0;
        if (marks.length > 0) {
            currentSemester = Math.max(...marks.map(m => m.Semester));
        }
        
        res.render('studentDasboard', { 
            student: student,
            marks: marks,
            placements: placements,
            department: department,
            currentSemester: currentSemester,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Student dashboard error:', error);
        res.render('studentDasboard', { 
            student: null,
            marks: [],
            placements: [],
            department: null,
            currentSemester: 0,
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
        // Get all students with department information
        const [studentsRows] = await db.promise().execute(
            'SELECT s.*, u.username, d.DeptName as DepartmentName, d.HeadFacultyID as DepartmentHeadID, f.Name as FacultyHeadName FROM Student s JOIN users u ON s.user_id = u.id LEFT JOIN Department d ON s.DeptID = d.DeptID LEFT JOIN Faculty f ON d.HeadFacultyID = f.FacultyID'
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
        const deptId = student.DeptID || student.Department || 0;
        const [departmentRows] = await db.promise().execute(
            'SELECT d.*, f.Name as FacultyHeadName FROM Department d LEFT JOIN Faculty f ON d.HeadFacultyID = f.FacultyID WHERE d.DeptID = ?',
            [deptId]
        );
        
        // Get all departments for dropdown
        const [allDepartments] = await db.promise().execute('SELECT * FROM Department');
        
        // Calculate academic statistics
        const totalMarks = marksRows.length;
        const averageScore = totalMarks > 0 ? 
            marksRows.reduce((sum, mark) => sum + mark.Score, 0) / totalMarks : 0;
        
        // Get current semester (latest semester from marks)
        let currentSemester = 0;
        if (marksRows.length > 0) {
            currentSemester = Math.max(...marksRows.map(m => m.Semester));
        }
        
        res.render('studentDetail', {
            student: student,
            marks: marksRows,
            placements: placementRows,
            department: departmentRows.length > 0 ? departmentRows[0] : null,
            departments: allDepartments,
            currentSemester: currentSemester,
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
    const { username, password, name, address, dateOfBirth, email, deptId } = req.body;
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user first
        const [userResult] = await db.promise().execute(
            'INSERT INTO users (username, password, user_type) VALUES (?, ?, ?)',
            [username, hashedPassword, 'student']
        );
        
        const userId = userResult.insertId;
        
        // Create student record with department (check if column exists first)
        try {
            await db.promise().execute(
                'INSERT INTO Student (user_id, Name, Address, DateOfBirth, Email, DeptID) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, name, address, dateOfBirth, email, deptId || null]
            );
        } catch (err) {
            // If DeptID column doesn't exist, try without it
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                await db.promise().execute(
                    'INSERT INTO Student (user_id, Name, Address, DateOfBirth, Email) VALUES (?, ?, ?, ?, ?)',
                    [userId, name, address, dateOfBirth, email]
                );
            } else {
                throw err;
            }
        }
        
        res.redirect('/admin');
    } catch (error) {
        console.error('Add student error:', error);
        res.redirect('/admin');
    }
});

// Enhanced Update Student
app.post('/admin/update-student', async (req, res) => {
    const { id, name, email, address, dateOfBirth, deptId } = req.body;
    const referer = req.get('referer') || '/admin';
    
    try {
        // Build dynamic update query based on provided fields
        let updateFields = [];
        let updateValues = [];
        
        if (name !== undefined && name !== '') {
            updateFields.push('Name = ?');
            updateValues.push(name);
        }
        if (email !== undefined && email !== '') {
            updateFields.push('Email = ?');
            updateValues.push(email);
        }
        if (address !== undefined && address !== '') {
            updateFields.push('Address = ?');
            updateValues.push(address);
        }
        if (dateOfBirth !== undefined && dateOfBirth !== '') {
            updateFields.push('DateOfBirth = ?');
            updateValues.push(dateOfBirth);
        }
        if (deptId !== undefined) {
            updateFields.push('DeptID = ?');
            updateValues.push(deptId || null);
        }
        
        // If no fields to update, just redirect
        if (updateFields.length === 0) {
            return res.redirect(referer);
        }
        
        // Add WHERE clause
        updateValues.push(id);
        const updateQuery = `UPDATE Student SET ${updateFields.join(', ')} WHERE StudentID = ?`;
        
        console.log('Update query:', updateQuery);
        console.log('Update values:', updateValues);
        
        try {
            await db.promise().execute(updateQuery, updateValues);
            console.log('Update successful');
        } catch (err) {
            console.error('Database error:', err.code, err.message);
            
            // If DeptID column doesn't exist, try without it
            if (err.code === 'ER_BAD_FIELD_ERROR' && updateFields.some(f => f.includes('DeptID'))) {
                console.log('DeptID column not found, trying without it');
                updateFields = updateFields.filter(f => !f.includes('DeptID'));
                if (updateFields.length > 0) {
                    updateValues = updateValues.slice(0, updateFields.length);
                    updateValues.push(id);
                    const newQuery = `UPDATE Student SET ${updateFields.join(', ')} WHERE StudentID = ?`;
                    console.log('Retrying without DeptID:', newQuery);
                    await db.promise().execute(newQuery, updateValues);
                } else {
                    console.log('No fields to update after removing DeptID');
                }
            } else {
                throw err;
            }
        }
        
        res.redirect(referer);
    } catch (error) {
        console.error('Update student error:', error);
        res.redirect(referer);
    }
});

// Add Student Marks
app.post('/admin/add-marks', async (req, res) => {
    const { student_id, subject, semester, score } = req.body;
    const referer = req.get('referer') || '/admin';
    
    try {
        await db.promise().execute(
            'INSERT INTO Marks (StudentID, Subject, Semester, Score) VALUES (?, ?, ?, ?)',
            [student_id, subject, semester, score]
        );
        
        // If coming from student detail page, redirect back there
        if (referer.includes('/admin/student/')) {
            res.redirect(referer);
        } else {
            res.redirect('/admin');
        }
    } catch (error) {
        console.error('Add marks error:', error);
        if (referer.includes('/admin/student/')) {
            res.redirect(referer);
        } else {
            res.redirect('/admin');
        }
    }
});

// Add Student Placement
app.post('/admin/add-placement', async (req, res) => {
    const { student_id, company, role, salary, datePlaced } = req.body;
    const referer = req.get('referer') || '/admin';
    
    try {
        await db.promise().execute(
            'INSERT INTO Placement (StudentID, Company, Role, Salary, DatePlaced) VALUES (?, ?, ?, ?, ?)',
            [student_id, company, role, salary, datePlaced]
        );
        
        // If coming from student detail page, redirect back there
        if (referer.includes('/admin/student/')) {
            res.redirect(referer);
        } else {
            res.redirect('/admin');
        }
    } catch (error) {
        console.error('Add placement error:', error);
        if (referer.includes('/admin/student/')) {
            res.redirect(referer);
        } else {
            res.redirect('/admin');
        }
    }
});

// Update Student Mark
app.post('/admin/update-mark', async (req, res) => {
    const { mark_id, subject, semester, score } = req.body;
    const referer = req.get('referer') || '/admin';
    
    try {
        // Try MarkID first, fallback to id
        try {
            await db.promise().execute(
                'UPDATE Marks SET Subject = ?, Semester = ?, Score = ? WHERE MarkID = ?',
                [subject, semester, score, mark_id]
            );
        } catch (err) {
            await db.promise().execute(
                'UPDATE Marks SET Subject = ?, Semester = ?, Score = ? WHERE id = ?',
                [subject, semester, score, mark_id]
            );
        }
        
        res.redirect(referer);
    } catch (error) {
        console.error('Update mark error:', error);
        res.redirect(referer);
    }
});

// Delete Student Mark
app.post('/admin/delete-mark', async (req, res) => {
    const { mark_id } = req.body;
    const referer = req.get('referer') || '/admin';
    
    try {
        // Try MarkID first, fallback to id
        try {
            await db.promise().execute('DELETE FROM Marks WHERE MarkID = ?', [mark_id]);
        } catch (err) {
            await db.promise().execute('DELETE FROM Marks WHERE id = ?', [mark_id]);
        }
        
        res.redirect(referer);
    } catch (error) {
        console.error('Delete mark error:', error);
        res.redirect(referer);
    }
});

// Update Student Placement
app.post('/admin/update-placement', async (req, res) => {
    const { placement_id, company, role, salary, datePlaced } = req.body;
    const referer = req.get('referer') || '/admin';
    
    try {
        // Try PlacementID first, fallback to id
        try {
            await db.promise().execute(
                'UPDATE Placement SET Company = ?, Role = ?, Salary = ?, DatePlaced = ? WHERE PlacementID = ?',
                [company, role, salary, datePlaced, placement_id]
            );
        } catch (err) {
            await db.promise().execute(
                'UPDATE Placement SET Company = ?, Role = ?, Salary = ?, DatePlaced = ? WHERE id = ?',
                [company, role, salary, datePlaced, placement_id]
            );
        }
        
        res.redirect(referer);
    } catch (error) {
        console.error('Update placement error:', error);
        res.redirect(referer);
    }
});

// Update Placement Accepted Status
app.post('/admin/update-placement-accepted', async (req, res) => {
    const { placement_id, student_id, is_accepted } = req.body;
    const referer = req.get('referer') || '/admin';
    
    try {
        // First, set all placements for this student to not accepted
        await db.promise().execute(
            'UPDATE Placement SET IsAccepted = 0 WHERE StudentID = ?',
            [student_id]
        );
        
        // If the checkbox was checked, set this placement to accepted
        if (is_accepted) {
            try {
                await db.promise().execute(
                    'UPDATE Placement SET IsAccepted = 1 WHERE PlacementID = ?',
                    [placement_id]
                );
            } catch (err) {
                await db.promise().execute(
                    'UPDATE Placement SET IsAccepted = 1 WHERE id = ?',
                    [placement_id]
                );
            }
        }
        
        res.redirect(referer);
    } catch (error) {
        console.error('Update placement accepted error:', error);
        res.redirect(referer);
    }
});

// Delete Student Placement
app.post('/admin/delete-placement', async (req, res) => {
    const { placement_id } = req.body;
    const referer = req.get('referer') || '/admin';
    
    try {
        // Try PlacementID first, fallback to id
        try {
            await db.promise().execute('DELETE FROM Placement WHERE PlacementID = ?', [placement_id]);
        } catch (err) {
            await db.promise().execute('DELETE FROM Placement WHERE id = ?', [placement_id]);
        }
        
        res.redirect(referer);
    } catch (error) {
        console.error('Delete placement error:', error);
        res.redirect(referer);
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

// Staff Management Routes
app.get('/admin/staff', async (req, res) => {
    if (!req.session.userId || req.session.userType !== 'admin') {
        return res.redirect('/');
    }
    
    try {
        const [staffRows] = await db.promise().execute('SELECT * FROM nonTeachingStaff ORDER BY StaffID DESC');
        
        res.render('staff', { 
            staff: staffRows
        });
    } catch (error) {
        console.error('Staff management error:', error);
        res.render('staff', { 
            staff: []
        });
    }
});

app.post('/admin/add-staff', async (req, res) => {
    const { name, role, email, phone } = req.body;
    
    try {
        await db.promise().execute(
            'INSERT INTO nonTeachingStaff (Name, Role, Email, Phone) VALUES (?, ?, ?, ?)',
            [name, role, email || null, phone || null]
        );
        
        res.redirect('/admin/staff');
    } catch (error) {
        console.error('Add staff error:', error);
        res.redirect('/admin/staff');
    }
});

app.post('/admin/update-staff', async (req, res) => {
    const { id, name, role, email, phone } = req.body;
    
    try {
        await db.promise().execute(
            'UPDATE nonTeachingStaff SET Name = ?, Role = ?, Email = ?, Phone = ? WHERE StaffID = ?',
            [name, role, email || null, phone || null, id]
        );
        
        res.redirect('/admin/staff');
    } catch (error) {
        console.error('Update staff error:', error);
        res.redirect('/admin/staff');
    }
});

app.post('/admin/delete-staff', async (req, res) => {
    const { id } = req.body;
    
    try {
        await db.promise().execute('DELETE FROM nonTeachingStaff WHERE StaffID = ?', [id]);
        
        res.redirect('/admin/staff');
    } catch (error) {
        console.error('Delete staff error:', error);
        res.redirect('/admin/staff');
    }
});

// Faculty Management Routes
app.get('/admin/faculty', async (req, res) => {
    if (!req.session.userId || req.session.userType !== 'admin') {
        return res.redirect('/');
    }
    
    try {
        const [facultyRows] = await db.promise().execute('SELECT * FROM Faculty ORDER BY FacultyID DESC');
        
        res.render('faculty', { 
            faculty: facultyRows
        });
    } catch (error) {
        console.error('Faculty management error:', error);
        res.render('faculty', { 
            faculty: []
        });
    }
});

app.post('/admin/add-faculty', async (req, res) => {
    const { name, department, email, phone } = req.body;
    
    try {
        await db.promise().execute(
            'INSERT INTO Faculty (Name, Department, Email, Phone) VALUES (?, ?, ?, ?)',
            [name, department, email || null, phone || null]
        );
        
        res.redirect('/admin/faculty');
    } catch (error) {
        console.error('Add faculty error:', error);
        res.redirect('/admin/faculty');
    }
});

app.post('/admin/update-faculty', async (req, res) => {
    const { id, name, department, email, phone } = req.body;
    
    try {
        await db.promise().execute(
            'UPDATE Faculty SET Name = ?, Department = ?, Email = ?, Phone = ? WHERE FacultyID = ?',
            [name, department, email || null, phone || null, id]
        );
        
        res.redirect('/admin/faculty');
    } catch (error) {
        console.error('Update faculty error:', error);
        res.redirect('/admin/faculty');
    }
});

app.post('/admin/delete-faculty', async (req, res) => {
    const { id } = req.body;
    
    try {
        await db.promise().execute('DELETE FROM Faculty WHERE FacultyID = ?', [id]);
        
        res.redirect('/admin/faculty');
    } catch (error) {
        console.error('Delete faculty error:', error);
        res.redirect('/admin/faculty');
    }
});

// Export Routes
app.get('/admin/export-students', async (req, res) => {
    if (!req.session.userId || req.session.userType !== 'admin') {
        return res.redirect('/');
    }
    
    try {
        const [studentsRows] = await db.promise().execute(
            'SELECT s.*, u.username, d.DeptName as DepartmentName FROM Student s LEFT JOIN users u ON s.user_id = u.id LEFT JOIN Department d ON s.DeptID = d.DeptID ORDER BY s.StudentID'
        );
        
        // Generate CSV content
        let csv = 'ID,Name,Email,DateOfBirth,Address,StudentID,Username,Department\n';
        studentsRows.forEach(student => {
            const name = (student.Name || '').replace(/"/g, '""');
            const email = (student.Email || '').replace(/"/g, '""');
            const dob = (student.DateOfBirth ? new Date(student.DateOfBirth).toLocaleDateString() : '').replace(/"/g, '""');
            const address = (student.Address || '').replace(/"/g, '""');
            const username = (student.username || '').replace(/"/g, '""');
            const dept = (student.DepartmentName || '').replace(/"/g, '""');
            
            csv += `${student.StudentID},"${name}","${email}","${dob}","${address}",` +
                   `${student.StudentID},"${username}","${dept}"\n`;
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=students.csv');
        res.send(csv);
    } catch (error) {
        console.error('Export students error:', error);
        res.redirect('/admin');
    }
});

app.get('/admin/export-staff', async (req, res) => {
    if (!req.session.userId || req.session.userType !== 'admin') {
        return res.redirect('/');
    }
    
    try {
        const [staffRows] = await db.promise().execute('SELECT * FROM nonTeachingStaff ORDER BY StaffID');
        
        // Generate CSV content
        let csv = 'ID,Name,Role,Email,Phone\n';
        staffRows.forEach(staff => {
            const name = (staff.Name || '').replace(/"/g, '""');
            const role = (staff.Role || '').replace(/"/g, '""');
            const email = (staff.Email || '').replace(/"/g, '""');
            const phone = (staff.Phone || '').replace(/"/g, '""');
            
            csv += `${staff.StaffID},"${name}","${role}","${email}","${phone}"\n`;
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=staff.csv');
        res.send(csv);
    } catch (error) {
        console.error('Export staff error:', error);
        res.redirect('/admin/staff');
    }
});

app.get('/admin/export-faculty', async (req, res) => {
    if (!req.session.userId || req.session.userType !== 'admin') {
        return res.redirect('/');
    }
    
    try {
        const [facultyRows] = await db.promise().execute('SELECT * FROM Faculty ORDER BY FacultyID');
        
        // Generate CSV content
        let csv = 'ID,Name,Department,Email,Phone\n';
        facultyRows.forEach(faculty => {
            const name = (faculty.Name || '').replace(/"/g, '""');
            const dept = (faculty.Department || '').replace(/"/g, '""');
            const email = (faculty.Email || '').replace(/"/g, '""');
            const phone = (faculty.Phone || '').replace(/"/g, '""');
            
            csv += `${faculty.FacultyID},"${name}","${dept}","${email}","${phone}"\n`;
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=faculty.csv');
        res.send(csv);
    } catch (error) {
        console.error('Export faculty error:', error);
        res.redirect('/admin/faculty');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
});
