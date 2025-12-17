/* Seed: Greg Hall (Primary Care) schedule into dbo.Resource_Scheduler
   Notes:
   - Replace @BuildingId, @FloorId, @RoomId with real GUIDs if available.
   - Set @DayOfWeek (1=Mon .. 5=Fri) as appropriate.
*/

BEGIN TRAN;

DECLARE @ResourceId UNIQUEIDENTIFIER;
SELECT @ResourceId = Id FROM dbo.providers WHERE Name = 'Greg Hall';

DECLARE @BuildingId UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual building GUID
DECLARE @FloorId    UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual floor GUID

-- We need to insert for Exam Room 2, 3, and 4.
-- Since current room lookup is scalar, let's use a cursor or table variable approach or just unrolled inserts for clarity.
-- Unrolled is simplest for fixed logic.

DECLARE @RoomId2 UNIQUEIDENTIFIER;
SELECT @RoomId2 = Id FROM dbo.Rooms WHERE RoomNumber = 'Exam Room: 2';

DECLARE @RoomId3 UNIQUEIDENTIFIER;
SELECT @RoomId3 = Id FROM dbo.Rooms WHERE RoomNumber = 'Exam Room: 3';

DECLARE @RoomId4 UNIQUEIDENTIFIER;
SELECT @RoomId4 = Id FROM dbo.Rooms WHERE RoomNumber = 'Exam Room: 4';

DECLARE @DayOfWeek  TINYINT = 1;                -- Monday

-- Common values
DECLARE @Dept NVARCHAR(50) = N'Primary Care';
DECLARE @Hours NVARCHAR(50) = N'6.45/8';
DECLARE @VisitDur NVARCHAR(50) = N'15/30min';
DECLARE @Slots NVARCHAR(100) = N'09:30-12:00; 12:30-16:45';
DECLARE @WeekOfMonth NVARCHAR(50) = '1,2,3,4,5';

INSERT dbo.Resource_Scheduler (
  Id, resource_type, resource_id, BuildingId, FloorId, Department, ClinicalHours,
  RoomId, DayOfWeek, VisitTypeDurations, SlotTimings, StartTime, EndTime,
  IsProcedures, support_staff, contact_info, admin_supervisor, is_active,
  created_by, modified_by, created, modified, WeekOfMonth
)
-- Exam Room 2
SELECT NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, @Dept, @Hours, @RoomId2, @DayOfWeek, @VisitDur, @Slots, '09:30', '12:00', 0, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), @WeekOfMonth
UNION ALL
SELECT NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, @Dept, @Hours, @RoomId2, @DayOfWeek, @VisitDur, @Slots, '12:30', '16:45', 0, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), @WeekOfMonth
-- Exam Room 3
UNION ALL
SELECT NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, @Dept, @Hours, @RoomId3, @DayOfWeek, @VisitDur, @Slots, '09:30', '12:00', 0, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), @WeekOfMonth
UNION ALL
SELECT NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, @Dept, @Hours, @RoomId3, @DayOfWeek, @VisitDur, @Slots, '12:30', '16:45', 0, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), @WeekOfMonth
-- Exam Room 4
UNION ALL
SELECT NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, @Dept, @Hours, @RoomId4, @DayOfWeek, @VisitDur, @Slots, '09:30', '12:00', 0, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), @WeekOfMonth
UNION ALL
SELECT NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, @Dept, @Hours, @RoomId4, @DayOfWeek, @VisitDur, @Slots, '12:30', '16:45', 0, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), @WeekOfMonth;

COMMIT TRAN;



GO

/* Seed: Adam Nagakura (Primary Care) Tu–Fri schedule into dbo.Resource_Scheduler
   Notes:
   - Replace @BuildingId, @FloorId, @RoomId with real GUIDs if available.
   - Days covered: Tuesday(2), Wednesday(3), Thursday(4), Friday(5)
   - Admin time 17:00–17:40 excluded
*/
BEGIN TRAN;

DECLARE @ResourceId UNIQUEIDENTIFIER;
SELECT @ResourceId = Id FROM dbo.providers WHERE Name = 'Adam Nagakura';

DECLARE @BuildingId UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual building GUID
DECLARE @FloorId    UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual floor GUID

DECLARE @RoomId UNIQUEIDENTIFIER;
SELECT @RoomId = Id FROM dbo.Rooms WHERE RoomNumber = 'Exam Room: 2';

INSERT dbo.Resource_Scheduler (
  Id, resource_type, resource_id, BuildingId, FloorId, Department, ClinicalHours,
  RoomId, DayOfWeek, VisitTypeDurations, SlotTimings, StartTime, EndTime,
  IsProcedures, support_staff, contact_info, admin_supervisor, is_active,
  created_by, modified_by, created, modified, WeekOfMonth
)
SELECT
  NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, N'Primary Care', N'8/8',
  @RoomId, 2, N'20/40min', N'08:00-12:00; 13:00-17:00', '08:00', '12:00',
  0, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), '1,2,3,4,5'
UNION ALL
SELECT
  NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, N'Primary Care', N'8/8',
  @RoomId, 2, N'20/40min', N'08:00-12:00; 13:00-17:00', '13:00', '17:00',
  0, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), '1,2,3,4,5'
UNION ALL
SELECT
  NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, N'Primary Care', N'8/8',
  @RoomId, 3, N'20/40min', N'08:00-12:00; 13:00-17:00', '08:00', '12:00',
  0, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), '1,2,3,4,5'
UNION ALL
SELECT
  NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, N'Primary Care', N'8/8',
  @RoomId, 3, N'20/40min', N'08:00-12:00; 13:00-17:00', '13:00', '17:00',
  0, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), '1,2,3,4,5'
UNION ALL
SELECT
  NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, N'Primary Care', N'8/8',
  @RoomId, 4, N'20/40min', N'08:00-12:00; 13:00-17:00', '08:00', '12:00',
  0, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), '1,2,3,4,5'
UNION ALL
SELECT
  NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, N'Primary Care', N'8/8',
  @RoomId, 4, N'20/40min', N'08:00-12:00; 13:00-17:00', '13:00', '17:00',
  0, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), '1,2,3,4,5'
UNION ALL
SELECT
  NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, N'Primary Care', N'8/8',
  @RoomId, 5, N'20/40min', N'08:00-12:00; 13:00-17:00', '08:00', '12:00',
  0, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), '1,2,3,4,5'
UNION ALL
SELECT
  NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, N'Primary Care', N'8/8',
  @RoomId, 5, N'20/40min', N'08:00-12:00; 13:00-17:00', '13:00', '17:00',
  0, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), '1,2,3,4,5';

