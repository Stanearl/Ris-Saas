# Cloudflare Worker Deployment Guide
## IoT Telemetry API Gateway

This guide covers the deployment and configuration of the Cloudflare Worker that acts as an edge ingestion layer for your fleet telemetry platform.

---

## 📋 Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Node.js**: Version 16.x or higher
3. **npm**: Comes with Node.js
4. **Wrangler CLI**: Cloudflare's command-line tool

---

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
npm install
```

This will install:
- `wrangler` - Cloudflare Workers CLI
- `@cloudflare/workers-types` - TypeScript types for Workers
- `typescript` - TypeScript compiler

### Step 2: Authenticate with Cloudflare

```bash
npx wrangler login
```

This will open your browser to authenticate with your Cloudflare account.

### Step 3: Update Configuration

Edit `wrangler.toml` and replace `YOUR_CLOUDFLARE_ACCOUNT_ID` with your actual account ID:

```toml
account_id = "your-actual-account-id-here"
```

**To find your Account ID:**
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Navigate to Workers & Pages → Overview
3. Copy your Account ID from the right sidebar

### Step 4: Set API Key Secret

The API key should **never** be committed to version control. Set it as a secret:

```bash
# For development
npx wrangler secret put API_KEY --env development

# For staging
npx wrangler secret put API_KEY --env staging

# For production
npx wrangler secret put API_KEY --env production
```

When prompted, enter your secure API key (e.g., a strong random string or JWT secret).

### Step 5: Deploy

#### Development Deployment
```bash
npm run deploy
# or
npx wrangler deploy --env development
```

#### Staging Deployment
```bash
npm run deploy:staging
```

#### Production Deployment
```bash
npm run deploy:production
```

---

## 🧪 Local Testing

Run the worker locally for testing:

```bash
npm run dev
```

This starts a local development server at `http://localhost:8787`

### Test with cURL

**Single Telemetry Payload:**
```bash
curl -X POST http://localhost:8787 \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "DEV-TRK-001",
    "timestamp": "2026-06-26T08:00:00.000Z",
    "weight_kg": 8500,
    "latitude": -1.2920659,
    "longitude": 36.8219462,
    "fuel_level_liters": 320.5,
    "speed_kmh": 65.0,
    "ecu_throttle_active": true
  }'
```

**Batch Telemetry Payload:**
```bash
curl -X POST http://localhost:8787 \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "DEV-TRK-001",
    "readings": [
      {
        "timestamp": "2026-06-26T08:00:00.000Z",
        "weight_kg": 8500,
        "latitude": -1.2920659,
        "longitude": 36.8219462,
        "fuel_level_liters": 320.5,
        "speed_kmh": 65.0,
        "ecu_throttle_active": true
      }
    ]
  }'
```

---

## 🔧 Configuration

### Environment Variables

The worker uses the following environment variables (configured in `wrangler.toml`):

| Variable | Description | Default |
|----------|-------------|---------|
| `API_KEY` | Authentication key (secret) | - |
| `BACKEND_URL` | Go backend endpoint | `https://api.ris.africa/telemetry` |
| `BACKEND_TIMEOUT` | Request timeout in milliseconds | `30000` (30 seconds) |

### Multiple Environments

The configuration supports three environments:

1. **Development**: Points to `localhost:8080` for local Go backend testing
2. **Staging**: Points to staging backend
3. **Production**: Points to production backend at `api.ris.africa`

---

## 🔐 Security Features

### Authentication
The worker supports two authentication methods:

1. **Bearer Token** (JWT):
   ```
   Authorization: Bearer <TOKEN>
   ```

2. **API Key Header**:
   ```
   X-API-Key: <API_KEY>
   ```

Both methods validate against the `API_KEY` secret stored in Cloudflare.

### Security Best Practices

✅ **Implemented:**
- API key validation on every request
- Content-Type validation (must be `application/json`)
- Payload size limits (max 100 readings per batch)
- Request timeout protection (30 seconds default)
- CORS headers for controlled access
- Error messages don't leak sensitive information

🔒 **Recommended:**
- Rotate API keys every 90 days
- Use different API keys for dev/staging/production
- Monitor failed authentication attempts
- Implement rate limiting (consider Cloudflare Rate Limiting rules)

---

## 📊 Monitoring & Logging

### View Real-Time Logs

```bash
npm run tail
# or
npx wrangler tail --env production
```

### Cloudflare Dashboard

