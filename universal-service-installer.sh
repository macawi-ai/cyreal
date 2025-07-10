#!/bin/bash

# Cyreal Universal Service Installer
# Cross-platform installation script for Cyreal Core Service
# Supports: Linux (systemd/sysvinit), macOS (launchd), Windows (via WSL)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="cyreal-core"
DISPLAY_NAME="Cyreal Core Service"
DESCRIPTION="Cybernetic Serial Port Bridge for AI Systems"
REPO_URL="https://github.com/macawi-ai/cyreal.git"
INSTALL_DIR="/opt/cyreal"
LOG_DIR="/var/log/cyreal"
DATA_DIR="/var/lib/cyreal"
CONFIG_DIR="/etc/cyreal"

# Function to print colored output
print_status() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                  🚀 CYREAL UNIVERSAL INSTALLER 🚀              ║"
    echo "║                                                               ║"
    echo "║           Cross-Platform Cybernetic Service Manager           ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Detect platform and service manager
detect_platform() {
    OS=$(uname -s)
    ARCH=$(uname -m)
    
    case $OS in
        Linux*)
            PLATFORM="linux"
            if systemctl --version >/dev/null 2>&1; then
                SERVICE_MANAGER="systemd"
            elif [ -d "/etc/init.d" ]; then
                SERVICE_MANAGER="sysvinit"
            else
                SERVICE_MANAGER="unknown"
            fi
            ;;
        Darwin*)
            PLATFORM="darwin"
            SERVICE_MANAGER="launchd"
            ;;
        CYGWIN*|MINGW*|MSYS*)
            PLATFORM="windows"
            SERVICE_MANAGER="scm"
            ;;
        *)
            PLATFORM="unknown"
            SERVICE_MANAGER="unknown"
            ;;
    esac
    
    print_status "Platform: $PLATFORM ($ARCH)"
    print_status "Service Manager: $SERVICE_MANAGER"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check for required commands
    local missing_commands=()
    
    case $PLATFORM in
        linux)
            command -v git >/dev/null 2>&1 || missing_commands+=(\"git\")\n            command -v node >/dev/null 2>&1 || missing_commands+=(\"node\")\n            command -v npm >/dev/null 2>&1 || missing_commands+=(\"npm\")\n            \n            if [ \"$SERVICE_MANAGER\" = \"systemd\" ]; then\n                command -v systemctl >/dev/null 2>&1 || missing_commands+=(\"systemctl\")\n            fi\n            ;;\n        darwin)\n            command -v git >/dev/null 2>&1 || missing_commands+=(\"git\")\n            command -v node >/dev/null 2>&1 || missing_commands+=(\"node\")\n            command -v npm >/dev/null 2>&1 || missing_commands+=(\"npm\")\n            command -v launchctl >/dev/null 2>&1 || missing_commands+=(\"launchctl\")\n            ;;\n    esac\n    \n    if [ ${#missing_commands[@]} -ne 0 ]; then\n        print_error \"Missing required commands: ${missing_commands[*]}\"\n        exit 1\n    fi\n    \n    # Check permissions\n    if [ \"$EUID\" -ne 0 ] && [ \"$PLATFORM\" != \"darwin\" ]; then\n        print_warning \"This installer may require sudo privileges for system integration\"\n    fi\n    \n    print_success \"Prerequisites check passed\"\n}\n\n# Install Node.js dependencies if needed\ninstall_nodejs() {\n    if ! command -v node >/dev/null 2>&1; then\n        print_status \"Installing Node.js...\"\n        \n        case $PLATFORM in\n            linux)\n                if command -v apt-get >/dev/null 2>&1; then\n                    sudo apt-get update\n                    sudo apt-get install -y nodejs npm\n                elif command -v dnf >/dev/null 2>&1; then\n                    sudo dnf install -y nodejs npm\n                elif command -v pacman >/dev/null 2>&1; then\n                    sudo pacman -S nodejs npm\n                else\n                    print_error \"Unable to install Node.js automatically. Please install manually.\"\n                    exit 1\n                fi\n                ;;\n            darwin)\n                if command -v brew >/dev/null 2>&1; then\n                    brew install node\n                else\n                    print_error \"Please install Node.js manually from https://nodejs.org\"\n                    exit 1\n                fi\n                ;;\n        esac\n        \n        print_success \"Node.js installed\"\n    else\n        NODE_VERSION=$(node --version)\n        print_status \"Node.js already installed: $NODE_VERSION\"\n    fi\n}\n\n# Clone and build Cyreal\nbuild_cyreal() {\n    print_status \"Building Cyreal from source...\"\n    \n    # Create temporary build directory\n    BUILD_DIR=$(mktemp -d)\n    cd \"$BUILD_DIR\"\n    \n    # Clone repository\n    print_status \"Cloning repository...\"\n    git clone \"$REPO_URL\" cyreal\n    cd cyreal\n    \n    # Install dependencies and build\n    print_status \"Installing dependencies...\"\n    npm install --workspaces\n    \n    print_status \"Building packages...\"\n    npm run build --workspaces\n    \n    # Create installation directory\n    print_status \"Installing to $INSTALL_DIR...\"\n    sudo mkdir -p \"$INSTALL_DIR\"\n    sudo cp -r . \"$INSTALL_DIR/\"\n    \n    # Create symlink for global access\n    sudo ln -sf \"$INSTALL_DIR/packages/cyreald/dist/cli.js\" \"/usr/local/bin/cyreal-core\"\n    sudo chmod +x \"/usr/local/bin/cyreal-core\"\n    \n    # Cleanup\n    cd /\n    rm -rf \"$BUILD_DIR\"\n    \n    print_success \"Cyreal built and installed\"\n}\n\n# Install as system service\ninstall_service() {\n    print_status \"Installing Cyreal as system service...\"\n    \n    # Create system directories\n    sudo mkdir -p \"$LOG_DIR\" \"$DATA_DIR\" \"$CONFIG_DIR\"\n    \n    # Use the universal installer\n    cd \"$INSTALL_DIR\"\n    sudo \"$INSTALL_DIR/packages/cyreald/dist/cli.js\" service --install \\\n        --name \"$SERVICE_NAME\" \\\n        --user cyreal \\\n        --group cyreal \\\n        --force\n    \n    print_success \"Service installed successfully\"\n}\n\n# Post-installation setup\npost_install() {\n    print_status \"Performing post-installation setup...\"\n    \n    # Set proper permissions\n    case $PLATFORM in\n        linux|darwin)\n            sudo chown -R cyreal:cyreal \"$DATA_DIR\" \"$LOG_DIR\" 2>/dev/null || true\n            sudo chmod 755 \"$DATA_DIR\" \"$LOG_DIR\" 2>/dev/null || true\n            ;;\n    esac\n    \n    # Display service status\n    print_status \"Checking service status...\"\n    cyreal-core service --status\n    \n    print_success \"Post-installation setup completed\"\n}\n\n# Display completion message\nshow_completion() {\n    echo -e \"${GREEN}\"\n    echo \"╔═══════════════════════════════════════════════════════════════╗\"\n    echo \"║                     🎉 INSTALLATION COMPLETE! 🎉              ║\"\n    echo \"╚═══════════════════════════════════════════════════════════════╝\"\n    echo -e \"${NC}\"\n    \n    echo \"Next steps:\"\n    echo \"  1. Edit configuration: sudo nano $CONFIG_DIR/cyreal.yaml\"\n    echo \"  2. Start service: cyreal-core service --start\"\n    echo \"  3. Check status: cyreal-core service --status\"\n    echo \"  4. View logs: tail -f $LOG_DIR/cyreal-core.log\"\n    echo \"\"\n    \n    case $SERVICE_MANAGER in\n        systemd)\n            echo \"systemd commands:\"\n            echo \"  sudo systemctl start $SERVICE_NAME\"\n            echo \"  sudo systemctl status $SERVICE_NAME\"\n            echo \"  sudo systemctl enable $SERVICE_NAME\"\n            ;;\n        launchd)\n            echo \"launchd commands:\"\n            echo \"  sudo launchctl load /Library/LaunchDaemons/com.cyreal.$SERVICE_NAME.plist\"\n            echo \"  sudo launchctl list | grep cyreal\"\n            ;;\n    esac\n    \n    echo \"\"\n    echo \"Documentation: https://docs.cyreal.io\"\n    echo \"Support: https://github.com/macawi-ai/cyreal/issues\"\n}\n\n# Uninstall function\nuninstall() {\n    print_status \"Uninstalling Cyreal service...\"\n    \n    # Stop and uninstall service\n    cyreal-core service --stop || true\n    cyreal-core service --uninstall --force || true\n    \n    # Remove installation\n    sudo rm -rf \"$INSTALL_DIR\"\n    sudo rm -f \"/usr/local/bin/cyreal-core\"\n    \n    # Optionally remove data\n    read -p \"Remove data and logs? [y/N]: \" -n 1 -r\n    echo\n    if [[ $REPLY =~ ^[Yy]$ ]]; then\n        sudo rm -rf \"$DATA_DIR\" \"$LOG_DIR\" \"$CONFIG_DIR\"\n        print_success \"Data and logs removed\"\n    fi\n    \n    print_success \"Cyreal uninstalled\"\n}\n\n# Main installation function\nmain() {\n    case \"${1:-install}\" in\n        install)\n            print_header\n            detect_platform\n            check_prerequisites\n            install_nodejs\n            build_cyreal\n            install_service\n            post_install\n            show_completion\n            ;;\n        uninstall)\n            uninstall\n            ;;\n        status)\n            detect_platform\n            if command -v cyreal-core >/dev/null 2>&1; then\n                cyreal-core service --status\n            else\n                print_error \"Cyreal not installed\"\n                exit 1\n            fi\n            ;;\n        *)\n            echo \"Usage: $0 {install|uninstall|status}\"\n            echo \"\"\n            echo \"Commands:\"\n            echo \"  install    - Install Cyreal Core Service\"\n            echo \"  uninstall  - Uninstall Cyreal Core Service\"\n            echo \"  status     - Show service status\"\n            exit 1\n            ;;\n    esac\n}\n\n# Run main function with all arguments\nmain \"$@\"\n"
}]
[" with ""
                esac
    fi
}

