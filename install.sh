#!/bin/bash

# Cyreal Cross-Platform Installer Script
# Supports Linux, macOS, and Windows (via Git Bash/WSL)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}    Cyreal Installation Script      ${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""

# Detect OS
OS="Unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="Linux"
    DISTRO=$(lsb_release -si 2>/dev/null || echo "Unknown")
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macOS"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
    OS="Windows"
else
    echo -e "${RED}Unsupported operating system: $OSTYPE${NC}"
    exit 1
fi

echo -e "${GREEN}Detected OS:${NC} $OS"
if [[ "$OS" == "Linux" ]]; then
    echo -e "${GREEN}Distribution:${NC} $DISTRO"
fi
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to get Node.js version
get_node_version() {
    if command_exists node; then
        node -v | sed 's/v//'
    else
        echo "0"
    fi
}

# Function to compare versions
version_ge() {
    [ "$(printf '%s\n' "$1" "$2" | sort -V | head -n1)" = "$2" ]
}

# Check for required tools
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Node.js
NODE_MIN_VERSION="18.0.0"
if command_exists node; then
    NODE_VERSION=$(get_node_version)
    if version_ge "$NODE_VERSION" "$NODE_MIN_VERSION"; then
        echo -e "${GREEN}✓${NC} Node.js $NODE_VERSION (minimum: $NODE_MIN_VERSION)"
    else
        echo -e "${RED}✗${NC} Node.js $NODE_VERSION is too old (minimum: $NODE_MIN_VERSION)"
        echo -e "${YELLOW}Please update Node.js: https://nodejs.org/${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗${NC} Node.js not found"
    echo -e "${YELLOW}Installing Node.js...${NC}"
    
    if [[ "$OS" == "Linux" ]]; then
        # Use NodeSource repository for latest LTS
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [[ "$OS" == "macOS" ]]; then
        if command_exists brew; then
            brew install node
        else
            echo -e "${RED}Please install Homebrew first: https://brew.sh/${NC}"
            exit 1
        fi
    elif [[ "$OS" == "Windows" ]]; then
        echo -e "${RED}Please install Node.js manually from: https://nodejs.org/${NC}"
        echo -e "${YELLOW}After installation, run this script again.${NC}"
        exit 1
    fi
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓${NC} npm $NPM_VERSION"
else
    echo -e "${RED}✗${NC} npm not found"
    exit 1
fi

# Check Git
if command_exists git; then
    GIT_VERSION=$(git --version | awk '{print $3}')
    echo -e "${GREEN}✓${NC} git $GIT_VERSION"
else
    echo -e "${RED}✗${NC} git not found"
    echo -e "${YELLOW}Please install git: https://git-scm.com/${NC}"
    exit 1
fi

# Check build tools
echo ""
echo -e "${YELLOW}Checking build tools...${NC}"

if [[ "$OS" == "Linux" ]]; then
    # Check for build-essential
    if dpkg -l | grep -q build-essential; then
        echo -e "${GREEN}✓${NC} build-essential installed"
    else
        echo -e "${YELLOW}Installing build-essential...${NC}"
        sudo apt-get update
        sudo apt-get install -y build-essential
    fi
    
    # Check for Python (required by node-gyp)
    if command_exists python3; then
        PYTHON_VERSION=$(python3 --version | awk '{print $2}')
        echo -e "${GREEN}✓${NC} Python $PYTHON_VERSION"
    else
        echo -e "${YELLOW}Installing Python 3...${NC}"
        sudo apt-get install -y python3
    fi
    
elif [[ "$OS" == "macOS" ]]; then
    # Check for Xcode Command Line Tools
    if xcode-select -p &> /dev/null; then
        echo -e "${GREEN}✓${NC} Xcode Command Line Tools installed"
    else
        echo -e "${YELLOW}Installing Xcode Command Line Tools...${NC}"
        xcode-select --install
        echo -e "${YELLOW}Please complete the installation and run this script again.${NC}"
        exit 1
    fi
    