COMMIT TRAN;


GO

/* Seed: Adam Nagakura (Primary Care) Tu–Fri schedule for Exam Room 1
   Notes:
   - Identical schedule to Exam Room 2: Week 1-5, Tu-Fri
   - AM: 08:00-12:00, PM: 13:00-17:00
*/
BEGIN TRAN;

DECLARE @ResourceId UNIQUEIDENTIFIER;
SELECT @ResourceId = Id FROM dbo.providers WHERE Name = 'Adam Nagakura';

DECLARE @BuildingId UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual building GUID
DECLARE @FloorId    UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual floor GUID

DECLARE @RoomId UNIQUEIDENTIFIER;
SELECT @RoomId = Id FROM dbo.Rooms WHERE RoomNumber = 'Exam Room: 1';

INSERT dbo.Resource_Scheduler (
  Id, resource_type, resource_id, BuildingId, FloorId, Department, ClinicalHours,
  RoomId, DayOfWeek, VisitTypeDurations, SlotTimings, StartTime, EndTime,
  IsProcedures, support_staff, contact_info, admin_supervisor, is_active,
  created_by, modified_by, created, modified, WeekOfMonth
)
SELECT
  NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, N'Primary Care', N'8/8',
  @RoomId, 2, N'20/40min', N'08:00-12:00; 13:00-17:00', '08:00', '12:00',
  0, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), '1,2,3,4,5'
UNION ALL
SELECT
  NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, N'Primary Care', N'8/8',
  @RoomId, 2, N'20/40min', N'08:00-12:00; 13:00-17:00', '13:00', '17:00',
  0, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), '1,2,3,4,5'
UNION ALL
SELECT
  NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, N'Primary Care', N'8/8',
  @RoomId, 3, N'20/40min', N'08:00-12:00; 13:00-17:00', '08:00', '12:00',
  0, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), '1,2,3,4,5'
UNION ALL
SELECT
  NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, N'Primary Care', N'8/8',
  @RoomId, 3, N'20/40min', N'08:00-12:00; 13:00-17:00', '13:00', '17:00',
  0, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), '1,2,3,4,5'
UNION ALL
SELECT
  NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, N'Primary Care', N'8/8',
  @RoomId, 4, N'20/40min', N'08:00-12:00; 13:00-17:00', '08:00', '12:00',
  0, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), '1,2,3,4,5'
UNION ALL
SELECT
  NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, N'Primary Care', N'8/8',
  @RoomId, 4, N'20/40min', N'08:00-12:00; 13:00-17:00', '13:00', '17:00',
  0, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), '1,2,3,4,5'
UNION ALL
SELECT
  NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, N'Primary Care', N'8/8',
  @RoomId, 5, N'20/40min', N'08:00-12:00; 13:00-17:00', '08:00', '12:00',
  0, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), '1,2,3,4,5'
UNION ALL
SELECT
  NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, N'Primary Care', N'8/8',
  @RoomId, 5, N'20/40min', N'08:00-12:00; 13:00-17:00', '13:00', '17:00',
  0, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), '1,2,3,4,5';

COMMIT TRAN;


GO

/* Seed: Ghayda (Urology) Tu–Thu schedule into dbo.Resource_Scheduler
   Notes:
   - Revised Requirements:
     - Exam Room 3: Tue, Thu (08:00-12:00, 13:00-15:30)
     - Exam Room 4: Tue, Thu (08:00-12:00, 13:00-15:30)
     - Exam Room 5: Tue, Wed, Thu (Tue/Thu same; Wed 08:45-12:00, 13:00-15:30)
   - Week 1-5 for all
*/
BEGIN TRAN;

DECLARE @ResourceId UNIQUEIDENTIFIER;
SELECT @ResourceId = Id FROM dbo.providers WHERE Name = 'Ghayda';

DECLARE @BuildingId UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual building GUID
DECLARE @FloorId    UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual floor GUID

DECLARE @RoomId3 UNIQUEIDENTIFIER;
SELECT @RoomId3 = Id FROM dbo.Rooms WHERE RoomNumber = 'Exam Room: 3';

DECLARE @RoomId4 UNIQUEIDENTIFIER;
SELECT @RoomId4 = Id FROM dbo.Rooms WHERE RoomNumber = 'Exam Room: 4';

DECLARE @RoomId5 UNIQUEIDENTIFIER;
SELECT @RoomId5 = Id FROM dbo.Rooms WHERE RoomNumber = 'Exam Room: 5';

DECLARE @RoomId6 UNIQUEIDENTIFIER;
SELECT @RoomId6 = Id FROM dbo.Rooms WHERE RoomNumber = 'Exam Room: 6';

DECLARE @RoomId7 UNIQUEIDENTIFIER;
SELECT @RoomId7 = Id FROM dbo.Rooms WHERE RoomNumber = 'Exam Room: 7';

-- Common Values
DECLARE @Dept     NVARCHAR(50) = N'Urology';
DECLARE @HoursTueThu NVARCHAR(50) = N'6.5/8';
DECLARE @HoursWed NVARCHAR(50) = N'5.45/8';
DECLARE @VisitDur NVARCHAR(50) = N'15/30min';
DECLARE @SlotsTueThu NVARCHAR(100) = N'08:00-12:00; 13:00-15:30';
DECLARE @SlotsWed    NVARCHAR(100) = N'08:45-12:00; 13:00-15:30';
DECLARE @WeekOfMonth NVARCHAR(50) = '1,2,3,4,5';

INSERT dbo.Resource_Scheduler (
  Id, resource_type, resource_id, BuildingId, FloorId, Department, ClinicalHours,
  RoomId, DayOfWeek, VisitTypeDurations, SlotTimings, StartTime, EndTime,
  IsProcedures, support_staff, contact_info, admin_supervisor, is_active,
  created_by, modified_by, created, modified, WeekOfMonth
)
-- Exam Room 3 (Tue, Thu)
SELECT NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, @Dept, @HoursTueThu, @RoomId3, 2, @VisitDur, @SlotsTueThu, '08:00', '12:00', 1, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), @WeekOfMonth
UNION ALL
SELECT NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, @Dept, @HoursTueThu, @RoomId3, 2, @VisitDur, @SlotsTueThu, '13:00', '15:30', 1, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), @WeekOfMonth
UNION ALL
SELECT NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, @Dept, @HoursTueThu, @RoomId3, 4, @VisitDur, @SlotsTueThu, '08:00', '12:00', 1, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), @WeekOfMonth
UNION ALL
SELECT NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, @Dept, @HoursTueThu, @RoomId3, 4, @VisitDur, @SlotsTueThu, '13:00', '15:30', 1, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), @WeekOfMonth

