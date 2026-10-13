# Code Kingdom

## About the Project

Code Kingdom is a gamified programming education application created to help students learn the fundamentals of coding in a fun interactive way. Students learn concepts through completing tutorials and minigames.

By completing coding challenges, students earn resources and currency that they can use to build and expand their own virtual kingdom.


## Features

- **User Authentication:** Account registration, login, and saved progress.
- **Interactive Tutorials:** Learn programming concepts through guided lessons.
- **Coding Minigames:** Complete challenges to earn rewards.
- **Kingdom Management:** Build and upgrade a virtual kingdom using earned resources.
- **Progress Tracking:** Save learning achievements and kingdom progression across devices.
- **Administrator Controls:** Manage questions, difficulty ratings, and lesson progression.

*These features are planned and will be implemented throughout development.*

## Technology Stack

The following stack are proposed and may change as development progresses.

| Component         | Technology                     |
|-------------------|--------------------------------|
| Language          | Python                         |
| Frontend          | React, HTML, CSS, Tailwind CSS |
| Backend           | FastAPI                        |
| Database          | PostgreSQL, SQLAlchemy         |
| Game Framework    | Phaser 3                       |
| Tools             | Git, GitHub, Jira              |


### Prerequisites

The following tools are required to run Code Kingdom locally:

- [ ] Git
- [ ] Node.js 24 and npm
- [ ] Python 3.12
- [ ] Docker Desktop with WSL2 enabled (Windows)
- [ ] Windows PowerShell
- [ ] PyCharm or another IDE (recommended)

Code Kingdom uses PostgreSQL 17 through Docker Compose, so a separate PostgreSQL installation is not required.

Ensure Docker Desktop is running before starting the application.



## Repository Structure

Planned organization:

- `frontend/` — React application and game interface
- `backend/` — Python API, application logic, and database models
- `docs/` — Project documentation
- `.github/` — GitHub workflows and repository configuration
- `.env` —  environment configuration
- `.gitignore` — Files excluded from version control
- `README.md` — Project information and setup instructions

[TODO]

## Team Members

| Name | Role |
|---|---|
| Sunny Chetal | Product Manager & Developer |
| Jordan Graham | Scrum Master & Developer |
| Caio Miyake | Developer |
| Adhvikaa Radhamugundan | Developer |


**Branch naming convention:** `<type>/<issue-id>-<short-description>`

**Commit message convention:** [TBD]

**Code review requirements:** [TBD]

## Getting Started

The following instructions describe how to configure and run Code Kingdom locally on Windows.

### 1. Clone the Repository

Clone the repository and switch to the development branch:

```powershell
git clone https://github.com/Sunny-Chetal/Code-Kingdom.git
cd Code-Kingdom
git switch develop
```

### 2. Configure the Python Environment

Create a Python 3.12 virtual environment in the project root:

```powershell
py -3.12 -m venv .venv
```

Activate the virtual environment:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install the backend dependencies:

```powershell
python -m pip install -r backend/requirements.txt
```

Verify the installed dependencies:

```powershell
python -m pip check
```

### 3. Install Frontend Dependencies

Navigate to the frontend directory and install the required packages:

```powershell
cd frontend
npm.cmd install
cd ..
```

### 4. Configure the Database

Code Kingdom uses PostgreSQL 17 through Docker Compose.

The database container is configured in `docker-compose.yml` and uses port `5432`.

Create your local backend environment file from the provided template:

```powershell
Copy-Item backend/.env.example backend/.env
```

The `.env` file is excluded from Git tracking and contains your local environment configuration.

Ensure that `backend/.env` contains a valid `DATABASE_URL` matching the local PostgreSQL configuration.

The connection string uses the following format:

```env
DATABASE_URL=postgresql+psycopg://<username>:<password>@127.0.0.1:5432/<database>
```

Replace the placeholders with the username, password, and database name specified in `docker-compose.yml`.

Do not commit private credentials or production environment files.

### 5. Start the Application

Ensure Docker Desktop is running.

From the project root, execute:

```powershell
.\start-dev.ps1
```

The startup script automatically launches the following services:

| Service | Port | Description |
|---|---|---|
| React Frontend | 5173 | Application interface and Phaser game |
| FastAPI Gateway | 8000 | Handles frontend API requests |
| FastAPI Core | 8001 | Application logic and database communication |
| PostgreSQL | 5432 | Local application database |

The services run in the background without opening additional PowerShell windows.

The startup script automatically uses the project's Python virtual environment, so manual activation is not required when starting the services.

### 6. Verify the Application

After starting the services, open the following URLs:

| Service | URL |
|---|---|
| Frontend | http://localhost:5173/ |
| Gateway Health | http://127.0.0.1:8000/health |
| Backend Health | http://127.0.0.1:8000/api/health |
| Core Service Health | http://127.0.0.1:8001/health |

A successful database connection returns:

```json
{
  "status": "ok",
  "database": "connected"
}
```

The frontend should display:

`Backend: ok | Database: connected`

This confirms communication between the React frontend, FastAPI gateway, core service, and PostgreSQL database.

### 7. Stop the Application

From the project root, execute:

```powershell
.\stop-dev.ps1
```

This stops the frontend, FastAPI services, and PostgreSQL container without deleting the database data.

### Development Notes

- The frontend communicates with the backend through the FastAPI gateway.
- The gateway communicates with the core service, which connects to PostgreSQL using SQLAlchemy.
- The startup and shutdown scripts are designed for Windows PowerShell.
- Backend Python changes require restarting the services because automatic reloading is disabled in the background startup script.
- Vite supports hot module replacement for frontend changes.
- Ports `5173`, `8000`, and `8001` must be available before starting the services.
- Local environment configuration, Python virtual environments, and temporary development files should not be committed to GitHub.

### Troubleshooting

#### PowerShell Script Execution Is Disabled

If PowerShell prevents the scripts from running, temporarily allow script execution for the current terminal session:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Then run the startup script again.

#### Port Already in Use

Stop any previously running development services:

```powershell
.\stop-dev.ps1
```

Check whether a required port is occupied:

```powershell
Get-NetTCPConnection -LocalPort 5173,8000,8001 -State Listen -ErrorAction SilentlyContinue
```

#### Backend Connection Failed

If the frontend displays `Backend connection failed`, verify that Docker Desktop and both FastAPI services are running.

Check the backend health endpoint:

http://127.0.0.1:8000/api/health

#### Database Connection Failed

Verify that the PostgreSQL container is running:

```powershell
docker compose ps
```

Ensure that the database credentials in `backend/.env` match those in `docker-compose.yml`.

#### Missing Dependencies

Reinstall the required Python or frontend dependencies using the instructions above.

#### Backend Changes Not Appearing

Restart the development services to apply Python code changes:

```powershell
.\stop-dev.ps1
.\start-dev.ps1
```

