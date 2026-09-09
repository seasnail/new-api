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

## Backend & Front end (on port specified by .env)

直接运行

```
go run main.go
```

或者编译后运行

```
go build -o new-api
```

## Front end development (on port 5173 and will auto reload changes)

1. Start backend as usual
```
go run main.go
```
2. Start frontend at a different port for auto reload on update

```
cd web
bun run dev --port 5173  
```



使用 bun 构建前端资源
```
cd web
bun run build   # 使用 bun 构建前端资源
```


