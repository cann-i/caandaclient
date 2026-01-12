#!/bin/bash

# Exit on error
set -e

echo "Starting project setup..."

# 1. Root setup
echo "-----------------------------------"
echo "Setting up Root..."
# Always run install to ensure concurrently is available
echo "Installing root dependencies..."
npm install

# 2. Backend setup
echo "-----------------------------------"
echo "Setting up Backend..."
cd backend

echo "Installing backend dependencies..."
npm install

if [ ! -f .env ]; then
    echo "Creating backend .env file from example..."
    if [ -f .env.example ]; then
        cp .env.example .env
    else
        echo "WARNING: backend/.env.example not found. Creating a default .env file."
        cat <<EOT > .env
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=
DB_NAME=ca_firm_db
PORT=5000
JWT_SECRET=your_super_secret_key_change_in_production
NODE_ENV=development
EOT
    fi
else
    echo "Backend .env file already exists."
fi

# Database Initialization
echo "Attempting to initialize database..."
# We use '|| true' to prevent script failure if DB is not reachable
npm run init-db || echo "WARNING: Database initialization failed. Please ensure MySQL is running and credentials in backend/.env are correct."

cd ..

# 3. Frontend setup
echo "-----------------------------------"
echo "Setting up Frontend..."
cd frontend

echo "Installing frontend dependencies..."
npm install

if [ ! -f .env ]; then
    echo "Creating frontend .env file..."
    cat <<EOT > .env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_BASE_URL=http://localhost:5000
EOT
else
    echo "Frontend .env file already exists."
fi

cd ..

echo "-----------------------------------"
echo "Setup complete!"
echo "To start the application, run: npm start"
