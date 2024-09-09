# User Management API

This is a User Management API that allows you to manage users with CRUD operations. You can create, read, update, and delete users through the various endpoints provided.

## Base URL

The base URL for the API is:

[https://fake-user-api.up.railway.app](https://fake-user-api.up.railway.app)


All routes start with `/api/v1/users/`.

Example of a full endpoint URL:

[https://fake-user-api.up.railway.app/api/v1/users](https://fake-user-api.up.railway.app/api/v1/users)


### Endpoints

- `GET /api/v1/users` - Retrieves a list of all users.
- `GET /api/v1/users/:userId` - Retrieves a single user by their userId.
- `GET /api/v1/users?userId=12323` - Retrieves a single user by query param.
- `POST /api/v1/users` - Creates a new user.
- `PATCH /api/v1/users/:userId` - Partially updates an existing user by userId.
- `PATCH /api/v1/users` - Partially updates an existing user.
- `PUT /api/v1/users/:userId` - Fully updates an existing user by userId.
- `PUT /api/v1/users?userId=12323` - Fully updates an existing user.
- `DELETE /api/v1/users/:userId` - Deletes a user by userId.
- `DELETE /api/v1/users?userId=12323` - Deletes a user.

### Example Requests

1. **Get All Users**

```bash
    curl https://fake-user-api.up.railway.app/api/v1/users
```