-- Exam Room 4 (Tue, Thu)
UNION ALL
SELECT NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, @Dept, @HoursTueThu, @RoomId4, 2, @VisitDur, @SlotsTueThu, '08:00', '12:00', 1, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), @WeekOfMonth
UNION ALL
SELECT NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, @Dept, @HoursTueThu, @RoomId4, 2, @VisitDur, @SlotsTueThu, '13:00', '15:30', 1, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), @WeekOfMonth
UNION ALL
SELECT NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, @Dept, @HoursTueThu, @RoomId4, 4, @VisitDur, @SlotsTueThu, '08:00', '12:00', 1, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), @WeekOfMonth
UNION ALL
SELECT NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, @Dept, @HoursTueThu, @RoomId4, 4, @VisitDur, @SlotsTueThu, '13:00', '15:30', 1, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), @WeekOfMonth

-- Exam Room 5 (Tue, Wed, Thu)
-- Tue
UNION ALL
SELECT NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, @Dept, @HoursTueThu, @RoomId5, 2, @VisitDur, @SlotsTueThu, '08:00', '12:00', 1, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), @WeekOfMonth
UNION ALL
SELECT NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, @Dept, @HoursTueThu, @RoomId5, 2, @VisitDur, @SlotsTueThu, '13:00', '15:30', 1, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), @WeekOfMonth
-- Wed (Different hours)
UNION ALL
SELECT NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, @Dept, @HoursWed, @RoomId5, 3, @VisitDur, @SlotsWed, '08:45', '12:00', 1, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), @WeekOfMonth
UNION ALL
SELECT NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, @Dept, @HoursWed, @RoomId5, 3, @VisitDur, @SlotsWed, '13:00', '15:30', 1, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), @WeekOfMonth
-- Thu
UNION ALL
SELECT NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, @Dept, @HoursTueThu, @RoomId5, 4, @VisitDur, @SlotsTueThu, '08:00', '12:00', 1, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), @WeekOfMonth
UNION ALL
SELECT NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, @Dept, @HoursTueThu, @RoomId5, 4, @VisitDur, @SlotsTueThu, '13:00', '15:30', 1, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), @WeekOfMonth

-- Exam Room 6 (Wed, Thu)
UNION ALL
-- Wed
SELECT NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, @Dept, @HoursWed, @RoomId6, 3, @VisitDur, @SlotsWed, '08:45', '12:00', 1, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), @WeekOfMonth
UNION ALL
SELECT NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, @Dept, @HoursWed, @RoomId6, 3, @VisitDur, @SlotsWed, '13:00', '15:30', 1, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), @WeekOfMonth
-- Thu
UNION ALL
SELECT NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, @Dept, @HoursTueThu, @RoomId6, 4, @VisitDur, @SlotsTueThu, '08:00', '12:00', 1, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), @WeekOfMonth
UNION ALL
SELECT NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, @Dept, @HoursTueThu, @RoomId6, 4, @VisitDur, @SlotsTueThu, '13:00', '15:30', 1, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), @WeekOfMonth

-- Exam Room 7 (Wed)
UNION ALL
SELECT NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, @Dept, @HoursWed, @RoomId7, 3, @VisitDur, @SlotsWed, '08:45', '12:00', 1, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), @WeekOfMonth
UNION ALL
SELECT NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, @Dept, @HoursWed, @RoomId7, 3, @VisitDur, @SlotsWed, '13:00', '15:30', 1, NULL, NULL, NULL, 1, NULL, NULL, GETDATE(), GETDATE(), @WeekOfMonth;

COMMIT TRAN;

GO

/* Seed: Goutham Rao (PCI/ Fitter Me) Fri schedule
   Notes:
   - Week 1-5, Friday
   - AM Only (08:00 - 12:00) per "4/4" hours
*/
BEGIN TRAN;

DECLARE @ResourceId UNIQUEIDENTIFIER;
SELECT @ResourceId = Id FROM dbo.providers WHERE Name = 'Goutham Rao';

DECLARE @BuildingId UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual building GUID
DECLARE @FloorId    UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual floor GUID

DECLARE @RoomId3 UNIQUEIDENTIFIER;
SELECT @RoomId3 = Id FROM dbo.Rooms WHERE RoomNumber = 'Exam Room: 3';

DECLARE @RoomId4 UNIQUEIDENTIFIER;
SELECT @RoomId4 = Id FROM dbo.Rooms WHERE RoomNumber = 'Exam Room: 4';

INSERT dbo.Resource_Scheduler (
  Id, resource_type, resource_id, BuildingId, FloorId, Department, ClinicalHours,
  RoomId, DayOfWeek, VisitTypeDurations, SlotTimings, StartTime, EndTime,
  IsProcedures, support_staff, contact_info, admin_supervisor, is_active,
  created_by, modified_by, created, modified, WeekOfMonth
)
SELECT
  NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, N'PCI/ Fitter Me', N'4/4',
  @RoomId3, 5, N'15/30min', N'08:00-12:00', '08:00', '12:00',
  0, NULL, NULL, NULL, 1,
  NULL, NULL, GETDATE(), GETDATE(), '1,2,3,4,5'
UNION ALL
SELECT
  NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, N'PCI/ Fitter Me', N'4/4',
  @RoomId4, 5, N'15/30min', N'08:00-12:00', '08:00', '12:00',
  0, NULL, NULL, NULL, 1,
  NULL, NULL, GETDATE(), GETDATE(), '1,2,3,4,5';

COMMIT TRAN;

GO

/* Seed: Aram Loeb (Urology) M,Th schedule (Week 1)
   Notes:
   - Week 1 - Mon(1), Thu(4)
   - 10/20min visit types
   - Procedures: Yes
   - Hours: 6.5/8 (08:30-12:00, 13:00-16:00)
*/
BEGIN TRAN;

DECLARE @ResourceId UNIQUEIDENTIFIER;
SELECT @ResourceId = Id FROM dbo.providers WHERE Name = 'Loeb, Aram';

DECLARE @BuildingId UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual building GUID
DECLARE @FloorId    UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual floor GUID

DECLARE @RoomId UNIQUEIDENTIFIER;
SELECT @RoomId = Id FROM dbo.Rooms WHERE RoomNumber = 'Exam Room: 3';

DECLARE @Days TABLE (DayOfWeek TINYINT);
INSERT @Days (DayOfWeek) VALUES (1),(4);

