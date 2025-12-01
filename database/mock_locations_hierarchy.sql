/* 
  Recursive hierarchy for City → Campus → Building → Floor
  Populated to match the mock data used by the React app (src/data/buildings.js).

  Usage:
    - Run this whole script in SQL Server (SSMS or Azure Data Studio).
    - It DROPs and recreates the table, then inserts all cities, campuses,
      buildings and floors exactly as in the mock dataset.
    - At the end, example CTE queries show how to traverse the hierarchy.
*/

IF OBJECT_ID('dbo.Location_Hierarchy', 'U') IS NOT NULL
  DROP TABLE dbo.Location_Hierarchy;
GO

CREATE TABLE dbo.Location_Hierarchy (
  Id           UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Location_Hierarchy PRIMARY KEY,
  Name         NVARCHAR(200)    NOT NULL,
  Type         VARCHAR(20)      NOT NULL CHECK (Type IN ('City','Campus','Building','Floor')),
  ParentId     UNIQUEIDENTIFIER NULL REFERENCES dbo.Location_Hierarchy(Id),
  Attributes   NVARCHAR(MAX)    NULL, -- optional JSON: e.g. {"floors":4}
  IsActive     BIT              NOT NULL CONSTRAINT DF_Location_Hierarchy_IsActive DEFAULT(1),
  CreatedUtc   DATETIME2(3)     NOT NULL CONSTRAINT DF_Location_Hierarchy_CreatedUtc DEFAULT (SYSUTCDATETIME())
);
GO

/* Helpers */
DECLARE @City_Cleveland UNIQUEIDENTIFIER       = NEWID();
DECLARE @City_Beachwood UNIQUEIDENTIFIER       = NEWID();
DECLARE @City_Chardon UNIQUEIDENTIFIER         = NEWID();
DECLARE @City_Westlake UNIQUEIDENTIFIER        = NEWID();
DECLARE @City_Akron UNIQUEIDENTIFIER           = NEWID();
DECLARE @City_MayfieldHeights UNIQUEIDENTIFIER = NEWID();
DECLARE @City_Mentor UNIQUEIDENTIFIER          = NEWID();
DECLARE @City_OrangeVillage UNIQUEIDENTIFIER   = NEWID();
DECLARE @City_Sandusky UNIQUEIDENTIFIER        = NEWID();

/* Cities (9) */
INSERT dbo.Location_Hierarchy (Id, Name, Type, ParentId) VALUES
(@City_Cleveland      , N'Cleveland'       , 'City', NULL),
(@City_Beachwood      , N'Beachwood'       , 'City', NULL),
(@City_Chardon        , N'Chardon'         , 'City', NULL),
(@City_Westlake       , N'Westlake'        , 'City', NULL),
(@City_Akron          , N'Akron'           , 'City', NULL),
(@City_MayfieldHeights, N'Mayfield Heights', 'City', NULL),
(@City_Mentor         , N'Mentor'          , 'City', NULL),
(@City_OrangeVillage  , N'Orange Village'  , 'City', NULL),
(@City_Sandusky       , N'Sandusky'        , 'City', NULL);
-- no GO here; keep variables in scope

/* Campuses (10) */
DECLARE @Campus_Cleveland UNIQUEIDENTIFIER             = NEWID();
DECLARE @Campus_AhujaBeachwood UNIQUEIDENTIFIER        = NEWID();
DECLARE @Campus_GeaugaRegional UNIQUEIDENTIFIER        = NEWID();
DECLARE @Campus_StJohnWestlake UNIQUEIDENTIFIER        = NEWID();
DECLARE @Campus_FairlawnAkron UNIQUEIDENTIFIER         = NEWID();
DECLARE @Campus_LanderbrookMayfield UNIQUEIDENTIFIER   = NEWID();
DECLARE @Campus_MentorHopkins UNIQUEIDENTIFIER         = NEWID();
DECLARE @Campus_ChagrinHighlands UNIQUEIDENTIFIER      = NEWID();
DECLARE @Campus_FirelandsSandusky UNIQUEIDENTIFIER     = NEWID();
DECLARE @Campus_Westlake UNIQUEIDENTIFIER              = NEWID(); -- additional campus in Westlake

INSERT dbo.Location_Hierarchy (Id, Name, Type, ParentId) VALUES
(@Campus_Cleveland           , N'Cleveland'                                 , 'Campus', @City_Cleveland),
(@Campus_AhujaBeachwood      , N'Ahuja Beachwood'                           , 'Campus', @City_Beachwood),
(@Campus_GeaugaRegional      , N'Geauga Regional'                           , 'Campus', @City_Chardon),
(@Campus_StJohnWestlake      , N'St. John Westlake'                         , 'Campus', @City_Westlake),
(@Campus_FairlawnAkron       , N'Fairlawn Akron'                            , 'Campus', @City_Akron),
(@Campus_LanderbrookMayfield , N'Landerbrook Mayfield Heights'              , 'Campus', @City_MayfieldHeights),
(@Campus_MentorHopkins       , N'Mentor Hopkins'                            , 'Campus', @City_Mentor),
(@Campus_ChagrinHighlands    , N'Chagrin Highlands (Orange Village)'        , 'Campus', @City_OrangeVillage),
(@Campus_FirelandsSandusky   , N'Firelands Sandusky'                        , 'Campus', @City_Sandusky),
(@Campus_Westlake            , N'Westlake'                                  , 'Campus', @City_Westlake);
-- no GO here; keep variables in scope

