-- Limpia corridas semanales + checklists + ítems de checklist.
-- Conserva el template (Smnvo_ChecklistTemplate).
-- Ejecutar en base Intranet.

USE Intranet;
GO

BEGIN TRANSACTION;

BEGIN TRY
    -- 1) Ítems de los checklists (evaluaciones)
    DELETE FROM dbo.Smnvo_ChecklistItems;

    -- 2) Encabezados de checklist
    DELETE FROM dbo.Smnvo_Checklist;

    -- 3) Corridas semanales por company
    DELETE FROM dbo.Smnvo_ChecklistWeekRun;

    -- Reiniciar identidades (opcional, para empezar IDs desde 1)
    DBCC CHECKIDENT ('dbo.Smnvo_ChecklistItems',   RESEED, 0);
    DBCC CHECKIDENT ('dbo.Smnvo_Checklist',        RESEED, 0);
    DBCC CHECKIDENT ('dbo.Smnvo_ChecklistWeekRun', RESEED, 0);

    COMMIT TRANSACTION;

    PRINT 'OK: checklists, ítems y corridas semanales eliminados.';
    PRINT 'Template (Smnvo_ChecklistTemplate) NO fue modificado.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO

-- Verificación rápida
SELECT 'ChecklistItems'   AS Tabla, COUNT(*) AS Filas FROM dbo.Smnvo_ChecklistItems
UNION ALL
SELECT 'Checklist',                 COUNT(*)          FROM dbo.Smnvo_Checklist
UNION ALL
SELECT 'ChecklistWeekRun',          COUNT(*)          FROM dbo.Smnvo_ChecklistWeekRun
UNION ALL
SELECT 'ChecklistTemplate',         COUNT(*)          FROM dbo.Smnvo_ChecklistTemplate;
GO