DECLARE @Blocks TABLE (StartTime TIME, EndTime TIME);
INSERT @Blocks (StartTime, EndTime) VALUES ('08:30','12:00'), ('13:00','16:00');

INSERT dbo.Resource_Scheduler (
  Id, resource_type, resource_id, BuildingId, FloorId, Department, ClinicalHours,
  RoomId, DayOfWeek, VisitTypeDurations, SlotTimings, StartTime, EndTime,
  IsProcedures, support_staff, contact_info, admin_supervisor, is_active,
  created_by, modified_by, created, modified, WeekOfMonth
)
SELECT
  NEWID()                                AS Id,
  N'Provider'                            AS resource_type,
  @ResourceId                            AS resource_id,
  @BuildingId                            AS BuildingId,
  @FloorId                               AS FloorId,
  N'Urology'                             AS Department,
  N'6.5/8'                               AS ClinicalHours,
  @RoomId                                AS RoomId,
  d.DayOfWeek                            AS DayOfWeek,
  N'10/20min'                            AS VisitTypeDurations,
  N'08:30-12:00; 13:00-16:00'            AS SlotTimings,
  b.StartTime                            AS StartTime,
  b.EndTime                              AS EndTime,
  1                                      AS IsProcedures,
  NULL                                   AS support_staff,
  NULL                                   AS contact_info,
  NULL                                   AS admin_supervisor,
  1                                      AS is_active,
  NULL                                   AS created_by,
  NULL                                   AS modified_by,
  GETDATE()                              AS created,
  GETDATE()                              AS modified,
  '1'                                    AS WeekOfMonth
FROM @Days d
CROSS JOIN @Blocks b;

COMMIT TRAN;

GO

/* Seed: Aram Loeb (Urology) Friday schedule (Week 1)
   Notes:
   - Week 1 - Fri(5)
   - AM Only (08:30-11:30) = 3 hours
   - PM Session Available/Open (not seeded)
   - Procedures: Yes (Vasectomy/Procedure day)
*/
BEGIN TRAN;

DECLARE @ResourceId UNIQUEIDENTIFIER;
SELECT @ResourceId = Id FROM dbo.providers WHERE Name = 'Loeb, Aram';

DECLARE @BuildingId UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual building GUID
DECLARE @FloorId    UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual floor GUID

DECLARE @RoomId UNIQUEIDENTIFIER;
SELECT @RoomId = Id FROM dbo.Rooms WHERE RoomNumber = 'Exam Room: 3';

INSERT dbo.Resource_Scheduler (
  Id, resource_type, resource_id, BuildingId, FloorId, Department, ClinicalHours,
  RoomId, DayOfWeek, VisitTypeDurations, SlotTimings, StartTime, EndTime,
  IsProcedures, support_staff, contact_info, admin_supervisor, is_active,
  created_by, modified_by, created, modified, WeekOfMonth
) VALUES (
  NEWID(), N'Provider', @ResourceId, @BuildingId, @FloorId, N'Urology', N'3',
  @RoomId, 5, N'10/20min', N'08:30-11:30', '08:30', '11:30',
  1, NULL, NULL, NULL, 1,
  NULL, NULL, GETDATE(), GETDATE(), '1'
);

COMMIT TRAN;

GO

/* Seed: Aram Loeb (Urology) Tuesday schedule (Week 1 & 5)
   Notes:
   - Week 1 & 5 - Tue(2)
   - Exam Room: 2
   - 10/20min visit types
   - Procedures: Yes
   - Hours: 6.5/8 (08:30-12:00, 13:00-16:00)
*/
BEGIN TRAN;

DECLARE @ResourceId UNIQUEIDENTIFIER;
SELECT @ResourceId = Id FROM dbo.providers WHERE Name = 'Loeb, Aram';

DECLARE @BuildingId UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual building GUID
DECLARE @FloorId    UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual floor GUID

DECLARE @RoomId UNIQUEIDENTIFIER;
SELECT @RoomId = Id FROM dbo.Rooms WHERE RoomNumber = 'Exam Room: 2';

DECLARE @Blocks TABLE (StartTime TIME, EndTime TIME);
INSERT @Blocks (StartTime, EndTime) VALUES ('08:30','12:00'), ('13:00','16:00');

INSERT dbo.Resource_Scheduler (
  Id, resource_type, resource_id, BuildingId, FloorId, Department, ClinicalHours,
  RoomId, DayOfWeek, VisitTypeDurations, SlotTimings, StartTime, EndTime,
  IsProcedures, support_staff, contact_info, admin_supervisor, is_active,
  created_by, modified_by, created, modified, WeekOfMonth
)
SELECT
  NEWID()                                AS Id,
  N'Provider'                            AS resource_type,
  @ResourceId                            AS resource_id,
  @BuildingId                            AS BuildingId,
  @FloorId                               AS FloorId,
  N'Urology'                             AS Department,
  N'6.5/8'                               AS ClinicalHours,
  @RoomId                                AS RoomId,
  2                                      AS DayOfWeek,
  N'10/20min'                            AS VisitTypeDurations,
  N'08:30-12:00; 13:00-16:00'            AS SlotTimings,
  b.StartTime                            AS StartTime,
  b.EndTime                              AS EndTime,
  1                                      AS IsProcedures,
  NULL                                   AS support_staff,
  NULL                                   AS contact_info,
  NULL                                   AS admin_supervisor,
  1                                      AS is_active,
  NULL                                   AS created_by,
  NULL                                   AS modified_by,
  GETDATE()                              AS created,
  GETDATE()                              AS modified,
  '1,5'                                  AS WeekOfMonth
FROM @Blocks b;

COMMIT TRAN;

GO

/* Seed: Julie (Urology - APP) M,Tu,Wed,Fri schedule
   Notes:
   - Week 1-5 - M(1), Tu(2), Wed(3), Fri(5)
   - Exam Room: 2
   - 10/20min visit types
   - Procedures: Yes
   - Hours: 6/8
   - AM: 08:40-12:00
   - PM: 13:00-15:40
   - Admin: 15:40-16:00 (excluded from slots)
*/
BEGIN TRAN;

DECLARE @ResourceId UNIQUEIDENTIFIER;
-- Searching for Julie. Using LIKE to match "Julie [LastName]" if exists.
SELECT @ResourceId = Id FROM dbo.providers WHERE Name LIKE 'Julie%';

DECLARE @BuildingId UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual building GUID
DECLARE @FloorId    UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual floor GUID

DECLARE @RoomId UNIQUEIDENTIFIER;
SELECT @RoomId = Id FROM dbo.Rooms WHERE RoomNumber = 'Exam Room: 2';

