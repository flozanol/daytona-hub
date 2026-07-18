-- Corrida semanal de checklists (Smnvo)
-- Ejecutar en base Intranet

USE Intranet;
GO

-- 1) Tabla de corrida semanal por company
IF OBJECT_ID('dbo.Smnvo_ChecklistWeekRun', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Smnvo_ChecklistWeekRun (
        WeekRunID      INT IDENTITY(1,1) NOT NULL,
        CpnyID         INT NOT NULL,
        WeekStartDate  DATE NOT NULL,
        TotalCreated   INT NOT NULL CONSTRAINT DF_Smnvo_WeekRun_Total DEFAULT (0),
        Crtd_DateTime  DATETIME NOT NULL CONSTRAINT DF_Smnvo_WeekRun_Crtd DEFAULT (GETDATE()),
        Crtd_User      INT NOT NULL,
        CONSTRAINT PK_Smnvo_ChecklistWeekRun PRIMARY KEY (WeekRunID),
        CONSTRAINT UQ_Smnvo_WeekRun_Cpny_Week UNIQUE (CpnyID, WeekStartDate)
    );
END
GO

-- 2) WeekRunID en checklist
IF COL_LENGTH('dbo.Smnvo_Checklist', 'WeekRunID') IS NULL
BEGIN
    ALTER TABLE dbo.Smnvo_Checklist ADD WeekRunID INT NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Smnvo_Checklist_WeekRun'
)
BEGIN
    ALTER TABLE dbo.Smnvo_Checklist
        ADD CONSTRAINT FK_Smnvo_Checklist_WeekRun
        FOREIGN KEY (WeekRunID) REFERENCES dbo.Smnvo_ChecklistWeekRun (WeekRunID);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'UQ_Smnvo_Checklist_Invt_WeekRun' AND object_id = OBJECT_ID('dbo.Smnvo_Checklist')
)
BEGIN
    CREATE UNIQUE INDEX UQ_Smnvo_Checklist_Invt_WeekRun
        ON dbo.Smnvo_Checklist (InvtID, WeekRunID)
        WHERE WeekRunID IS NOT NULL;
END
GO

-- 3) Ensure / get week run
CREATE OR ALTER PROCEDURE dbo.Smnvo_EnsureWeekRun
    @CpnyID        INT,
    @WeekStartDate DATE,
    @Crtd_User     INT,
    @WeekRunID     INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT @WeekRunID = WeekRunID
    FROM dbo.Smnvo_ChecklistWeekRun
    WHERE CpnyID = @CpnyID AND WeekStartDate = @WeekStartDate;

    IF @WeekRunID IS NULL
    BEGIN
        INSERT INTO dbo.Smnvo_ChecklistWeekRun (CpnyID, WeekStartDate, TotalCreated, Crtd_User)
        VALUES (@CpnyID, @WeekStartDate, 0, @Crtd_User);
        SET @WeekRunID = SCOPE_IDENTITY();
    END
END
GO

-- 4) Recount totals for a week run
CREATE OR ALTER PROCEDURE dbo.Smnvo_RecountWeekRun
    @WeekRunID INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Smnvo_ChecklistWeekRun
    SET TotalCreated = (
        SELECT COUNT(*) FROM dbo.Smnvo_Checklist WHERE WeekRunID = @WeekRunID
    )
    WHERE WeekRunID = @WeekRunID;
END
GO

-- 5) Add checklist with WeekRunID + anti-duplicado
CREATE OR ALTER PROCEDURE dbo.Smnvo_AddChecklist
    @InvtID       INT,
    @CpnyID       INT,
    @Crtd_User    INT,
    @WeekRunID    INT = NULL,
    @ChecklistID  INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    IF @WeekRunID IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM dbo.Smnvo_Checklist
           WHERE InvtID = @InvtID AND WeekRunID = @WeekRunID
       )
    BEGIN
        RAISERROR('DUPLICATE_WEEK_CHECKLIST', 16, 1);
        RETURN;
    END

    INSERT INTO dbo.Smnvo_Checklist (InvtID, CpnyID, Status, Crtd_User, WeekRunID)
    VALUES (@InvtID, @CpnyID, 1, @Crtd_User, @WeekRunID);

    SET @ChecklistID = SCOPE_IDENTITY();

    IF @WeekRunID IS NOT NULL
        EXEC dbo.Smnvo_RecountWeekRun @WeekRunID = @WeekRunID;
END
GO

