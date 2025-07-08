# Cyreal Installation Script for Windows PowerShell
# Run as Administrator for best results

param(
    [string]$InstallDir = "",
    [switch]$Help
)

$ErrorActionPreference = "Stop"

# Default installation directory
$DefaultInstallDir = "$env:USERPROFILE\cyreal-deployment"

# Colors and formatting
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Info { Write-Host $args -ForegroundColor Cyan }

# Show help if requested
if ($Help) {
    Write-Host "Cyreal Installation Script for Windows"
    Write-Host ""
    Write-Host "Usage: .\install.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -InstallDir DIR    Installation directory (default: $DefaultInstallDir)"
    Write-Host "  -Help              Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\install.ps1                              # Install to default directory"
    Write-Host "  .\install.ps1 -InstallDir C:\cyreal        # Install to C:\cyreal"
    Write-Host "  .\install.ps1 -InstallDir `$env:LOCALAPPDATA\cyreal  # Install to AppData"
    Write-Host ""
    exit 0
}

# Set installation directory
if ([string]::IsNullOrEmpty($InstallDir)) {
    $InstallDir = $DefaultInstallDir
}

# Expand environment variables
$InstallDir = [Environment]::ExpandEnvironmentVariables($InstallDir)

Write-Success "====================================="
Write-Success "    Cyreal Installation Script      "
Write-Success "====================================="
Write-Host ""
Write-Info "Installation Directory: $InstallDir"
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Warning "Running without Administrator privileges"
    Write-Warning "Some features may require manual configuration"
    Write-Host ""
}

# Function to check if a command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Function to get Node.js version
function Get-NodeVersion {
    if (Test-Command node) {
        $version = & node -v
        return $version.TrimStart('v')
    }
    return "0"
}

# Check prerequisites
Write-Warning "Checking prerequisites..."

# Check Node.js
$nodeMinVersion = [Version]"18.0.0"
if (Test-Command node) {
    $nodeVersion = [Version](Get-NodeVersion)
    if ($nodeVersion -ge $nodeMinVersion) {
        Write-Success "✓ Node.js $nodeVersion (minimum: $nodeMinVersion)"
    } else {
        Write-Error "✗ Node.js $nodeVersion is too old (minimum: $nodeMinVersion)"
        Write-Warning "Please update Node.js: https://nodejs.org/"
        exit 1
    }
} else {
    Write-Error "✗ Node.js not found"
    Write-Warning "Installing Node.js via winget..."
    
    if (Test-Command winget) {
        winget install OpenJS.NodeJS.LTS
        Write-Success "Node.js installed. Please restart PowerShell and run this script again."
        exit 0
    } else {
        Write-Error "Please install Node.js manually from: https://nodejs.org/"
        Write-Warning "After installation, run this script again."
        exit 1
    }
}

# Check npm
if (Test-Command npm) {
    $npmVersion = & npm -v
    Write-Success "✓ npm $npmVersion"
} else {
    Write-Error "✗ npm not found"
    exit 1
}

# Check Git
if (Test-Command git) {
    $gitVersion = & git --version
    Write-Success "✓ $gitVersion"
} else {
    Write-Error "✗ git not found"
    Write-Warning "Installing Git via winget..."
    
    if (Test-Command winget) {
        winget install Git.Git
        Write-Success "Git installed. Please restart PowerShell and run this script again."
        exit 0
    } else {
        Write-Error "Please install Git manually from: https://git-scm.com/"
        exit 1
    }
}

# Check for Visual Studio Build Tools
Write-Host ""
Write-Warning "Checking build tools..."

$vsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$hasVSBuildTools = $false

if (Test-Path $vsWhere) {
    $vsInstalls = & $vsWhere -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    if ($vsInstalls) {
        $hasVSBuildTools = $true
        Write-Success "✓ Visual Studio Build Tools found"
    }
}

if (-not $hasVSBuildTools) {
    # Check for windows-build-tools
    $globalModules = & npm list -g --depth=0 2>$null
    if ($globalModules -match "windows-build-tools") {
        Write-Success "✓ windows-build-tools found"
    } else {
        Write-Warning "Visual Studio Build Tools not found"
        Write-Warning "Installing windows-build-tools (this may take a while)..."
        
        if ($isAdmin) {
            npm install --global windows-build-tools
        } else {
            Write-Error "Administrator privileges required to install build tools"
            Write-Warning "Please run as Administrator:"
            Write-Info "npm install --global windows-build-tools"
            exit 1
        }
    }
}