DECLARE @Days TABLE (DayOfWeek TINYINT);
INSERT @Days (DayOfWeek) VALUES (1),(2),(3),(5);

DECLARE @Blocks TABLE (StartTime TIME, EndTime TIME);
INSERT @Blocks (StartTime, EndTime) VALUES ('08:40','12:00'), ('13:00','15:40');

INSERT dbo.Resource_Scheduler (
  Id, resource_type, resource_id, BuildingId, FloorId, Department, ClinicalHours,
  RoomId, DayOfWeek, VisitTypeDurations, SlotTimings, StartTime, EndTime,
  IsProcedures, support_staff, contact_info, admin_supervisor, is_active,
  created_by, modified_by, created, modified, WeekOfMonth
)
SELECT
  NEWID()                                AS Id,
  N'Provider'                            AS resource_type,
  @ResourceId                            AS resource_id,
  @BuildingId                            AS BuildingId,
  @FloorId                               AS FloorId,
  N'Urology - APP'                       AS Department,
  N'6/8'                                 AS ClinicalHours,
  @RoomId                                AS RoomId,
  d.DayOfWeek                            AS DayOfWeek,
  N'10/20min'                            AS VisitTypeDurations,
  N'08:40-12:00; 13:00-15:40'            AS SlotTimings,
  b.StartTime                            AS StartTime,
  b.EndTime                              AS EndTime,
  1                                      AS IsProcedures,
  NULL                                   AS support_staff,
  NULL                                   AS contact_info,
  NULL                                   AS admin_supervisor,
  1                                      AS is_active,
  NULL                                   AS created_by,
  NULL                                   AS modified_by,
  GETDATE()                              AS created,
  GETDATE()                              AS modified,
  '1,2,3,4,5'                            AS WeekOfMonth
FROM @Days d
CROSS JOIN @Blocks b;

COMMIT TRAN;

GO

/* Seed: Thirumavalavan (Urology) Monday schedule
   Notes:
   - Week 1-5 - Mon(1)
   - Exam Room: 3
   - 10/20min visit types
   - Procedures: Yes
   - Hours: 6/8
   - AM: 08:30-11:30
   - PM: 13:00-16:00
*/
BEGIN TRAN;

DECLARE @ResourceId UNIQUEIDENTIFIER;
-- Searching for Thirumavalavan. Using LIKE.
SELECT @ResourceId = Id FROM dbo.providers WHERE Name LIKE 'Thirumavalavan%';

DECLARE @BuildingId UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual building GUID
DECLARE @FloorId    UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual floor GUID

DECLARE @RoomId UNIQUEIDENTIFIER;
SELECT @RoomId = Id FROM dbo.Rooms WHERE RoomNumber = 'Exam Room: 3';

DECLARE @Days TABLE (DayOfWeek TINYINT);
INSERT @Days (DayOfWeek) VALUES (1);

DECLARE @Blocks TABLE (StartTime TIME, EndTime TIME);
INSERT @Blocks (StartTime, EndTime) VALUES ('08:30','11:30'), ('13:00','16:00');

INSERT dbo.Resource_Scheduler (
  Id, resource_type, resource_id, BuildingId, FloorId, Department, ClinicalHours,
  RoomId, DayOfWeek, VisitTypeDurations, SlotTimings, StartTime, EndTime,
  IsProcedures, support_staff, contact_info, admin_supervisor, is_active,
  created_by, modified_by, created, modified, WeekOfMonth
)
SELECT
  NEWID()                                AS Id,
  N'Provider'                            AS resource_type,
  @ResourceId                            AS resource_id,
  @BuildingId                            AS BuildingId,
  @FloorId                               AS FloorId,
  N'Urology'                             AS Department,
  N'6/8'                                 AS ClinicalHours,
  @RoomId                                AS RoomId,
  d.DayOfWeek                            AS DayOfWeek,
  N'10/20min'                            AS VisitTypeDurations,
  N'08:30-11:30; 13:00-16:00'            AS SlotTimings,
  b.StartTime                            AS StartTime,
  b.EndTime                              AS EndTime,
  1                                      AS IsProcedures,
  NULL                                   AS support_staff,
  NULL                                   AS contact_info,
  NULL                                   AS admin_supervisor,
  1                                      AS is_active,
  NULL                                   AS created_by,
  NULL                                   AS modified_by,
  GETDATE()                              AS created,
  GETDATE()                              AS modified,
  '1,2,3,4,5'                            AS WeekOfMonth
FROM @Days d
CROSS JOIN @Blocks b;

COMMIT TRAN;

GO

/* Seed: Parks Jefferey (General Surgery) Tuesday schedule
   Notes:
   - Week 1-5 - Tue(2)
   - Exam Room: 3
   - 15/30min visit types
   - Procedures: No
   - Hours: 5.5/8
   - AM: 08:30-11:45 (3.15h)
   - PM: 13:30-15:45 (2.15h)
   - Note: 11:45-12:00 and 15:45-16:00 are 'Provider Requested' (excluded)
*/
BEGIN TRAN;

DECLARE @ResourceId UNIQUEIDENTIFIER;
-- Searching for Parks Jefferey. Using LIKE.
SELECT @ResourceId = Id FROM dbo.providers WHERE Name LIKE 'Parks Jefferey%';

DECLARE @BuildingId UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual building GUID
DECLARE @FloorId    UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual floor GUID

DECLARE @RoomId UNIQUEIDENTIFIER;
SELECT @RoomId = Id FROM dbo.Rooms WHERE RoomNumber = 'Exam Room: 3';

DECLARE @Days TABLE (DayOfWeek TINYINT);
INSERT @Days (DayOfWeek) VALUES (2);

DECLARE @Blocks TABLE (StartTime TIME, EndTime TIME);
INSERT @Blocks (StartTime, EndTime) VALUES ('08:30','11:45'), ('13:30','15:45');

INSERT dbo.Resource_Scheduler (
  Id, resource_type, resource_id, BuildingId, FloorId, Department, ClinicalHours,
  RoomId, DayOfWeek, VisitTypeDurations, SlotTimings, StartTime, EndTime,
  IsProcedures, support_staff, contact_info, admin_supervisor, is_active,
  created_by, modified_by, created, modified, WeekOfMonth
)
SELECT
  NEWID()                                AS Id,
  N'Provider'                            AS resource_type,
  @ResourceId                            AS resource_id,
  @BuildingId                            AS BuildingId,
  @FloorId                               AS FloorId,
  N'General Surgery'                     AS Department,
  N'5.5/8'                               AS ClinicalHours,
  @RoomId                                AS RoomId,
  d.DayOfWeek                            AS DayOfWeek,
  N'15/30min'                            AS VisitTypeDurations,
  N'08:30-11:45; 13:30-15:45'            AS SlotTimings,
  b.StartTime                            AS StartTime,
  b.EndTime                              AS EndTime,
  0                                      AS IsProcedures,
  NULL                                   AS support_staff,
  NULL                                   AS contact_info,
  NULL                                   AS admin_supervisor,
  1                                      AS is_active,
  NULL                                   AS created_by,
  NULL                                   AS modified_by,
  GETDATE()                              AS created,
  GETDATE()                              AS modified,
  '1,2,3,4,5'                            AS WeekOfMonth
