
UPDATE metadata SET schemaid = 'iso19139' WHERE schemaid = 'iso19139.sextant';

-- TODO : resource link change cf. MetadataResourceDatabaseMigration
INSERT INTO Settings (name, value, datatype, position, internal) VALUES ('system/xlinkResolver/ignore', 'operatesOn,featureCatalogueCitation,Anchor,source', 0, 2312, 'n');


UPDATE Settings SET value='3.1.0' WHERE name='system/platform/version';
UPDATE Settings SET value='SNAPSHOT' WHERE name='system/platform/subVersion';