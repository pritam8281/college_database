# College Database Website
## How to make it run in your local server
1. clone the REPO on your local using "git clone https://github.com/pritam8281/college_database.git"
2. run "npm i" in the termminal
3. Give a secret key in the session.
4. In the database connection, give the username of your local database (such as 'root') and the password of the server.
   
## Database setup
### Creating Tables:
1. Create a database named 'college_database': 
    "CREATE DATABASE college_database;"
      "USE college_database;"
2. Create a table named 'users': 
     "CREATE TABLE users (
      id INT NOT NULL AUTO_INCREMENT,
      username VARCHAR(50) NOT NULL,
      password VARCHAR(255) NOT NULL,
      user_type ENUM('admin','student','faculty','staff') NOT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY username (username) 
    );"
3. Create a table named "department": 
   "CREATE TABLE department (
  DeptID INT NOT NULL AUTO_INCREMENT,
  DeptName VARCHAR(100) NOT NULL,
  HeadFacultyID INT DEFAULT NULL,
  PRIMARY KEY (DeptID),
  UNIQUE KEY DeptName (DeptName),
  UNIQUE KEY HeadFacultyID (HeadFacultyID)
);"
4. Create a table named "faculty": 
   "CREATE TABLE faculty (
  FacultyID INT NOT NULL AUTO_INCREMENT,
  Name VARCHAR(100) NOT NULL,
  Department VARCHAR(100) NOT NULL,
  Qualifications VARCHAR(150) DEFAULT NULL,
  ExperienceYears INT DEFAULT NULL,
  Email VARCHAR(100) NOT NULL,
  DeptID INT DEFAULT NULL,
  PRIMARY KEY (FacultyID),
  UNIQUE KEY Email (Email),
  KEY DeptID (DeptID),
  CONSTRAINT faculty_chk_1 CHECK (ExperienceYears >= 0)
);"
5. Add constraints in depatment and faculty table: 
   "ALTER TABLE department
ADD CONSTRAINT department_ibfk_1
FOREIGN KEY (HeadFacultyID) REFERENCES faculty (FacultyID)
ON DELETE SET NULL
ON UPDATE CASCADE;"
   "ALTER TABLE faculty
ADD CONSTRAINT faculty_ibfk_1
FOREIGN KEY (DeptID) REFERENCES department (DeptID)
ON DELETE SET NULL
ON UPDATE CASCADE;"
6. Create a table named "student": 
   "CREATE TABLE student (
  StudentID INT NOT NULL AUTO_INCREMENT,
  user_id INT DEFAULT NULL,
  Name VARCHAR(100) NOT NULL,
  Address TEXT,
  DateOfBirth DATE DEFAULT NULL,
  Email VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (StudentID),
  UNIQUE KEY Email (Email),
  KEY user_id (user_id),
  CONSTRAINT student_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
)
7. Create a table named "placement":
   "CREATE TABLE placement (
  PlacementID INT NOT NULL AUTO_INCREMENT,
  StudentID INT NOT NULL,
  Company VARCHAR(100) NOT NULL,
  Role VARCHAR(100) NOT NULL,
  Salary FLOAT DEFAULT NULL,
  DatePlaced DATE DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (PlacementID),
  KEY StudentID (StudentID),
  CONSTRAINT placement_ibfk_1 FOREIGN KEY (StudentID) REFERENCES student (StudentID)
    ON DELETE CASCADE
);"
8. Create a table named "marks":
   "CREATE TABLE marks (
  MarkID INT NOT NULL AUTO_INCREMENT,
  StudentID INT NOT NULL,
  Subject VARCHAR(100) NOT NULL,
  Semester INT NOT NULL,
  Score FLOAT NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (MarkID),
  KEY StudentID (StudentID),
  CONSTRAINT marks_ibfk_1 FOREIGN KEY (StudentID) REFERENCES student (StudentID)
    ON DELETE CASCADE
);"

### Add Data in the table:

1. Users table:
   "INSERT INTO users (username, password, user_type)