elif [[ "$OS" == "Windows" ]]; then
    # Check for windows-build-tools or Visual Studio
    echo -e "${YELLOW}Windows requires Visual Studio Build Tools for native modules${NC}"
    echo -e "${YELLOW}If not installed, please run as Administrator:${NC}"
    echo -e "${GREEN}npm install --global windows-build-tools${NC}"
    echo ""
    read -p "Do you have Visual Studio Build Tools installed? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Please install Visual Studio Build Tools first${NC}"
        exit 1
    fi
fi

# Install global TypeScript
echo ""
echo -e "${YELLOW}Installing global TypeScript...${NC}"
npm install -g typescript@latest

# Check if we're in the cyreal directory
if [ ! -f "package.json" ] || [ ! -d "packages" ]; then
    echo -e "${RED}Error: This script must be run from the cyreal project root directory${NC}"
    exit 1
fi

# Install dependencies
echo ""
echo -e "${YELLOW}Installing project dependencies...${NC}"
npm install

# Install lerna for monorepo management
echo ""
echo -e "${YELLOW}Installing lerna...${NC}"
npm install -g lerna@latest

# Bootstrap packages
echo ""
echo -e "${YELLOW}Bootstrapping packages...${NC}"
npx lerna bootstrap

# Build all packages
echo ""
echo -e "${YELLOW}Building packages...${NC}"
npm run build

# Create directories for logs and data
echo ""
echo -e "${YELLOW}Creating runtime directories...${NC}"

if [[ "$OS" == "Windows" ]]; then
    # Windows paths
    CYREAL_DATA="$APPDATA/cyreal"
    mkdir -p "$CYREAL_DATA/logs"
    mkdir -p "$CYREAL_DATA/data"
    mkdir -p "$CYREAL_DATA/config"
    echo -e "${GREEN}✓${NC} Created directories in $CYREAL_DATA"
else
    # Unix-like systems
    if [ "$EUID" -eq 0 ]; then
        # Running as root
        mkdir -p /var/log/cyreal
        mkdir -p /var/lib/cyreal
        mkdir -p /etc/cyreal
        echo -e "${GREEN}✓${NC} Created system directories"
    else
        # Running as user
        mkdir -p ~/.cyreal/logs
        mkdir -p ~/.cyreal/data
        mkdir -p ~/.config/cyreal
        echo -e "${GREEN}✓${NC} Created user directories in home folder"
    fi
fi

# Platform-specific setup
echo ""
echo -e "${YELLOW}Performing platform-specific setup...${NC}"

if [[ "$OS" == "Linux" ]]; then
    # Add user to dialout group for serial port access
    if groups $USER | grep -q '\bdialout\b'; then
        echo -e "${GREEN}✓${NC} User already in dialout group"
    else
        echo -e "${YELLOW}Adding user to dialout group for serial port access...${NC}"
        sudo usermod -a -G dialout $USER
        echo -e "${GREEN}✓${NC} Added to dialout group (logout required to take effect)"
    fi
fi

# Create symlink for global command
echo ""
echo -e "${YELLOW}Setting up global cyreald command...${NC}"
if [[ "$OS" == "Windows" ]]; then
    # Windows doesn't need symlinks with npm global install
    cd packages/cyreald && npm link && cd ../..
else
    # Unix-like systems
    cd packages/cyreald && sudo npm link && cd ../..
fi
echo -e "${GREEN}✓${NC} cyreald command available globally"

# Success message
echo ""
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}    Installation Complete!          ${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""
echo -e "${GREEN}You can now use Cyreal with:${NC}"
echo -e "  ${YELLOW}cyreald --help${NC}     - Show command options"
echo -e "  ${YELLOW}cyreald list${NC}       - List available serial ports"
echo -e "  ${YELLOW}cyreald start${NC}      - Start the daemon"
echo ""

if [[ "$OS" == "Linux" ]] && ! groups $USER | grep -q '\bdialout\b'; then
    echo -e "${YELLOW}Note: Please logout and login again for serial port access${NC}"
fi

if [[ "$OS" == "Windows" ]]; then
    echo -e "${YELLOW}Note: On Windows, use COM ports (e.g., COM1, COM3)${NC}"
fi