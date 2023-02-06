location=$1
port=$2
sed "/^server {/a \\
    location /${location} { \n\
        rewrite /${location}/(.*) /\$1  break; \n\
        proxy_pass http://host.docker.internal:${port}; \n\
        proxy_set_header Host \$host; \n\
        proxy_set_header Upgrade \$http_upgrade; \n\
        proxy_set_header Connection upgrade; \n\
        proxy_set_header Accept-Encoding gzip; \n\
    }" /etc/nginx/conf.d/default.conf > /etc/nginx/conf.d/default.conf.tmp
mv /etc/nginx/conf.d/default.conf.tmp /etc/nginx/conf.d/default.conf
service nginx reload