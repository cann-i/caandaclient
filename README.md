# CA Firm Management System

This is a complete document management and client portal system for CA firms.

## Project Structure

- `backend/`: Node.js + Express server
- `frontend/`: React application

## Prerequisites

- Node.js (v18 or higher)
- MySQL Server (must be running on default port 3306)

## Quick Start

1.  **Clone the repository** (if not already done).

2.  **Setup the project** (installs dependencies and initializes database):
    ```bash
    npm run setup
    ```
    *Note: This script assumes your MySQL server is running with user `root` and no password (default). If your MySQL config is different, please edit `backend/.env` after running setup and then run `cd backend && npm run init-db` manually.*

3.  **Run the application**:
    ```bash
    npm start
    ```
    This will start both the backend (port 5000) and frontend (port 3000) concurrently.

4.  **Access the application**:
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## Configuration

### Backend
The backend configuration is located in `backend/.env`.
- `DB_HOST`: Database host (default: 127.0.0.1)
- `DB_USER`: Database user (default: root)
- `DB_PASSWORD`: Database password
- `DB_NAME`: Database name (default: ca_firm_db)
- `PORT`: Backend API port (default: 5000)
- `JWT_SECRET`: Secret key for JWT tokens

### Frontend
The frontend configuration is located in `frontend/.env`.
- `REACT_APP_API_URL`: URL of the backend API
- `REACT_APP_BASE_URL`: Base URL of the backend

## Login Credentials (Default)

The system is initialized with the following default users (Password: `123456`):

- **CA Admin**: `ca@example.com`
- **Client**: `john@abc.com`
