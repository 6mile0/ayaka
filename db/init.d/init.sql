create database containers;
use containers;
create table container_infos(ctnId TINYTEXT,userId BIGINT,containerName Text,editorPass Text,sudoPass Text,servicePort INT(6), generateDate TIMESTAMP,removeDate TEXT);