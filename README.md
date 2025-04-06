# StomatSosamba Backend

Backend API for the StomatSosamba test application.

## Deployment to Vercel

### Prerequisites

1. Create a Vercel account at [vercel.com](https://vercel.com)
2. Install Vercel CLI: `npm install -g vercel`

### Environment Variables

Set up the following environment variables in your Vercel project:

- `MONGODB_URI`: Your MongoDB connection string
- `ADMIN_PASSWORD`: Password for admin authentication

### Deployment Steps

1. Login to Vercel: `vercel login`
2. Deploy the project: `vercel`
3. For production deployment: `vercel --prod`

### API Endpoints

- `GET /api/tests`: Get all tests (public)
- `GET /api/test/:id`: Get a specific test by ID (public)
- `POST /api/test`: Create a new test (protected)
- `DELETE /api/test/:id`: Delete a test (protected)
- `PUT /api/test/:id/lock`: Update test lock status (protected)
- `POST /api/tests/batch`: Batch create tests (protected)

### Authentication

Protected endpoints require an Authorization header with the admin password:
```
Authorization: Bearer YOUR_ADMIN_PASSWORD
``` 