FROM @Days d
CROSS JOIN @Blocks b;

COMMIT TRAN;

GO

/* Seed: Michael Zell (Urology) Wed, Thu schedule
   Notes:
   - Week 1 - Wed(3), Thu(4)
   - Exam Room: 3
   - 10/20min visit types
   - Procedures: Yes
   - Hours: 7/8
   - AM: 08:00-12:00
   - PM: 13:00-16:00
*/
BEGIN TRAN;

DECLARE @ResourceId UNIQUEIDENTIFIER;
-- Searching for Michael Zell. Using LIKE.
SELECT @ResourceId = Id FROM dbo.providers WHERE Name LIKE 'Michael Zell%';

DECLARE @BuildingId UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual building GUID
DECLARE @FloorId    UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual floor GUID

DECLARE @RoomId UNIQUEIDENTIFIER;
SELECT @RoomId = Id FROM dbo.Rooms WHERE RoomNumber = 'Exam Room: 3';

DECLARE @Days TABLE (DayOfWeek TINYINT);
INSERT @Days (DayOfWeek) VALUES (3),(4);

DECLARE @Blocks TABLE (StartTime TIME, EndTime TIME);
INSERT @Blocks (StartTime, EndTime) VALUES ('08:00','12:00'), ('13:00','16:00');

INSERT dbo.Resource_Scheduler (
  Id, resource_type, resource_id, BuildingId, FloorId, Department, ClinicalHours,
  RoomId, DayOfWeek, VisitTypeDurations, SlotTimings, StartTime, EndTime,
  IsProcedures, support_staff, contact_info, admin_supervisor, is_active,
  created_by, modified_by, created, modified, WeekOfMonth
)
SELECT
  NEWID()                                AS Id,
  N'Provider'                            AS resource_type,
  @ResourceId                            AS resource_id,
  @BuildingId                            AS BuildingId,
  @FloorId                               AS FloorId,
  N'Urology'                             AS Department,
  N'7/8'                                 AS ClinicalHours,
  @RoomId                                AS RoomId,
  d.DayOfWeek                            AS DayOfWeek,
  N'10/20min'                            AS VisitTypeDurations,
  N'08:00-12:00; 13:00-16:00'            AS SlotTimings,
  b.StartTime                            AS StartTime,
  b.EndTime                              AS EndTime,
  1                                      AS IsProcedures,
  NULL                                   AS support_staff,
  NULL                                   AS contact_info,
  NULL                                   AS admin_supervisor,
  1                                      AS is_active,
  NULL                                   AS created_by,
  NULL                                   AS modified_by,
  GETDATE()                              AS created,
  GETDATE()                              AS modified,
  '1'                                    AS WeekOfMonth
FROM @Days d
CROSS JOIN @Blocks b;

COMMIT TRAN;

GO

/* Seed: Jenna (Gastroenterology) Tuesday schedule
   Notes:
   - Week 1-5 - Tue(2)
   - Exam Room: 2
   - 20/40min visit types
   - Procedures: No
   - Hours: 6/8
   - AM: 08:40-12:00
   - PM: 13:00-15:40
*/
BEGIN TRAN;

DECLARE @ResourceId UNIQUEIDENTIFIER;
SELECT @ResourceId = Id FROM dbo.providers WHERE Name LIKE 'Jenna%';

DECLARE @BuildingId UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual building GUID
DECLARE @FloorId    UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual floor GUID

DECLARE @RoomId UNIQUEIDENTIFIER;
SELECT @RoomId = Id FROM dbo.Rooms WHERE RoomNumber = 'Exam Room: 2';

DECLARE @Days TABLE (DayOfWeek TINYINT);
INSERT @Days (DayOfWeek) VALUES (2);

DECLARE @Blocks TABLE (StartTime TIME, EndTime TIME);
INSERT @Blocks (StartTime, EndTime) VALUES ('08:40','12:00'), ('13:00','15:40');

INSERT dbo.Resource_Scheduler (
  Id, resource_type, resource_id, BuildingId, FloorId, Department, ClinicalHours,
  RoomId, DayOfWeek, VisitTypeDurations, SlotTimings, StartTime, EndTime,
  IsProcedures, support_staff, contact_info, admin_supervisor, is_active,
  created_by, modified_by, created, modified, WeekOfMonth
)
SELECT
  NEWID()                                AS Id,
  N'Provider'                            AS resource_type,
  @ResourceId                            AS resource_id,
  @BuildingId                            AS BuildingId,
  @FloorId                               AS FloorId,
  N'DHI/Gastroenterology'                AS Department,
  N'6/8'                                 AS ClinicalHours,
  @RoomId                                AS RoomId,
  d.DayOfWeek                            AS DayOfWeek,
  N'20/40min'                            AS VisitTypeDurations,
  N'08:40-12:00; 13:00-15:40'            AS SlotTimings,
  b.StartTime                            AS StartTime,
  b.EndTime                              AS EndTime,
  0                                      AS IsProcedures,
  NULL                                   AS support_staff,
  NULL                                   AS contact_info,
  NULL                                   AS admin_supervisor,
  1                                      AS is_active,
  NULL                                   AS created_by,
  NULL                                   AS modified_by,
  GETDATE()                              AS created,
  GETDATE()                              AS modified,
  '1,2,3,4,5'                            AS WeekOfMonth
FROM @Days d
CROSS JOIN @Blocks b;

COMMIT TRAN;

GO

/* Seed: Salvada Jose (Urology/Stone) Wednesday schedule
   Notes:
   - Week 1-5 - Wed(3)
   - Exam Room: 2
   - 15/30min visit types
   - Procedures: Yes
   - Hours: 7/8
   - AM: 08:00-12:00
   - PM: 13:00-16:00
   - Stone Clinic During PM Session (3 part visit)
*/
BEGIN TRAN;

DECLARE @ResourceId UNIQUEIDENTIFIER;
SELECT @ResourceId = Id FROM dbo.providers WHERE Name LIKE 'Salvada Jose%';

