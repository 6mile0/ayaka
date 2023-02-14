location=$1
cd /etc/nginx/conf.d
sed "/location \/${location}/,/}/d" /etc/nginx/conf.d/default.conf > /etc/nginx/conf.d/default.conf.tmp
mv /etc/nginx/conf.d/default.conf.tmp /etc/nginx/conf.d/default.conf
service nginx reload