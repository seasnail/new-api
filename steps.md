# $SSH connection

```
ssh -i c:\git\fairy-land-3.pem ec2-user@3.24.136.62
```

# Create/Update config

```
sudo mkdir -p /etc/new-api
sudo cp ~/new-api/.env.example /etc/new-api/new-api.env
sudo chmod 600 /etc/new-api/new-api.env
sudo vim /etc/new-api/new-api.env
```

# Run as docker

Prepare folder

```
sudo mkdir -p /srv/new-api/data /srv/new-api/logs
sudo chown -R ec2-user:ec2-user /srv/new-api
```

Run docker

```
docker pull ghcr.io/seasnail/new-api:main
docker stop new-api
docker rm new-api
docker run -d \
  --name new-api \
  --restart unless-stopped \
  --env-file /etc/new-api/new-api.env \
  -p 4000:4000 \
  -v /srv/new-api/data:/data \
  -v /srv/new-api/logs:/app/logs \
  ghcr.io/seasnail/new-api:main \
  --log-dir /app/logs
```

# Local dev


## 使用 bun 构建前端资源
```
cd web
bun run build   
```

## update and run backend
```
cd ..
go build -o new-api
go run main.go
```

## Start frontend at a different port for auto reload on update
```
cd web
bun run dev --port 5173  
```


## All in one
```
cd web
bun run build   
cd ..
go build -o new-api
go run main.go

```
###  In new window
```
cd web
bun run dev --port 5173

```