DECLARE @BuildingId UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual building GUID
DECLARE @FloorId    UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual floor GUID

DECLARE @RoomId UNIQUEIDENTIFIER;
SELECT @RoomId = Id FROM dbo.Rooms WHERE RoomNumber = 'Exam Room: 2';

DECLARE @Days TABLE (DayOfWeek TINYINT);
INSERT @Days (DayOfWeek) VALUES (3);

DECLARE @Blocks TABLE (StartTime TIME, EndTime TIME);
INSERT @Blocks (StartTime, EndTime) VALUES ('08:00','12:00'), ('13:00','16:00');

INSERT dbo.Resource_Scheduler (
  Id, resource_type, resource_id, BuildingId, FloorId, Department, ClinicalHours,
  RoomId, DayOfWeek, VisitTypeDurations, SlotTimings, StartTime, EndTime,
  IsProcedures, support_staff, contact_info, admin_supervisor, is_active,
  created_by, modified_by, created, modified, WeekOfMonth
)
SELECT
  NEWID()                                AS Id,
  N'Provider'                            AS resource_type,
  @ResourceId                            AS resource_id,
  @BuildingId                            AS BuildingId,
  @FloorId                               AS FloorId,
  N'Urology/Stone'                       AS Department,
  N'7/8'                                 AS ClinicalHours,
  @RoomId                                AS RoomId,
  d.DayOfWeek                            AS DayOfWeek,
  N'15/30min'                            AS VisitTypeDurations,
  N'08:00-12:00; 13:00-16:00'            AS SlotTimings,
  b.StartTime                            AS StartTime,
  b.EndTime                              AS EndTime,
  1                                      AS IsProcedures,
  NULL                                   AS support_staff,
  NULL                                   AS contact_info,
  NULL                                   AS admin_supervisor,
  1                                      AS is_active,
  NULL                                   AS created_by,
  NULL                                   AS modified_by,
  GETDATE()                              AS created,
  GETDATE()                              AS modified,
  '1,2,3,4,5'                            AS WeekOfMonth
FROM @Days d
CROSS JOIN @Blocks b;

COMMIT TRAN;

GO

/* Seed: Lee, Ponsky (Urology) Thu, Fri schedule
   Notes:
   - Week 1-5 - Thu(4), Fri(5)
   - Exam Room: 3
   - 10/20min visit types
   - Procedures: Yes
   - Hours: 6.5/8
   - AM: 09:00-12:00
   - PM: 13:00-16:00
*/
BEGIN TRAN;

DECLARE @ResourceId UNIQUEIDENTIFIER;
-- Assuming 'Lee, Ponsky' means Last=Lee, First=Ponsky or vice versa?
-- Often listed as "Last, First". So maybe last name Lee, first name Ponsky.
-- Or Last name Ponsky, First name Lee.
-- Searching broadly for Ponsky.
SELECT @ResourceId = Id FROM dbo.providers WHERE Name LIKE '%Ponsky%';

DECLARE @BuildingId UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual building GUID
DECLARE @FloorId    UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual floor GUID

DECLARE @RoomId UNIQUEIDENTIFIER;
SELECT @RoomId = Id FROM dbo.Rooms WHERE RoomNumber = 'Exam Room: 3';

DECLARE @Days TABLE (DayOfWeek TINYINT);
INSERT @Days (DayOfWeek) VALUES (4),(5);

DECLARE @Blocks TABLE (StartTime TIME, EndTime TIME);
INSERT @Blocks (StartTime, EndTime) VALUES ('09:00','12:00'), ('13:00','16:00');

INSERT dbo.Resource_Scheduler (
  Id, resource_type, resource_id, BuildingId, FloorId, Department, ClinicalHours,
  RoomId, DayOfWeek, VisitTypeDurations, SlotTimings, StartTime, EndTime,
  IsProcedures, support_staff, contact_info, admin_supervisor, is_active,
  created_by, modified_by, created, modified, WeekOfMonth
)
SELECT
  NEWID()                                AS Id,
  N'Provider'                            AS resource_type,
  @ResourceId                            AS resource_id,
  @BuildingId                            AS BuildingId,
  @FloorId                               AS FloorId,
  N'Urology'                             AS Department,
  N'6.5/8'                               AS ClinicalHours,
  @RoomId                                AS RoomId,
  d.DayOfWeek                            AS DayOfWeek,
  N'10/20min'                            AS VisitTypeDurations,
  N'09:00-12:00; 13:00-16:00'            AS SlotTimings,
  b.StartTime                            AS StartTime,
  b.EndTime                              AS EndTime,
  1                                      AS IsProcedures,
  NULL                                   AS support_staff,
  NULL                                   AS contact_info,
  NULL                                   AS admin_supervisor,
  1                                      AS is_active,
  NULL                                   AS created_by,
  NULL                                   AS modified_by,
  GETDATE()                              AS created,
  GETDATE()                              AS modified,
  '1,2,3,4,5'                            AS WeekOfMonth
FROM @Days d
CROSS JOIN @Blocks b;

COMMIT TRAN;

GO

/* Seed: KoehlerMichael (Gastroenterology) Tuesday schedule
   Notes:
   - Week 1-5 - Tue(2)
   - Exam Room: 2
   - 15/30min visit types
   - Procedures: No
   - Hours: 5.15/8
   - AM: 09:00-11:45
   - PM: 13:00-15:45
*/
BEGIN TRAN;

DECLARE @ResourceId UNIQUEIDENTIFIER;
-- Searching for KoehlerMichael. Using LIKE.
SELECT @ResourceId = Id FROM dbo.providers WHERE Name LIKE '%Koehler%';

DECLARE @BuildingId UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual building GUID
DECLARE @FloorId    UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual floor GUID

DECLARE @RoomId UNIQUEIDENTIFIER;
SELECT @RoomId = Id FROM dbo.Rooms WHERE RoomNumber = 'Exam Room: 2';

DECLARE @Days TABLE (DayOfWeek TINYINT);
INSERT @Days (DayOfWeek) VALUES (2);

DECLARE @Blocks TABLE (StartTime TIME, EndTime TIME);
INSERT @Blocks (StartTime, EndTime) VALUES ('09:00','11:45'), ('13:00','15:45');

