#!/bin/bash

# DY Official - Production Deployment Script
# Handles zero-downtime deployment with comprehensive validation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_ENV=${DEPLOY_ENV:-production}
DRY_RUN=${DRY_RUN:-false}
SKIP_TESTS=${SKIP_TESTS:-false}
ROLLBACK=${ROLLBACK:-false}
BACKUP_DB=${BACKUP_DB:-true}

# Docker configuration
IMAGE_NAME="dy-official"
CONTAINER_NAME="dy-official-app"
NETWORK_NAME="dy-official-network"

# Health check configuration
HEALTH_TIMEOUT=300  # 5 minutes
HEALTH_INTERVAL=10  # 10 seconds

# Functions
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

show_help() {
    cat << EOF
DY Official Production Deployment Script

Usage: $0 [OPTIONS]

Options:
    --dry-run           Show what would be done without executing
    --skip-tests        Skip running tests before deployment
    --rollback         Rollback to previous version
    --no-backup        Skip database backup
    --help             Show this help message

Environment Variables:
    DEPLOY_ENV         Deployment environment (default: production)
    DATABASE_URL       Production database URL
    REDIS_URL          Production Redis URL
    NEXTAUTH_SECRET    Authentication secret
    SENTRY_DSN         Sentry error tracking DSN

Examples:
    $0                 # Normal deployment
    $0 --dry-run       # Preview deployment actions
    $0 --rollback      # Rollback to previous version
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --rollback)
            ROLLBACK=true
            shift
            ;;
        --no-backup)
            BACKUP_DB=false
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Validation functions
validate_environment() {
    log "Validating environment configuration..."
    
    # Check required environment variables
    local required_vars=(
        "DATABASE_URL"
        "NEXTAUTH_SECRET"
        "NEXTAUTH_URL"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            error "Required environment variable $var is not set"
        fi
    done
    
    # Check optional but recommended variables
    local optional_vars=(
        "REDIS_URL"
        "SENTRY_DSN"
        "SMTP_HOST"
    )
    
    for var in "${optional_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            warning "Optional environment variable $var is not set"
        fi
    done
    
    success "Environment validation completed"
}

validate_database() {
    log "Validating database connection..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        success "[DRY RUN] Would validate database connection"
        return
    fi
    
    # Test database connection
    if ! npx tsx scripts/validate-environment.ts --database; then
        error "Database validation failed"
    fi
    
    success "Database connection validated"
}

backup_database() {
    if [[ "$BACKUP_DB" == "false" ]]; then
        log "Skipping database backup (--no-backup flag)"
        return
    fi
    
    log "Creating database backup..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        success "[DRY RUN] Would create database backup"
        return
    fi
    
    local backup_file="backup-$(date +%Y%m%d-%H%M%S).sql"
    
    if ! npx tsx scripts/backup-db.ts --output "$backup_file"; then
        error "Database backup failed"
    fi
    
    success "Database backup created: $backup_file"
}

run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log "Skipping tests (--skip-tests flag)"
        return
    fi
    
    log "Running test suite..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        success "[DRY RUN] Would run test suite"
        return
    fi
    
    # Run tests
    if ! npm test; then
        error "Tests failed. Deployment aborted."
    fi
    
    success "All tests passed"
}

build_application() {
    log "Building application..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        success "[DRY RUN] Would build application"
        return
    fi
    
    # Install dependencies
    npm ci --only=production
    
    # Build Next.js application
    npm run build
    
    success "Application built successfully"
}

build_docker_image() {
    log "Building Docker image..."
    
    local image_tag="$IMAGE_NAME:$(date +%Y%m%d-%H%M%S)"
    local latest_tag="$IMAGE_NAME:latest"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        success "[DRY RUN] Would build Docker image: $image_tag"
        return
    fi
    
    # Build Docker image
    docker build -t "$image_tag" -t "$latest_tag" .
    
    success "Docker image built: $image_tag"
}