# Install global TypeScript
Write-Host ""
Write-Warning "Installing global TypeScript..."
npm install -g typescript@latest

# Check if we're in the cyreal directory
if (-not (Test-Path "package.json") -or -not (Test-Path "packages")) {
    Write-Error "Error: This script must be run from the cyreal project root directory"
    exit 1
}

# Confirm installation directory
Write-Host ""
if (Test-Path $InstallDir) {
    $contents = Get-ChildItem $InstallDir -ErrorAction SilentlyContinue
    if ($contents) {
        Write-Warning "Warning: Installation directory already exists and is not empty:"
        Write-Host "  $InstallDir"
        Write-Host ""
        $response = Read-Host "Continue? This will overwrite existing files. (y/N)"
        if ($response -notmatch "^[Yy]$") {
            Write-Error "Installation cancelled."
            exit 1
        }
    }
}

# Create installation directory
Write-Host ""
Write-Warning "Creating installation directory..."
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# Copy source files to installation directory (excluding .git and node_modules)
Write-Warning "Copying Cyreal source to installation directory..."
$SourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Copy files, excluding certain directories
robocopy $SourceDir $InstallDir /E /XD .git node_modules dist .nyc_output coverage /XF *.log .DS_Store | Out-Null

# Change to installation directory for build
Write-Info "Working in installation directory: $InstallDir"
Set-Location $InstallDir

# Install dependencies
Write-Host ""
Write-Warning "Installing project dependencies..."
npm install

# Install lerna for monorepo management
Write-Host ""
Write-Warning "Installing lerna..."
npm install -g lerna@latest

# Bootstrap packages
Write-Host ""
Write-Warning "Bootstrapping packages..."
npx lerna bootstrap

# Build all packages
Write-Host ""
Write-Warning "Building packages..."
npm run build

# Create directories for logs and data
Write-Host ""
Write-Warning "Creating runtime directories..."

$cyRealData = "$env:APPDATA\cyreal"
$cyRealLocal = "$env:LOCALAPPDATA\cyreal"

# Create directories
New-Item -ItemType Directory -Force -Path "$cyRealLocal\logs" | Out-Null
New-Item -ItemType Directory -Force -Path "$cyRealData\data" | Out-Null
New-Item -ItemType Directory -Force -Path "$cyRealData\config" | Out-Null

Write-Success "✓ Created directories in $cyRealData"

# Set up global cyreald command
Write-Host ""
Write-Warning "Setting up global cyreald command..."
Push-Location packages\cyreald
npm link
Pop-Location
Write-Success "✓ cyreald command available globally"

# Check for available COM ports
Write-Host ""
Write-Warning "Checking available COM ports..."
try {
    $ports = [System.IO.Ports.SerialPort]::GetPortNames()
    if ($ports.Count -gt 0) {
        Write-Success "Found COM ports: $($ports -join ', ')"
    } else {
        Write-Warning "No COM ports found"
    }
} catch {
    Write-Warning "Could not enumerate COM ports"
}

# Success message
Write-Host ""
Write-Success "====================================="
Write-Success "    Installation Complete!          "
Write-Success "====================================="
Write-Host ""
Write-Success "Cyreal has been installed to:"
Write-Info "  $InstallDir"
Write-Host ""
Write-Success "You can now use Cyreal with:"
Write-Info "  cyreald --help         - Show command options"
Write-Info "  cyreald list           - List available serial ports"
Write-Info "  cyreald start          - Start the daemon"
Write-Info "  cyreal-test --help     - Test installation"
Write-Host ""
Write-Success "Installation directory contains:"
Write-Info "  📦 Built packages in packages\*\dist\"
Write-Info "  📚 Documentation in docs\"
Write-Info "  ⚙️  Configuration in config\"
Write-Info "  🧪 Test examples in examples\"
Write-Host ""
Write-Warning "Note: On Windows, use COM ports (e.g., COM1, COM3)"
Write-Warning "Note: USB serial adapters will appear as new COM ports when connected"

# Offer to list ports
Write-Host ""
$response = Read-Host "Would you like to list available serial ports now? (y/n)"
if ($response -eq 'y') {
    cyreald list
}