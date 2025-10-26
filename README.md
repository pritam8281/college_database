# College Database Website
## How to make it run in your local server
1. clone the REPO on your local using "git clone https://github.com/pritam8281/college_database.git"
2. run "npm i" in the termminal
3. Give a secret key in the session.
4. In the database connection, give the username of your local database (such as 'root') and the password of the server.
   
## Database setup
1. Create a database named 'college_database'.
    "CREATE DATABASE college_database;"
      "USE college_database;"
2. Create a table named 'users'.
     "CREATE TABLE users (
      id INT NOT NULL AUTO_INCREMENT,
      username VARCHAR(50) NOT NULL,
      password VARCHAR(255) NOT NULL,
      user_type ENUM('admin','student','faculty','staff') NOT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY username (username) 
    );"
3. Create a table named "department"
   "CREATE TABLE department (
  DeptID INT NOT NULL AUTO_INCREMENT,
  DeptName VARCHAR(100) NOT NULL,
  HeadFacultyID INT DEFAULT NULL,
  PRIMARY KEY (DeptID),
  UNIQUE KEY DeptName (DeptName),
  UNIQUE KEY HeadFacultyID (HeadFacultyID)
);"
4. Create a table named "faculty"
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
