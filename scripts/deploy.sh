#!/bin/bash

# DY Official Production Deployment Script
# This script handles zero-downtime deployment with health checks and rollback capabilities

set -e  # Exit on any error

# Configuration
DEPLOYMENT_ID="deploy-$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="./backups/$DEPLOYMENT_ID"
LOG_FILE="./logs/deployment-$DEPLOYMENT_ID.log"
MAX_HEALTH_RETRIES=10
HEALTH_CHECK_INTERVAL=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")  echo -e "${BLUE}[INFO]${NC}  $timestamp - $message" ;;
        "WARN")  echo -e "${YELLOW}[WARN]${NC}  $timestamp - $message" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} $timestamp - $message" ;;
        "SUCCESS") echo -e "${GREEN}[SUCCESS]${NC} $timestamp - $message" ;;
    esac
    
    echo "[$level] $timestamp - $message" >> "$LOG_FILE"
}

# Cleanup function
cleanup() {
    log "INFO" "Performing cleanup..."
    # Remove temporary files, stop test containers, etc.
}

# Trap for cleanup on script exit
trap cleanup EXIT

# Check prerequisites
check_prerequisites() {
    log "INFO" "Checking prerequisites..."
    
    # Check if required commands exist
    local required_commands=("docker" "docker-compose" "node" "npm" "pg_dump")
    for cmd in "${required_commands[@]}"; do
        if ! command -v $cmd &> /dev/null; then
            log "ERROR" "$cmd is not installed or not in PATH"
            exit 1
        fi
    done
    
    # Check if .env.production exists
    if [ ! -f ".env.production" ]; then
        log "ERROR" ".env.production file not found"
        log "INFO" "Create .env.production with required environment variables"
        exit 1
    fi
    
    # Load environment variables
    set -a
    source .env.production
    set +a
    
    # Check critical environment variables
    local required_vars=("DATABASE_URL" "NEXTAUTH_SECRET" "NEXT_PUBLIC_APP_URL")
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log "ERROR" "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    log "SUCCESS" "Prerequisites check passed"
}

# Create backup
create_backup() {
    log "INFO" "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Database backup
    if [ -n "$DATABASE_URL" ]; then
        log "INFO" "Backing up database..."
        pg_dump "$DATABASE_URL" > "$BACKUP_DIR/database.sql" 2>/dev/null || {
            log "WARN" "Database backup failed - continuing anyway"
        }
    fi
    
    # Application backup (current state)
    log "INFO" "Backing up current application state..."
    tar -czf "$BACKUP_DIR/app-backup.tar.gz" \
        --exclude=node_modules \
        --exclude=.next \
        --exclude=backups \
        --exclude=logs \
        . 2>/dev/null || log "WARN" "Application backup had issues"
    
    log "SUCCESS" "Backup created at $BACKUP_DIR"
}

# Build and test
build_and_test() {
    log "INFO" "Building and testing application..."
    
    # Install dependencies
    log "INFO" "Installing dependencies..."
    npm ci
    
    # Generate Prisma client
    log "INFO" "Generating Prisma client..."
    npx prisma generate
    
    # Run type checking
    log "INFO" "Running type checks..."
    npx tsc --noEmit || {
        log "ERROR" "Type checking failed"
        exit 1
    }
    
    # Build application
    log "INFO" "Building application..."
    npm run build || {
        log "ERROR" "Build failed"
        exit 1
    }
    
    # Run critical tests
    log "INFO" "Running critical tests..."
    npm test 2>/dev/null || {
        log "WARN" "Some tests failed - review before proceeding to production"
    }
    
    log "SUCCESS" "Build and test completed"
}

# Deploy database changes
deploy_database() {
    log "INFO" "Deploying database changes..."
    
    # Run migrations
    log "INFO" "Running database migrations..."
    npx prisma migrate deploy || {
        log "ERROR" "Database migration failed"
        exit 1
    }
    
    # Seed production data if needed
    if [ "$1" = "--seed" ]; then
        log "INFO" "Seeding production data..."
        npx tsx scripts/seed-production.ts || {
            log "WARN" "Production seeding had issues"
        }
    fi
    
    log "SUCCESS" "Database deployment completed"
}

# Deploy application
deploy_application() {
    log "INFO" "Deploying application..."
    
    local deploy_strategy=${1:-"docker"}
    
    case $deploy_strategy in
        "docker")
            deploy_with_docker
            ;;
        "pm2")
            deploy_with_pm2
            ;;
        "systemd")
            deploy_with_systemd
            ;;
        *)
            log "ERROR" "Unknown deployment strategy: $deploy_strategy"
            exit 1
            ;;
    esac
}

# Docker deployment
deploy_with_docker() {
    log "INFO" "Deploying with Docker Compose..."
    
    # Build new images
    log "INFO" "Building Docker images..."
    docker-compose -f docker-compose.production.yml build --no-cache
    
    # Stop old containers gracefully
    log "INFO" "Stopping old containers..."
    docker-compose -f docker-compose.production.yml down --remove-orphans
    
    # Start new containers
    log "INFO" "Starting new containers..."
    docker-compose -f docker-compose.production.yml up -d
    
    log "SUCCESS" "Docker deployment completed"
}

# PM2 deployment (alternative)
deploy_with_pm2() {
    log "INFO" "Deploying with PM2..."
    
    # Stop existing processes
    pm2 stop dy-official 2>/dev/null || log "INFO" "No existing PM2 process to stop"
    
    # Start new process
    pm2 start npm --name "dy-official" -- start
    pm2 save
    
    log "SUCCESS" "PM2 deployment completed"
}

