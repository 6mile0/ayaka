location=$1
port=$2

sed "/^server {/a \\
    location /${location} { \n\
        rewrite /${location}/(.*) /$1  break; \n\
        proxy_pass http://host.docker.internal:${port}; \n\
        proxy_set_header Host \$host; \n\
        proxy_set_header X-Real-IP \$remote_addr; \n\
    }" default.conf > default.conf.tmp
mv default.conf.tmp default.conf