install_cyreal() {
    print_status "Installing Cyreal dependencies..."
    
    # Create installation directory
    sudo mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    
    # Clone repository
    print_status "Cloning Cyreal repository..."
    git clone "$REPO_URL" .
    
    # Install dependencies
    print_status "Installing Node.js dependencies..."
    npm install --workspaces
    
    # Build packages
    print_status "Building Cyreal packages..."
    npm run build --workspaces
    
    # Create global command symlink
    sudo ln -sf "$INSTALL_DIR/packages/cyreald/dist/cli.js" "/usr/local/bin/cyreal-core"
    sudo chmod +x "/usr/local/bin/cyreal-core"
    
    print_success "Cyreal installed successfully"
}

# Install as system service
install_service() {
    print_status "Installing Cyreal as system service..."
    
    # Create system directories
    sudo mkdir -p "$LOG_DIR" "$DATA_DIR" "$CONFIG_DIR"
    
    # Use the universal installer
    sudo cyreal-core service --install \
        --name "$SERVICE_NAME" \
        --user cyreal \
        --group cyreal \
        --force
    
    print_success "Service installed successfully"
}

# Post-installation setup
post_install() {
    print_status "Performing post-installation setup..."
    
    # Set proper permissions
    case $PLATFORM in
        linux|darwin)
            sudo chown -R cyreal:cyreal "$DATA_DIR" "$LOG_DIR" 2>/dev/null || true
            sudo chmod 755 "$DATA_DIR" "$LOG_DIR" 2>/dev/null || true
            ;;
    esac
    
    # Display service status
    print_status "Checking service status..."
    cyreal-core service --status
    
    print_success "Post-installation setup completed"
}

