docker compose --env-file ./app/.env down
docker kill $(docker ps -q)
docker rm $(docker ps -a -q)
docker volume rm ayaka_db-data