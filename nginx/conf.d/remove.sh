location=$1
sed "/location \/${location}/,/}/d" default.conf > default.conf.tmp
mv default.conf.tmp default.conf