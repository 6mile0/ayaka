docker compose down
docker kill $(docker ps -q)
docker volume rm ayaka_db-data