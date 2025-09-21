# DNS Configuration for RepAZoo

## Required DNS Records

Configure the following DNS records with your domain registrar:

### For cfy.repazoo.com (Marketing Site)
```
Type: A
Host: cfy
Value: [YOUR_SERVER_IP]
TTL: 300

Type: A
Host: www.cfy
Value: [YOUR_SERVER_IP]
TTL: 300
```

### For dash.repazoo.com (Dashboard)
```
Type: A
Host: dash
Value: [YOUR_SERVER_IP]
TTL: 300

Type: A
Host: www.dash
Value: [YOUR_SERVER_IP]
TTL: 300
```

## SSL Certificate Setup

### Option 1: Let's Encrypt (Recommended for Production)
```bash
# Install certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Generate certificates
sudo certbot --nginx -d cfy.repazoo.com -d www.cfy.repazoo.com
sudo certbot --nginx -d dash.repazoo.com -d www.dash.repazoo.com

# Copy certificates to ssl directory
sudo cp /etc/letsencrypt/live/cfy.repazoo.com/fullchain.pem ssl/cfy.repazoo.com.pem
sudo cp /etc/letsencrypt/live/cfy.repazoo.com/privkey.pem ssl/cfy.repazoo.com.key
sudo cp /etc/letsencrypt/live/dash.repazoo.com/fullchain.pem ssl/dash.repazoo.com.pem
sudo cp /etc/letsencrypt/live/dash.repazoo.com/privkey.pem ssl/dash.repazoo.com.key
```

### Option 2: Self-Signed (Development Only)
```bash
cd ssl
./generate-certs.sh
```

## Firewall Configuration
```bash
# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow SSH (if not already allowed)
sudo ufw allow 22

# Enable firewall
sudo ufw enable
```

## Deployment
```bash
# Deploy the application
./deploy.sh
```

## Testing
After deployment and DNS propagation (can take up to 24 hours):

- Marketing Site: https://cfy.repazoo.com
- Dashboard: https://dash.repazoo.com

## Monitoring
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f

# Check nginx configuration
docker-compose exec nginx nginx -t
```