/* Buildings (10) + floor counts from mock data */
DECLARE @Bldg_Cleveland UNIQUEIDENTIFIER       = NEWID();
DECLARE @Bldg_Ahuja UNIQUEIDENTIFIER           = NEWID();
DECLARE @Bldg_Geauga UNIQUEIDENTIFIER          = NEWID();
DECLARE @Bldg_StJohn UNIQUEIDENTIFIER          = NEWID();
DECLARE @Bldg_Fairlawn UNIQUEIDENTIFIER        = NEWID();
DECLARE @Bldg_Landerbrook UNIQUEIDENTIFIER     = NEWID();
DECLARE @Bldg_Mentor UNIQUEIDENTIFIER          = NEWID();
DECLARE @Bldg_Chagrin UNIQUEIDENTIFIER         = NEWID();
DECLARE @Bldg_Firelands UNIQUEIDENTIFIER       = NEWID();
DECLARE @Bldg_Westlake UNIQUEIDENTIFIER        = NEWID();

INSERT dbo.Location_Hierarchy (Id, Name, Type, ParentId, Attributes) VALUES
(@Bldg_Cleveland , N'UH Cleveland Medical Center'                              , 'Building', @Campus_Cleveland         , N'{"floors":5}'),
(@Bldg_Ahuja     , N'UH Ahuja Medical Center'                                  , 'Building', @Campus_AhujaBeachwood    , N'{"floors":4}'),
(@Bldg_Geauga    , N'UH Geauga Medical Center (UH Regional Hospitals)'         , 'Building', @Campus_GeaugaRegional    , N'{"floors":3}'),
(@Bldg_StJohn    , N'UH St. John Medical Center (Catholic Hospital)'           , 'Building', @Campus_StJohnWestlake    , N'{"floors":4}'),
(@Bldg_Fairlawn  , N'UH Fairlawn Health Center'                                , 'Building', @Campus_FairlawnAkron     , N'{"floors":2}'),
(@Bldg_Landerbrook, N'UH Landerbrook Health Center'                            , 'Building', @Campus_LanderbrookMayfield, N'{"floors":3}'),
(@Bldg_Mentor    , N'UH Mentor Hopkins Health Center'                          , 'Building', @Campus_MentorHopkins     , N'{"floors":2}'),
(@Bldg_Chagrin   , N'UH Minoff Health Center at Chagrin Highlands'             , 'Building', @Campus_ChagrinHighlands  , N'{"floors":3}'),
(@Bldg_Firelands , N'UH Seidman Cancer Center at Firelands'                    , 'Building', @Campus_FirelandsSandusky , N'{"floors":2}'),
(@Bldg_Westlake  , N'UH Westlake Health Center'                                , 'Building', @Campus_Westlake          , N'{"floors":2}');
-- no GO here; keep variables in scope

/* Floors for each building from Attributes JSON */
DECLARE @Floors TABLE (BldgId UNIQUEIDENTIFIER, Floors INT);
INSERT @Floors (BldgId, Floors) VALUES
(@Bldg_Cleveland , 5), (@Bldg_Ahuja , 4), (@Bldg_Geauga , 3), (@Bldg_StJohn , 4), (@Bldg_Fairlawn , 2),
(@Bldg_Landerbrook , 3), (@Bldg_Mentor , 2), (@Bldg_Chagrin , 3), (@Bldg_Firelands , 2), (@Bldg_Westlake , 2);

DECLARE @bid UNIQUEIDENTIFIER, @f INT, @n INT;
DECLARE cur_build CURSOR LOCAL FAST_FORWARD FOR SELECT BldgId, Floors FROM @Floors;
OPEN cur_build;
FETCH NEXT FROM cur_build INTO @bid, @f;
WHILE @@FETCH_STATUS = 0
BEGIN
  SET @n = 1;
  WHILE @n <= @f
  BEGIN
    INSERT dbo.Location_Hierarchy (Id, Name, Type, ParentId)
    VALUES (NEWID(), N'Floor ' + CAST(@n AS NVARCHAR(10)), 'Floor', @bid);
    SET @n += 1;
  END;
  FETCH NEXT FROM cur_build INTO @bid, @f;
END
CLOSE cur_build; DEALLOCATE cur_build;
GO

/* Examples:
-- Recursive: full tree
WITH x AS (
  SELECT Id, Name, Type, ParentId, 0 AS lvl FROM dbo.Location_Hierarchy WHERE ParentId IS NULL
  UNION ALL
  SELECT c.Id, c.Name, c.Type, c.ParentId, p.lvl + 1
  FROM dbo.Location_Hierarchy c
  JOIN x p ON c.ParentId = p.Id
)
SELECT * FROM x ORDER BY lvl, Name;

-- All floors under a city
DECLARE @city NVARCHAR(200) = N'Westlake';
WITH x AS (
  SELECT Id FROM dbo.Location_Hierarchy WHERE Type='City' AND Name=@city
  UNION ALL SELECT c.Id FROM dbo.Location_Hierarchy c JOIN x p ON c.ParentId=p.Id
)
SELECT l.* FROM dbo.Location_Hierarchy l JOIN x t ON l.Id=t.Id WHERE l.Type='Floor' ORDER BY l.Name;
*/


