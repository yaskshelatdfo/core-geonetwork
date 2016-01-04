-- Schema modification should be handled by Hibernate
-- ALTER TABLE Users ADD COLUMN enabled boolean;
-- ALTER TABLE Mapservers ADD COLUMN pushstyleinworkspace varchar(1);

INSERT INTO MetadataIdentifierTemplate (id, name, template, isprovided) VALUES  (0, 'Custom URN', '', 'y');
INSERT INTO MetadataIdentifierTemplate (id, name, template, isprovided) VALUES  (1, 'Autogenerated URN', '', 'y');

INSERT INTO Settings (name, value, datatype, position, internal) VALUES ('system/metadatacreate/generateUuid', 'true', 2, 9100, 'n');

DELETE FROM Settings WHERE name LIKE 'system/shib/%';

INSERT INTO Settings (name, value, datatype, position, internal) VALUES ('system/metadatacreate/generateUuid', 'true', 2, 9100, 'n');

UPDATE Users SET enabled = true;

UPDATE Mapservers set pushstyleinworkspace = 'n';

UPDATE Settings SET value='3.0.3' WHERE name='system/platform/version';
UPDATE Settings SET value='SNAPSHOT' WHERE name='system/platform/subVersion';
