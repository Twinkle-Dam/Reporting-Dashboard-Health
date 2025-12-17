-- Database: ReportingDB
-- Core tables and indexes for utilization reporting

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'dbo') EXEC ('CREATE SCHEMA dbo');
GO

-- Buildings
IF OBJECT_ID('dbo.Buildings', 'U') IS NULL
CREATE TABLE dbo.Buildings (
  Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
  Name NVARCHAR(200) NOT NULL,
  Campus NVARCHAR(100) NULL,
  City NVARCHAR(100) NULL,
  Floors INT NOT NULL DEFAULT(5)
);
GO

-- Rooms
IF OBJECT_ID('dbo.Rooms', 'U') IS NULL
CREATE TABLE dbo.Rooms (
  Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
  BuildingId UNIQUEIDENTIFIER NOT NULL,
  Floor INT NOT NULL,
  RoomNumber NVARCHAR(50) NOT NULL,
  CONSTRAINT FK_Rooms_Buildings FOREIGN KEY (BuildingId) REFERENCES dbo.Buildings(Id)
);
GO

-- Daily utilization facts (percentages 0..100)
IF OBJECT_ID('dbo.Utilization', 'U') IS NULL
CREATE TABLE dbo.Utilization (
  Id BIGINT IDENTITY(1,1) PRIMARY KEY,
  RoomId UNIQUEIDENTIFIER NOT NULL,
  UsageDate DATE NOT NULL,
  PercentUtilization DECIMAL(5,2) NOT NULL,
  CONSTRAINT FK_Util_Rooms FOREIGN KEY (RoomId) REFERENCES dbo.Rooms(Id),
  INDEX IX_Util_Room_Date NONCLUSTERED (RoomId, UsageDate)
);
GO

-- Doctors and schedules (optional for popup details)
IF OBJECT_ID('dbo.Doctors', 'U') IS NULL
CREATE TABLE dbo.Doctors (
  Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
  Name NVARCHAR(150) NOT NULL,
  Department NVARCHAR(150) NULL
);
GO

IF OBJECT_ID('dbo.DoctorSchedules', 'U') IS NULL
CREATE TABLE dbo.DoctorSchedules (
  Id BIGINT IDENTITY(1,1) PRIMARY KEY,
  DoctorId UNIQUEIDENTIFIER NOT NULL,
  BuildingId UNIQUEIDENTIFIER NOT NULL,
  Floor INT NOT NULL,
  RoomNumber NVARCHAR(50) NOT NULL,
  DayOfWeek TINYINT NOT NULL, -- 1=Mon .. 5=Fri
  StartTime TIME NOT NULL,
  EndTime TIME NOT NULL,
  CONSTRAINT FK_Sched_Doctor FOREIGN KEY (DoctorId) REFERENCES dbo.Doctors(Id),
  CONSTRAINT FK_Sched_Building FOREIGN KEY (BuildingId) REFERENCES dbo.Buildings(Id)
);
GO

-- Resource Scheduler
IF OBJECT_ID('dbo.Resource_Scheduler', 'U') IS NULL
CREATE TABLE dbo.Resource_Scheduler (
  Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
  resource_type NVARCHAR(100),
  resource_id UNIQUEIDENTIFIER,
  BuildingId UNIQUEIDENTIFIER,
  FloorId UNIQUEIDENTIFIER,
  Department NVARCHAR(150),
  ClinicalHours NVARCHAR(100),
  RoomId UNIQUEIDENTIFIER,
  DayOfWeek TINYINT,
  VisitTypeDurations NVARCHAR(200),
  SlotTimings NVARCHAR(MAX),
  StartTime TIME,
  EndTime TIME,
  IsProcedures BIT,
  support_staff NVARCHAR(MAX),
  contact_info NVARCHAR(MAX),
  admin_supervisor NVARCHAR(150),
  is_active BIT DEFAULT 1,
  created_by NVARCHAR(150),
  modified_by NVARCHAR(150),
  created DATETIME DEFAULT GETDATE(),
  modified DATETIME DEFAULT GETDATE(),
  WeekOfMonth NVARCHAR(50)
);
GO


