-- Migración: tipos de ítem en checklist (boolean | opciones)
-- Ejecutar en base Intranet
-- Idempotente: usa IF COL_LENGTH / CREATE OR ALTER

USE Intranet;
GO

-- ─────────────────────────────────────────────
-- 1) Columnas nuevas en Smnvo_ChecklistTemplate
-- ─────────────────────────────────────────────

IF COL_LENGTH('dbo.Smnvo_ChecklistTemplate', 'TipoItem') IS NULL
BEGIN
    ALTER TABLE dbo.Smnvo_ChecklistTemplate
        ADD TipoItem NVARCHAR(20) NOT NULL
            CONSTRAINT DF_Smnvo_Template_TipoItem DEFAULT ('boolean');
END
GO

IF COL_LENGTH('dbo.Smnvo_ChecklistTemplate', 'Opciones') IS NULL
BEGIN
    ALTER TABLE dbo.Smnvo_ChecklistTemplate
        ADD Opciones NVARCHAR(1000) NULL;
END
GO

-- ─────────────────────────────────────────────
-- 2) Columnas nuevas en Smnvo_ChecklistItems
-- ─────────────────────────────────────────────

IF COL_LENGTH('dbo.Smnvo_ChecklistItems', 'TipoItem') IS NULL
BEGIN
    ALTER TABLE dbo.Smnvo_ChecklistItems
        ADD TipoItem NVARCHAR(20) NOT NULL
            CONSTRAINT DF_Smnvo_Items_TipoItem DEFAULT ('boolean');
END
GO

IF COL_LENGTH('dbo.Smnvo_ChecklistItems', 'Opciones') IS NULL
BEGIN
    ALTER TABLE dbo.Smnvo_ChecklistItems
        ADD Opciones NVARCHAR(1000) NULL;
END
GO

IF COL_LENGTH('dbo.Smnvo_ChecklistItems', 'ResultadoOpcion') IS NULL
BEGIN
    ALTER TABLE dbo.Smnvo_ChecklistItems
        ADD ResultadoOpcion NVARCHAR(200) NULL;
END
GO

-- ─────────────────────────────────────────────
-- 3) Stored procedures actualizados
-- ─────────────────────────────────────────────

-- Template: obtener todos
CREATE OR ALTER PROCEDURE dbo.Smnvo_GetChecklistTemplate
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TemplateItemID, Categoria, Descripcion, OrderIndex, TipoItem, Opciones
    FROM dbo.Smnvo_ChecklistTemplate
    ORDER BY OrderIndex;
END
GO

-- Template: agregar
CREATE OR ALTER PROCEDURE dbo.Smnvo_AddTemplateItem
    @Categoria       NVARCHAR(80),
    @Descripcion     NVARCHAR(200),
    @OrderIndex      INT,
    @TipoItem        NVARCHAR(20)   = 'boolean',
    @Opciones        NVARCHAR(1000) = NULL,
    @TemplateItemID  INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.Smnvo_ChecklistTemplate (Categoria, Descripcion, OrderIndex, TipoItem, Opciones)
    VALUES (@Categoria, @Descripcion, @OrderIndex, @TipoItem, @Opciones);
    SET @TemplateItemID = SCOPE_IDENTITY();
END
GO

-- Template: actualizar
CREATE OR ALTER PROCEDURE dbo.Smnvo_UpdateTemplateItem
    @TemplateItemID  INT,
    @Categoria       NVARCHAR(80),
    @Descripcion     NVARCHAR(200),
    @OrderIndex      INT,
    @TipoItem        NVARCHAR(20)   = 'boolean',
    @Opciones        NVARCHAR(1000) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Smnvo_ChecklistTemplate
    SET Categoria   = @Categoria,
        Descripcion = @Descripcion,
        OrderIndex  = @OrderIndex,
        TipoItem    = @TipoItem,
        Opciones    = @Opciones
    WHERE TemplateItemID = @TemplateItemID;
END
GO

-- Template: eliminar (sin cambios, se mantiene por completitud)
CREATE OR ALTER PROCEDURE dbo.Smnvo_DeleteTemplateItem
    @TemplateItemID INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM dbo.Smnvo_ChecklistTemplate WHERE TemplateItemID = @TemplateItemID;
END
GO

-- Ítems: obtener por checklist
CREATE OR ALTER PROCEDURE dbo.Smnvo_GetItemsByChecklist
    @ChecklistID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ItemID, ChecklistID, Categoria, Descripcion,
           Resultado, Notas, OrderIndex,
           TipoItem, Opciones, ResultadoOpcion
    FROM dbo.Smnvo_ChecklistItems
    WHERE ChecklistID = @ChecklistID
    ORDER BY OrderIndex;
END
GO

-- Ítems: agregar
CREATE OR ALTER PROCEDURE dbo.Smnvo_AddChecklistItem
    @ChecklistID      INT,
    @Categoria        NVARCHAR(80),
    @Descripcion      NVARCHAR(200),
    @Resultado        BIT            = NULL,
    @Notas            NVARCHAR(255)  = NULL,
    @OrderIndex       INT,
    @TipoItem         NVARCHAR(20)   = 'boolean',
    @Opciones         NVARCHAR(1000) = NULL,
    @ResultadoOpcion  NVARCHAR(200)  = NULL,
    @ItemID           INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.Smnvo_ChecklistItems
        (ChecklistID, Categoria, Descripcion, Resultado, Notas, OrderIndex,
         TipoItem, Opciones, ResultadoOpcion)
    VALUES
        (@ChecklistID, @Categoria, @Descripcion, @Resultado, @Notas, @OrderIndex,
         @TipoItem, @Opciones, @ResultadoOpcion);
    SET @ItemID = SCOPE_IDENTITY();
END
GO

-- Ítems: actualizar (acepta ambos campos de resultado; el cliente envía el correcto según TipoItem)
CREATE OR ALTER PROCEDURE dbo.Smnvo_UpdateChecklistItem
    @ItemID           INT,
    @Categoria        NVARCHAR(80),
    @Descripcion      NVARCHAR(200),
    @Resultado        BIT           = NULL,
    @Notas            NVARCHAR(255) = NULL,
    @ResultadoOpcion  NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Smnvo_ChecklistItems
    SET Categoria       = @Categoria,
        Descripcion     = @Descripcion,
        Resultado       = @Resultado,
        Notas           = @Notas,
        ResultadoOpcion = @ResultadoOpcion
    WHERE ItemID = @ItemID;
END
GO

-- Ítems: eliminar (sin cambios)
CREATE OR ALTER PROCEDURE dbo.Smnvo_DeleteChecklistItem
    @ItemID INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM dbo.Smnvo_ChecklistItems WHERE ItemID = @ItemID;
END
GO