-- 6) Get single — include WeekRunID
CREATE OR ALTER PROCEDURE dbo.Smnvo_GetSingleChecklist
    @ChecklistID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        c.ChecklistID,
        c.InvtID,
        c.CpnyID,
        c.Status,
        c.WeekRunID,
        c.Crtd_DateTime,
        c.Crtd_User,
        c.Lupd_DateTime,
        c.Lupd_User,
        i.SLInvtID,
        i.VIN,
        i.Marca,
        i.SubMarca,
        i.Version,
        i.ModeloYr,
        i.CExterior,
        i.CpnyName
    FROM dbo.Smnvo_Checklist c
    INNER JOIN sqlintranet.Intranet_InvtSmnvos i ON c.InvtID = i.InvtID
    WHERE c.ChecklistID = @ChecklistID;
END
GO

-- 7) List by page — optional WeekRunID filter + WeekRunID in select
CREATE OR ALTER PROCEDURE dbo.Smnvo_GetChecklistsByPage
    @CpnyID       INT,
    @CurrentPage  INT,
    @PageSize     INT,
    @WeekRunID    INT = NULL,
    @TotalRecords INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT @TotalRecords = COUNT(*)
    FROM dbo.Smnvo_Checklist c
    WHERE (c.CpnyID = @CpnyID OR @CpnyID = 0)
      AND (@WeekRunID IS NULL OR c.WeekRunID = @WeekRunID);

    SELECT
        c.ChecklistID,
        c.InvtID,
        c.CpnyID,
        c.Status,
        c.WeekRunID,
        c.Crtd_DateTime,
        i.SLInvtID,
        i.VIN,
        i.Marca,
        i.SubMarca,
        i.Version,
        i.ModeloYr,
        i.CpnyName,
        (SELECT COUNT(*) FROM dbo.Smnvo_ChecklistItems WHERE ChecklistID = c.ChecklistID) AS TotalItems
    FROM dbo.Smnvo_Checklist c
    INNER JOIN sqlintranet.Intranet_InvtSmnvos i ON c.InvtID = i.InvtID
    WHERE (c.CpnyID = @CpnyID OR @CpnyID = 0)
      AND (@WeekRunID IS NULL OR c.WeekRunID = @WeekRunID)
    ORDER BY c.Crtd_DateTime DESC
    OFFSET (@CurrentPage - 1) * @PageSize ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END
GO

-- 8) Week runs with progress
CREATE OR ALTER PROCEDURE dbo.Smnvo_GetWeekRunsWithProgress
    @CpnyID        INT,          -- 0 = todas
    @WeekStartDate DATE = NULL,  -- NULL = todas las semanas
    @CurrentPage   INT,
    @PageSize      INT,
    @TotalRecords  INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT @TotalRecords = COUNT(*)
    FROM dbo.Smnvo_ChecklistWeekRun w
    WHERE (w.CpnyID = @CpnyID OR @CpnyID = 0)
      AND (@WeekStartDate IS NULL OR w.WeekStartDate = @WeekStartDate);

    SELECT
        w.WeekRunID,
        w.CpnyID,
        w.WeekStartDate,
        w.TotalCreated,
        w.Crtd_DateTime,
        w.Crtd_User,
        COALESCE(
            NULLIF(RTRIM(c.Descr), ''),
            NULLIF(RTRIM(inv.CpnyName), ''),
            CAST(w.CpnyID AS NVARCHAR(20))
        ) AS CpnyName,
        ISNULL(agg.CompletedCount, 0) AS CompletedCount,
        ISNULL(agg.PendingCount, 0)   AS PendingCount
    FROM dbo.Smnvo_ChecklistWeekRun w
    LEFT JOIN sqlintranet.Intranet_Company c ON c.IDCpny = w.CpnyID
    OUTER APPLY (
        SELECT TOP 1 i.CpnyName
        FROM sqlintranet.Intranet_InvtSmnvos i
        WHERE i.CpnyID = w.CpnyID
    ) inv
    OUTER APPLY (
        SELECT
            SUM(CASE WHEN cl.Status = 2 THEN 1 ELSE 0 END) AS CompletedCount,
            SUM(CASE WHEN cl.Status <> 2 THEN 1 ELSE 0 END) AS PendingCount
        FROM dbo.Smnvo_Checklist cl
        WHERE cl.WeekRunID = w.WeekRunID
    ) agg
    WHERE (w.CpnyID = @CpnyID OR @CpnyID = 0)
      AND (@WeekStartDate IS NULL OR w.WeekStartDate = @WeekStartDate)
    ORDER BY w.WeekStartDate DESC, CpnyName ASC
    OFFSET (@CurrentPage - 1) * @PageSize ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END
GO

-- 9) Exists checklist for invt in week run
CREATE OR ALTER PROCEDURE dbo.Smnvo_HasChecklistInWeekRun
    @InvtID    INT,
    @WeekRunID INT,
    @Exists    BIT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM dbo.Smnvo_Checklist
        WHERE InvtID = @InvtID AND WeekRunID = @WeekRunID
    )
        SET @Exists = 1;
    ELSE
        SET @Exists = 0;
END
GO