INSERT dbo.Resource_Scheduler (
  Id, resource_type, resource_id, BuildingId, FloorId, Department, ClinicalHours,
  RoomId, DayOfWeek, VisitTypeDurations, SlotTimings, StartTime, EndTime,
  IsProcedures, support_staff, contact_info, admin_supervisor, is_active,
  created_by, modified_by, created, modified, WeekOfMonth
)
SELECT
  NEWID()                                AS Id,
  N'Provider'                            AS resource_type,
  @ResourceId                            AS resource_id,
  @BuildingId                            AS BuildingId,
  @FloorId                               AS FloorId,
  N'Gastroenterology'                    AS Department,
  N'5.15/8'                              AS ClinicalHours,
  @RoomId                                AS RoomId,
  d.DayOfWeek                            AS DayOfWeek,
  N'15/30min'                            AS VisitTypeDurations,
  N'09:00-11:45; 13:00-15:45'            AS SlotTimings,
  b.StartTime                            AS StartTime,
  b.EndTime                              AS EndTime,
  0                                      AS IsProcedures,
  NULL                                   AS support_staff,
  NULL                                   AS contact_info,
  NULL                                   AS admin_supervisor,
  1                                      AS is_active,
  NULL                                   AS created_by,
  NULL                                   AS modified_by,
  GETDATE()                              AS created,
  GETDATE()                              AS modified,
  '1,2,3,4,5'                            AS WeekOfMonth
FROM @Days d
CROSS JOIN @Blocks b;

COMMIT TRAN;

GO

/* Seed: Vince, Randy (Urology) Monday schedule
   Notes:
   - Week 1 - Mon(1)
   - Exam Room: 3
   - 10/20min visit types
   - Procedures: Yes
   - Hours: 6.5/8
   - AM: 08:30-12:00
   - PM: 13:00-16:00
*/
BEGIN TRAN;

DECLARE @ResourceId UNIQUEIDENTIFIER;
-- Searching for Vince, Randy. Using LIKE.
SELECT @ResourceId = Id FROM dbo.providers WHERE Name LIKE 'Vince, Randy%';

DECLARE @BuildingId UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual building GUID
DECLARE @FloorId    UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual floor GUID

DECLARE @RoomId UNIQUEIDENTIFIER;
SELECT @RoomId = Id FROM dbo.Rooms WHERE RoomNumber = 'Exam Room: 3';

DECLARE @Days TABLE (DayOfWeek TINYINT);
INSERT @Days (DayOfWeek) VALUES (1);

DECLARE @Blocks TABLE (StartTime TIME, EndTime TIME);
INSERT @Blocks (StartTime, EndTime) VALUES ('08:30','12:00'), ('13:00','16:00');

INSERT dbo.Resource_Scheduler (
  Id, resource_type, resource_id, BuildingId, FloorId, Department, ClinicalHours,
  RoomId, DayOfWeek, VisitTypeDurations, SlotTimings, StartTime, EndTime,
  IsProcedures, support_staff, contact_info, admin_supervisor, is_active,
  created_by, modified_by, created, modified, WeekOfMonth
)
SELECT
  NEWID()                                AS Id,
  N'Provider'                            AS resource_type,
  @ResourceId                            AS resource_id,
  @BuildingId                            AS BuildingId,
  @FloorId                               AS FloorId,
  N'Urology'                             AS Department,
  N'6.5/8'                               AS ClinicalHours,
  @RoomId                                AS RoomId,
  d.DayOfWeek                            AS DayOfWeek,
  N'10/20min'                            AS VisitTypeDurations,
  N'08:30-12:00; 13:00-16:00'            AS SlotTimings,
  b.StartTime                            AS StartTime,
  b.EndTime                              AS EndTime,
  1                                      AS IsProcedures,
  NULL                                   AS support_staff,
  NULL                                   AS contact_info,
  NULL                                   AS admin_supervisor,
  1                                      AS is_active,
  NULL                                   AS created_by,
  NULL                                   AS modified_by,
  GETDATE()                              AS created,
  GETDATE()                              AS modified,
  '1'                                    AS WeekOfMonth
FROM @Days d
CROSS JOIN @Blocks b;

COMMIT TRAN;

GO

/* Seed: Dan Simon (Cardiology) Monday (Week 2 & 4) schedule
   Notes:
   - Week 2 & 4 - Mon(1)
   - Consult Room: 1
   - 30min visit types
   - Procedures: No
   - Hours: 1.5/8
   - AM: 09:15-10:45
   - PM: Available/Open (not seeded)
*/
BEGIN TRAN;

DECLARE @ResourceId UNIQUEIDENTIFIER;
-- Searching for Dan Simon. Using LIKE.
SELECT @ResourceId = Id FROM dbo.providers WHERE Name LIKE 'Dan Simon%';

DECLARE @BuildingId UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual building GUID
DECLARE @FloorId    UNIQUEIDENTIFIER = NEWID(); -- TODO: replace with actual floor GUID

DECLARE @RoomId UNIQUEIDENTIFIER;
SELECT @RoomId = Id FROM dbo.Rooms WHERE RoomNumber = 'Consult Room: 1';

DECLARE @Days TABLE (DayOfWeek TINYINT);
INSERT @Days (DayOfWeek) VALUES (1);

DECLARE @Blocks TABLE (StartTime TIME, EndTime TIME);
INSERT @Blocks (StartTime, EndTime) VALUES ('09:15','10:45');

INSERT dbo.Resource_Scheduler (
  Id, resource_type, resource_id, BuildingId, FloorId, Department, ClinicalHours,
  RoomId, DayOfWeek, VisitTypeDurations, SlotTimings, StartTime, EndTime,
  IsProcedures, support_staff, contact_info, admin_supervisor, is_active,
  created_by, modified_by, created, modified, WeekOfMonth
)
SELECT
  NEWID()                                AS Id,
  N'Provider'                            AS resource_type,
  @ResourceId                            AS resource_id,
  @BuildingId                            AS BuildingId,
  @FloorId                               AS FloorId,
  N'Cardiology'                          AS Department,
  N'1.5/8'                               AS ClinicalHours,
  @RoomId                                AS RoomId,
  d.DayOfWeek                            AS DayOfWeek,
  N'30min'                               AS VisitTypeDurations,
  N'09:15-10:45'                         AS SlotTimings,
  b.StartTime                            AS StartTime,
  b.EndTime                              AS EndTime,
  0                                      AS IsProcedures,
  NULL                                   AS support_staff,
  NULL                                   AS contact_info,
  NULL                                   AS admin_supervisor,
  1                                      AS is_active,
  NULL                                   AS created_by,
  NULL                                   AS modified_by,
  GETDATE()                              AS created,
  GETDATE()                              AS modified,
  '2,4'                                  AS WeekOfMonth
FROM @Days d
CROSS JOIN @Blocks b;

COMMIT TRAN;
