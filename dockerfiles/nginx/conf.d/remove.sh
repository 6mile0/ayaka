location=$1
cd /etc/nginx/conf.d
sed "/location \/${location}/,/}/d" default.conf > default.conf.tmp
mv default.conf.tmp default.conf
nginx -s reload