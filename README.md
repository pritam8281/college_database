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

7. Create a table named "student": 
   "CREATE TABLE student ( StudentID INT NOT NULL AUTO_INCREMENT,
   user_id INT DEFAULT NULL, Name VARCHAR(100) NOT NULL,
   Address TEXT,
   DateOfBirth DATE DEFAULT NULL,
   Email VARCHAR(100) DEFAULT NULL,
   created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
   currentSem INT DEFAULT NULL,
   PRIMARY KEY (StudentID),
   UNIQUE KEY Email (Email),
   KEY user_id (user_id),
   CONSTRAINT student_ibfk_1
   FOREIGN KEY (user_id) REFERENCES users (id)
   ON DELETE CASCADE )"

8. Create a table named "placement":
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

9. Create a table named "marks":
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
   "INSERT INTO users (username, password, user_type) VALUES
('admin', '$2b$10$EZSeCzJCwDeH9xgESBJ4GO8AjDv4mKVG0zUVflHGOlhRn9R88OvH.', 'admin');
" 

2. Department and Faculty table:
   // Without HOD's first: 
   "INSERT INTO department (DeptName)
VALUES
('Computer Science'),
('Information Technology'),
('Leather Technology');

INSERT INTO faculty (Name, Department, Qualifications, ExperienceYears, Email, DeptID)
VALUES
('Dr. Brijesh Shrivastava', 'Computer Science', 'Ph.D. in Computer Science', 15, 'brijesh.shrivastava@college.edu', 1),
('Mr. Falguni Sinhababu', 'Computer Science', 'M.Tech in Computer Science', 8, 'falguni.sinhababu@college.edu', 1),
('Mr. Chhotan Mal', 'Computer Science', 'M.Tech in Computer Science', 6, 'chhotan.mal@college.edu', 1),
('Dr. Debayan Ganguly', 'Computer Science', 'Ph.D. in Computer Science', 12, 'debayan.ganguly@college.edu', 1),
('Dr. Srirupa Dasgupta', 'Information Technology', 'Ph.D. in Information Technology', 10, 'srirupa.dasgupta@college.edu', 2),
('Mr. Ruben Ray', 'Information Technology', 'M.Tech in Information Technology', 5, 'ruben.ray@college.edu', 2),
('Dr. Surjadeep Sarkar', 'Information Technology', 'Ph.D. in IT Systems', 9, 'surjadeep.sarkar@college.edu', 2),
('Dr. Sanjoy Chakraborty', 'Leather Technology', 'Ph.D. in Leather Technology', 14, 'sanjoy.chakraborty@college.edu', 3),
('Dr. Goutam Mukherjee', 'Leather Technology', 'Ph.D. in Leather Science', 18, 'goutam.mukherjee@college.edu', 3); 

UPDATE department SET HeadFacultyID = 1 WHERE DeptID = 1; 
UPDATE department SET HeadFacultyID = 5 WHERE DeptID = 2;
UPDATE department SET HeadFacultyID = 9 WHERE DeptID = 3;" 