deploy_with_zero_downtime() {
    log "Starting zero-downtime deployment..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        success "[DRY RUN] Would perform zero-downtime deployment"
        return
    fi
    
    # Create network if it doesn't exist
    docker network create "$NETWORK_NAME" 2>/dev/null || true
    
    # Start new container
    local new_container="$CONTAINER_NAME-new"
    local port_new=3001
    
    log "Starting new container..."
    docker run -d \
        --name "$new_container" \
        --network "$NETWORK_NAME" \
        -p "$port_new:3000" \
        --env-file .env.production \
        "$IMAGE_NAME:latest"
    
    # Wait for new container to be healthy
    wait_for_health "http://localhost:$port_new"
    
    # Stop old container if it exists
    if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
        log "Stopping old container..."
        docker stop "$CONTAINER_NAME" || true
        docker rm "$CONTAINER_NAME" || true
    fi
    
    # Rename new container
    docker rename "$new_container" "$CONTAINER_NAME"
    
    # Update port mapping
    docker stop "$CONTAINER_NAME"
    docker run -d \
        --name "$CONTAINER_NAME-final" \
        --network "$NETWORK_NAME" \
        -p "3000:3000" \
        --env-file .env.production \
        "$IMAGE_NAME:latest"
    
    docker rm "$CONTAINER_NAME"
    docker rename "$CONTAINER_NAME-final" "$CONTAINER_NAME"
    
    success "Zero-downtime deployment completed"
}

wait_for_health() {
    local health_url="$1/api/health"
    local timeout=$HEALTH_TIMEOUT
    local interval=$HEALTH_INTERVAL
    local elapsed=0
    
    log "Waiting for application to become healthy..."
    
    while [[ $elapsed -lt $timeout ]]; do
        if curl -f -s "$health_url" > /dev/null 2>&1; then
            success "Application is healthy"
            return 0
        fi
        
        sleep $interval
        elapsed=$((elapsed + interval))
        
        if [[ $((elapsed % 30)) -eq 0 ]]; then
            log "Still waiting for health check... ($elapsed/${timeout}s)"
        fi
    done
    
    error "Health check timeout after ${timeout}s"
}

run_database_migrations() {
    log "Running database migrations..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        success "[DRY RUN] Would run database migrations"
        return
    fi
    
    # Run Prisma migrations
    npx prisma migrate deploy
    
    success "Database migrations completed"
}

warm_caches() {
    log "Warming application caches..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        success "[DRY RUN] Would warm application caches"
        return
    fi
    
    # Run cache warming script
    npx tsx scripts/warm-cache.ts
    
    success "Caches warmed successfully"
}

optimize_database() {
    log "Optimizing database performance..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        success "[DRY RUN] Would optimize database"
        return
    fi
    
    # Run database optimization
    npx tsx scripts/optimize-database.ts
    
    success "Database optimization completed"
}

cleanup_old_images() {
    log "Cleaning up old Docker images..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        success "[DRY RUN] Would clean up old Docker images"
        return
    fi
    
    # Remove old images (keep last 3)
    docker images "$IMAGE_NAME" --format "table {{.Tag}}\t{{.ID}}" | \
        tail -n +4 | \
        awk '{print $2}' | \
        xargs -r docker rmi
    
    success "Old Docker images cleaned up"
}

perform_rollback() {
    log "Performing rollback to previous version..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        success "[DRY RUN] Would perform rollback"
        return
    fi
    
    # Get previous image
    local previous_image=$(docker images "$IMAGE_NAME" --format "{{.Tag}}" | sed -n '2p')
    
    if [[ -z "$previous_image" ]]; then
        error "No previous image found for rollback"
    fi
    
    # Deploy previous version
    log "Rolling back to image: $IMAGE_NAME:$previous_image"
    
    docker stop "$CONTAINER_NAME" || true
    docker rm "$CONTAINER_NAME" || true
    
    docker run -d \
        --name "$CONTAINER_NAME" \
        --network "$NETWORK_NAME" \
        -p "3000:3000" \
        --env-file .env.production \
        "$IMAGE_NAME:$previous_image"
    
    wait_for_health "http://localhost:3000"
    
    success "Rollback completed successfully"
}

# Main deployment process
main() {
    log "Starting DY Official production deployment..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        warning "DRY RUN MODE - No changes will be made"
    fi
    
    if [[ "$ROLLBACK" == "true" ]]; then
        perform_rollback
        log "Rollback deployment completed successfully!"
        exit 0
    fi
    
    # Pre-deployment validation
    validate_environment
    validate_database
    backup_database
    
    # Build and test
    run_tests
    build_application
    build_docker_image
    
    # Deploy
    run_database_migrations
    deploy_with_zero_downtime
    
    # Post-deployment optimization
    warm_caches
    optimize_database
    cleanup_old_images
    
    # Final health check
    wait_for_health "http://localhost:3000"
    
    success "Production deployment completed successfully!"
    log "Application is now live at: http://localhost:3000"
}

# Trap errors and provide cleanup
trap 'error "Deployment failed! Check logs above for details."' ERR

# Run main function
main "$@"