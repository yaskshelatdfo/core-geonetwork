UPDATE Users SET enabled = true;
UPDATE Mapservers set pushstyleinworkspace = 'n';


UPDATE Settings SET value='3.0.4' WHERE name='system/platform/version';
UPDATE Settings SET value='SNAPSHOT' WHERE name='system/platform/subVersion';