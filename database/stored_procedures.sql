-- Stored procedures for utilization reporting
GO

-- Returns room-level weekly aggregation with columns expected by the React UI
-- Input filters are optional
CREATE OR ALTER PROCEDURE dbo.sp_GetRoomUtilization
  @City NVARCHAR(100) = NULL,
  @Campus NVARCHAR(100) = NULL,
  @BuildingId NVARCHAR(100) = NULL,
  @BuildingName NVARCHAR(200) = NULL,
  @Floor INT = NULL,
  @Room NVARCHAR(50) = NULL,
  @FromDate DATE = NULL,
  @ToDate DATE = NULL
AS
BEGIN
  SET NOCOUNT ON;

  ;WITH R AS (
    SELECT r.Id AS RoomId,
           r.RoomNumber AS RoomNumber,
           b.Name AS BuildingName,
           b.Campus,
           b.City,
           r.Floor
    FROM dbo.Rooms r
    JOIN dbo.Buildings b ON b.Id = r.BuildingId
    WHERE (@City IS NULL OR b.City = @City)
      AND (@Campus IS NULL OR b.Campus = @Campus)
      AND (@BuildingId IS NULL OR b.Id = @BuildingId)
      AND (@BuildingName IS NULL OR b.Name = @BuildingName)
      AND (@Floor IS NULL OR r.Floor = @Floor)
      AND (@Room IS NULL OR r.RoomNumber = @Room)
  ),
  U AS (
    SELECT R.RoomNumber,
           CONVERT(VARCHAR(7), COALESCE(u.UsageDate, GETDATE()), 120) AS [month], -- YYYY-MM
           DATENAME(weekday, u.UsageDate) AS [weekday],
           u.PercentUtilization
    FROM R
    LEFT JOIN dbo.Utilization u ON u.RoomId = R.RoomId
      AND (@FromDate IS NULL OR u.UsageDate >= @FromDate)
      AND (@ToDate IS NULL OR u.UsageDate <= @ToDate)
  )
  SELECT
    RoomNumber AS room,
    [month],
    CAST(AVG(CASE WHEN [weekday] = 'Monday' THEN PercentUtilization END) AS DECIMAL(5,2)) AS monday,
    CAST(AVG(CASE WHEN [weekday] = 'Tuesday' THEN PercentUtilization END) AS DECIMAL(5,2)) AS tuesday,
    CAST(AVG(CASE WHEN [weekday] = 'Wednesday' THEN PercentUtilization END) AS DECIMAL(5,2)) AS wednesday,
    CAST(AVG(CASE WHEN [weekday] = 'Thursday' THEN PercentUtilization END) AS DECIMAL(5,2)) AS thursday,
    CAST(AVG(CASE WHEN [weekday] = 'Friday' THEN PercentUtilization END) AS DECIMAL(5,2)) AS friday
  FROM U
  GROUP BY RoomNumber, [month]
  ORDER BY RoomNumber, [month];
END
GO