# Display completion message
show_completion() {
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                     🎉 INSTALLATION COMPLETE! 🎉              ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo "Next steps:"
    echo "  1. Edit configuration: sudo nano $CONFIG_DIR/cyreal.yaml"
    echo "  2. Start service: cyreal-core service --start"
    echo "  3. Check status: cyreal-core service --status"
    echo "  4. View logs: tail -f $LOG_DIR/cyreal-core.log"
    echo ""
    
    case $SERVICE_MANAGER in
        systemd)
            echo "systemd commands:"
            echo "  sudo systemctl start $SERVICE_NAME"
            echo "  sudo systemctl status $SERVICE_NAME"
            echo "  sudo systemctl enable $SERVICE_NAME"
            ;;
        launchd)
            echo "launchd commands:"
            echo "  sudo launchctl load /Library/LaunchDaemons/com.cyreal.$SERVICE_NAME.plist"
            echo "  sudo launchctl list | grep cyreal"
            ;;
    esac
    
    echo ""
    echo "Documentation: https://docs.cyreal.io"
    echo "Support: https://github.com/macawi-ai/cyreal/issues"
}

# Uninstall function
uninstall() {
    print_status "Uninstalling Cyreal service..."
    
    # Stop and uninstall service
    cyreal-core service --stop || true
    cyreal-core service --uninstall --force || true
    
    # Remove installation
    sudo rm -rf "$INSTALL_DIR"
    sudo rm -f "/usr/local/bin/cyreal-core"
    
    # Optionally remove data
    read -p "Remove data and logs? [y/N]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo rm -rf "$DATA_DIR" "$LOG_DIR" "$CONFIG_DIR"
        print_success "Data and logs removed"
    fi
    
    print_success "Cyreal uninstalled"
}

# Main installation function
main() {
    case "${1:-install}" in
        install)
            print_header
            detect_platform
            check_prerequisites
            install_nodejs
            install_cyreal
            install_service
            post_install
            show_completion
            ;;
        uninstall)
            uninstall
            ;;
        status)
            detect_platform
            if command -v cyreal-core >/dev/null 2>&1; then
                cyreal-core service --status
            else
                print_error "Cyreal not installed"
                exit 1
            fi
            ;;
        *)
            echo "Usage: $0 {install|uninstall|status}"
            echo ""
            echo "Commands:"
            echo "  install    - Install Cyreal Core Service"
            echo "  uninstall  - Uninstall Cyreal Core Service"
            echo "  status     - Show service status"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"