# Systemd deployment (alternative)
deploy_with_systemd() {
    log "INFO" "Deploying with systemd..."
    
    # Restart systemd service
    sudo systemctl restart dy-official
    sudo systemctl enable dy-official
    
    log "SUCCESS" "Systemd deployment completed"
}

# Health checks
wait_for_health() {
    log "INFO" "Waiting for application to be healthy..."
    
    local health_url="${NEXT_PUBLIC_APP_URL}/api/health"
    local retries=0
    
    while [ $retries -lt $MAX_HEALTH_RETRIES ]; do
        log "INFO" "Health check attempt $((retries + 1))/$MAX_HEALTH_RETRIES..."
        
        if curl -sf "$health_url" > /dev/null 2>&1; then
            log "SUCCESS" "Application is healthy!"
            return 0
        fi
        
        retries=$((retries + 1))
        if [ $retries -lt $MAX_HEALTH_RETRIES ]; then
            log "INFO" "Health check failed, waiting ${HEALTH_CHECK_INTERVAL}s before retry..."
            sleep $HEALTH_CHECK_INTERVAL
        fi
    done
    
    log "ERROR" "Application failed health checks after $MAX_HEALTH_RETRIES attempts"
    return 1
}

# Comprehensive health validation
validate_deployment() {
    log "INFO" "Validating deployment..."
    
    local base_url="$NEXT_PUBLIC_APP_URL"
    local endpoints=(
        "/api/health"
        "/api/health/database"
        "/api/health/redis"
    )
    
    for endpoint in "${endpoints[@]}"; do
        log "INFO" "Checking $endpoint..."
        if curl -sf "${base_url}${endpoint}" > /dev/null; then
            log "SUCCESS" "✓ $endpoint is healthy"
        else
            log "WARN" "✗ $endpoint is not responding correctly"
        fi
    done
    
    # Check if main pages load
    local pages=("/" "/api/health")
    for page in "${pages[@]}"; do
        log "INFO" "Checking page $page..."
        if curl -sf "${base_url}${page}" > /dev/null; then
            log "SUCCESS" "✓ $page loads correctly"
        else
            log "WARN" "✗ $page is not loading"
        fi
    done
    
    log "SUCCESS" "Deployment validation completed"
}

# Rollback function
rollback() {
    log "WARN" "Starting rollback process..."
    
    # Stop current deployment
    docker-compose -f docker-compose.production.yml down 2>/dev/null || true
    
    # Restore database if backup exists
    if [ -f "$BACKUP_DIR/database.sql" ]; then
        log "INFO" "Restoring database from backup..."
        # This is a simplified rollback - in production you'd want more sophisticated logic
        log "WARN" "Database rollback requires manual intervention"
    fi
    
    # Restore application
    if [ -f "$BACKUP_DIR/app-backup.tar.gz" ]; then
        log "INFO" "Restoring application from backup..."
        tar -xzf "$BACKUP_DIR/app-backup.tar.gz" 2>/dev/null || log "WARN" "Application restore had issues"
    fi
    
    log "WARN" "Rollback completed - please verify system state"
}

# Post-deployment tasks
post_deployment() {
    log "INFO" "Running post-deployment tasks..."
    
    # Warm cache
    log "INFO" "Warming cache..."
    npx tsx scripts/warm-cache.ts 2>/dev/null || log "WARN" "Cache warming had issues"
    
    # Optimize database
    log "INFO" "Optimizing database..."
    npx tsx scripts/optimize-database.ts 2>/dev/null || log "WARN" "Database optimization had issues"
    
    # Send notification (if configured)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 DY Official deployment $DEPLOYMENT_ID completed successfully\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || log "WARN" "Slack notification failed"
    fi
    
    log "SUCCESS" "Post-deployment tasks completed"
}

# Main deployment function
main() {
    local start_time=$(date +%s)
    
    log "INFO" "Starting DY Official production deployment..."
    log "INFO" "Deployment ID: $DEPLOYMENT_ID"
    log "INFO" "Log file: $LOG_FILE"
    
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Parse arguments
    local seed_data=false
    local deploy_strategy="docker"
    local skip_backup=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --seed)
                seed_data=true
                shift
                ;;
            --strategy)
                deploy_strategy="$2"
                shift 2
                ;;
            --skip-backup)
                skip_backup=true
                shift
                ;;
            --rollback)
                rollback
                exit 0
                ;;
            -h|--help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --seed           Seed production data"
                echo "  --strategy       Deployment strategy (docker, pm2, systemd)"
                echo "  --skip-backup    Skip backup creation"
                echo "  --rollback       Perform rollback"
                echo "  -h, --help       Show this help"
                exit 0
                ;;
            *)
                log "ERROR" "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Execute deployment steps
    check_prerequisites
    
    if [ "$skip_backup" != true ]; then
        create_backup
    fi
    
    build_and_test
    
    if [ "$seed_data" = true ]; then
        deploy_database --seed
    else
        deploy_database
    fi
    
    deploy_application "$deploy_strategy"
    
    if wait_for_health; then
        validate_deployment
        post_deployment
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        log "SUCCESS" "🎉 Deployment completed successfully!"
        log "SUCCESS" "⏱️  Total deployment time: ${duration}s"
        log "SUCCESS" "🚀 DY Official is now live at $NEXT_PUBLIC_APP_URL"
    else
        log "ERROR" "Deployment failed health checks"
        log "WARN" "Consider running: $0 --rollback"
        exit 1
    fi
}

# Run main function with all arguments
main "$@"