VALUES
('pritam_paul', '$2b$10$m0CRnja2jnYBLS7tZRf5zOx/m/RwuWiBrc0hi85.fkk3X3MrbNCmO', 'student'),  -- pritam123
('suparna_saha', '$2b$10$Nyw3H4L9FLJIorDFPAKo5eto/Rh22AaL8vtCrqiow5nyajmFAWOxm', 'student'), -- suparna123
('somnath_sardar', '$2b$10$E1hv92jw2Pp1Q6P7gkWTOuaHzR9fK6eUu6X7mSxXJzFyp1T8cZ1Yq', 'student'), -- somnath123
('sourashish_majumder', '$2b$10$U7kZ8LhRj/BC8p7sWz6Ieeo7N8M5GFgP6z1h4qVYd0eFmQ2HJkM7S', 'student'), -- sourashish123
('tridip_changdar', '$2b$10$M3bR9V1gJxD8qP2oQ9HfLe8aC5gT0bV1z7Yx2qLJw4mV7nF2ZqA5y', 'student'), -- tridip123
('souvik_maity', '$2b$10$P8wL9gJdF2pR5qV1kHfT9yZcO6mB1eX2lR7vS3dJx9oQ4hM5KzC2a', 'student'); -- souvik123 
" 
admin pass : admin123(hatched)
rahul pass:rahul123 (hatched)
2. Department and Faculty table:
   // Without HOD's first: 
   "INSERT INTO department (DeptName)
VALUES
('Computer Science'),
('Information Technology'),
('Leather Technology');"

// Faculty according to deaprtment id
   "INSERT INTO faculty (Name, Department, Qualifications, ExperienceYears, Email, DeptID)
VALUES
('Dr. Brijesh Shrivastava', 'Computer Science', 'Ph.D. in Computer Science', 15, 'brijesh.shrivastava@college.edu', 1),
('Mr. Falguni Sinhababu', 'Computer Science', 'M.Tech in Computer Science', 8, 'falguni.sinhababu@college.edu', 1),
('Mr. Chhotan Mal', 'Computer Science', 'M.Tech in Computer Science', 6, 'chhotan.mal@college.edu', 1),
('Dr. Debayan Ganguly', 'Computer Science', 'Ph.D. in Computer Science', 12, 'debayan.ganguly@college.edu', 1),
('Dr. Srirupa Dasgupta', 'Information Technology', 'Ph.D. in Information Technology', 10, 'srirupa.dasgupta@college.edu', 2),
('Mr. Ruben Ray', 'Information Technology', 'M.Tech in Information Technology', 5, 'ruben.ray@college.edu', 2),
('Dr. Surjadeep Sarkar', 'Information Technology', 'Ph.D. in IT Systems', 9, 'surjadeep.sarkar@college.edu', 2),
('Dr. Sanjoy Chakraborty', 'Leather Technology', 'Ph.D. in Leather Technology', 14, 'sanjoy.chakraborty@college.edu', 3),
('Dr. Goutam Mukherjee', 'Leather Technology', 'Ph.D. in Leather Science', 18, 'goutam.mukherjee@college.edu', 3); "

// give Department Head 
"UPDATE department SET HeadFacultyID = 1 WHERE DeptID = 1; 
UPDATE department SET HeadFacultyID = 5 WHERE DeptID = 2;
UPDATE department SET HeadFacultyID = 9 WHERE DeptID = 3; 

3. Student table:
   "INSERT INTO student (user_id, Name, Address, DateOfBirth, Email)
VALUES
(1, 'Pritam Paul', '123 Park Street, Kolkata', '2000-05-15', 'pritam.paul@student.edu'),
(2, 'Suparna Saha', '45 Lake Road, Kolkata', '2001-08-22', 'suparna.saha@student.edu'),
(3, 'Somnath Sardar', '12 MG Road, Howrah', '2000-12-05', 'somnath.sardar@student.edu'),
(4, 'Sourashish Majumder', '78 Salt Lake, Kolkata', '2001-03-18', 'sourashish.majumder@student.edu'),
(5, 'Tridip Changdar', '9 Ballygunge Place, Kolkata', '2000-11-30', 'tridip.changdar@student.edu'),
(6, 'Souvik Maity', '56 Gariahat Road, Kolkata', '2001-07-12', 'souvik.maity@student.edu');"

4. Placement table:
   "INSERT INTO placement (StudentID, Company, Role, Salary, DatePlaced)
VALUES
(1, 'TCS', 'Software Engineer', 600000, '2024-05-20'),
(1, 'Infosys', 'System Analyst', 550000, '2024-06-15'),
(6, 'Wipro', 'Developer', 580000, '2024-06-30'),
(4, 'Tech Mahindra', 'Software Developer', 620000, '2024-07-10'),
(2, 'HCL', 'IT Consultant', 590000, '2024-07-22'),
(2, 'Cognizant', 'Junior Developer', 570000, '2024-08-05');"

5. Marks table:
   "INSERT INTO marks (StudentID, Subject, Semester, Score)
VALUES
(1, 'Descrete Mathematics', 1, 85.5),
(2, 'Data Structure and Algorithm', 4, 88.0),
(3, 'Digital Electronics', 3, 72.0),
(4, 'Engineering Economics', 3, 80.0),
(5, 'Formal Languages and Automata Theory', 4, 85.0),
(6, 'computer Networks', 4, 78.0);"