Monitor your worker at:
- **Dashboard**: [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages
- **Metrics**: View requests, errors, CPU time, and more
- **Logs**: Real-time log streaming

### Key Metrics to Monitor

- **Request Rate**: Requests per second
- **Error Rate**: 4xx and 5xx responses
- **Latency**: P50, P95, P99 response times
- **Backend Errors**: 502/504 errors indicate backend issues

---

## 🌐 Custom Domain Setup

### Option 1: Workers Route (Recommended)

1. Add your domain to Cloudflare
2. Edit `wrangler.toml` and uncomment the routes section:

```toml
routes = [
  { pattern = "telemetry.ris.africa/*", zone_name = "ris.africa" }
]
```

3. Deploy:
```bash
npx wrangler deploy --env production
```

Your worker will now be available at: `https://telemetry.ris.africa/*`

### Option 2: workers.dev Subdomain

By default, your worker is available at:
```
https://ris-telemetry-gateway-prod.YOUR_SUBDOMAIN.workers.dev
```

---

## 🐛 Troubleshooting

### Error: "Cannot find name 'ExecutionContext'"

**Solution**: Install TypeScript types:
```bash
npm install --save-dev @cloudflare/workers-types
```

### Error: "Authentication failed"

**Solution**: Ensure API_KEY secret is set:
```bash
npx wrangler secret put API_KEY --env production
```

### Error: "502 Bad Gateway"

**Cause**: Cannot connect to Go backend

**Solutions**:
1. Verify `BACKEND_URL` is correct in `wrangler.toml`
2. Ensure Go backend is running and accessible
3. Check firewall rules allow Cloudflare IPs
4. Verify SSL certificate is valid

### Error: "504 Gateway Timeout"

**Cause**: Backend took longer than 30 seconds to respond

**Solutions**:
1. Optimize Go backend performance
2. Increase `BACKEND_TIMEOUT` in `wrangler.toml`
3. Check database query performance
4. Review backend logs for slow operations

---

## 📈 Performance Optimization

### Current Configuration

- **CPU Limit**: 50ms per request
- **Timeout**: 30 seconds for backend requests
- **Payload Limit**: 100 readings per batch

### Optimization Tips

1. **Batch Requests**: Encourage devices to send batches (10-20 readings)
2. **Connection Reuse**: Worker automatically reuses connections
3. **Edge Caching**: Consider caching device configurations
4. **Compression**: Worker supports gzip automatically

---

## 🔄 Updating the Worker

### Make Changes

1. Edit `worker.ts`
2. Test locally: `npm run dev`
3. Deploy to staging: `npm run deploy:staging`
4. Test staging endpoint
5. Deploy to production: `npm run deploy:production`

### Rollback

If you need to rollback:

```bash
npx wrangler rollback --env production
```

---

## 📝 API Response Examples

### Success (201 Created)
```json
{
  "status": "success",
  "message": "Telemetry data received",
  "data": {
    "device_id": "DEV-TRK-001",
    "timestamp": "2026-06-26T08:00:00.000Z",
    "record_id": 1234567890,
    "processed_at": "2026-06-26T08:00:01.234Z"
  }
}
```

### Error (401 Unauthorized)
```json
{
  "status": "error",
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing authentication credentials"
  }
}
```

### Error (400 Bad Request)
```json
{
  "status": "error",
  "error": {
    "code": "INVALID_PAYLOAD",
    "message": "Invalid request payload",
    "details": [
      {
        "field": "weight_kg",
        "issue": "must be a non-negative number"
      }
    ]
  }
}
```

---

## 🆘 Support

### Resources

- **Cloudflare Workers Docs**: [developers.cloudflare.com/workers](https://developers.cloudflare.com/workers)
- **Wrangler CLI Docs**: [developers.cloudflare.com/workers/wrangler](https://developers.cloudflare.com/workers/wrangler)
- **API Contract**: See `api-contract.md`

### Common Commands

```bash
# Install dependencies
npm install

# Local development
npm run dev

# Deploy to production
npm run deploy:production

# View logs
npm run tail

# Set secret
npx wrangler secret put API_KEY --env production

# List secrets
npx wrangler secret list --env production

# Delete secret
npx wrangler secret delete API_KEY --env production
```

---

## 📊 Cost Estimation

Cloudflare Workers pricing (as of 2024):

- **Free Tier**: 100,000 requests/day
- **Paid Plan**: $5/month for 10 million requests
- **Additional**: $0.50 per million requests

**Example**: 1,000 devices × 60 requests/hour × 24 hours = 1.44M requests/day
- **Monthly**: ~43M requests = $5 + $16.50 = **$21.50/month**

---

## ✅ Deployment Checklist

Before going to production:

- [ ] Update `account_id` in `wrangler.toml`
- [ ] Set `API_KEY` secret for production environment
- [ ] Verify `BACKEND_URL` points to production Go backend
- [ ] Test authentication with valid and invalid keys
- [ ] Test with single and batch payloads
- [ ] Configure custom domain (optional)
- [ ] Set up monitoring and alerts
- [ ] Document API endpoint for device teams
- [ ] Test error scenarios (malformed JSON, missing fields)
- [ ] Verify backend connectivity and timeout handling

---

**Deployment Date**: 2026-06-26  
**Version**: 1.0.0  
**Maintained By**: RIS Africa Engineering Team
