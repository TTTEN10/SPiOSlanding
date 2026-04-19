#!/bin/bash

# Disaster Recovery Script
# Automated disaster recovery procedures for MongoDB, Redis, and GPU infrastructure
# Follows SafePsy security standards

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${LOG_FILE:-/var/log/safepsy/dr-disaster-recovery.log}"
DR_MODE="${DR_MODE:-full}"  # full, mongodb, redis, gpu
RECOVERY_POINT="${RECOVERY_POINT:-latest}"  # latest or timestamp
BACKUP_SOURCE="${BACKUP_SOURCE:-local}"  # local or s3

# MongoDB DR Configuration
MONGODB_HOST="${MONGODB_DR_HOST:-localhost}"
MONGODB_PORT="${MONGODB_DR_PORT:-27017}"
MONGODB_USER="${MONGODB_DR_USER:-}"
MONGODB_PASSWORD="${MONGODB_DR_PASSWORD:-}"
MONGODB_DATABASES="${MONGODB_DR_DATABASES:-}"

# Redis DR Configuration
REDIS_HOST="${REDIS_DR_HOST:-localhost}"
REDIS_PORT="${REDIS_DR_PORT:-6379}"
REDIS_PASSWORD="${REDIS_DR_PASSWORD:-}"
REDIS_DB="${REDIS_DR_DB:-0}"

# GPU DR Configuration
GPU_IMAGE_NAMES="${GPU_DR_IMAGE_NAMES:-}"
GPU_VOLUME_NAMES="${GPU_DR_VOLUME_NAMES:-}"

# Backup locations
BACKUP_DIR="${BACKUP_DIR:-/backups}"
S3_BUCKET="${DR_S3_BUCKET:-}"
S3_REGION="${DR_S3_REGION:-us-east-1}"

# Logging
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" >&2
    exit 1
}

warn() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1" | tee -a "$LOG_FILE"
}

# Function to verify backup availability
verify_backups() {
    local component="$1"
    log "Verifying backups for component: $component"
    
    case "$component" in
        mongodb)
            local backup_pattern="mongodb_*.enc"
            ;;
        redis)
            local backup_pattern="redis_*.enc"
            ;;
        gpu)
            local backup_pattern="gpu_*.enc"
            ;;
        *)
            error "Unknown component: $component"
            ;;
    esac
    
    if [ "$BACKUP_SOURCE" = "local" ]; then
        local backup_count=$(find "$BACKUP_DIR/$component" -name "$backup_pattern" -type f 2>/dev/null | wc -l)
        if [ "$backup_count" -eq 0 ]; then
            error "No backups found for component: $component"
        fi
        log "Found $backup_count backup(s) for component: $component"
    elif [ "$BACKUP_SOURCE" = "s3" ]; then
        if ! command -v aws &> /dev/null; then
            error "AWS CLI not found. Install it to use S3 backups."
        fi
        log "Verifying S3 backups for component: $component"
        # S3 verification would be done during restore
    fi
}

# Function to find latest backup
find_latest_backup() {
    local component="$1"
    local backup_pattern=""
    
    case "$component" in
        mongodb)
            backup_pattern="mongodb_*.enc"
            ;;
        redis)
            backup_pattern="redis_*.enc"
            ;;
        gpu)
            backup_pattern="gpu_*.enc"
            ;;
    esac
    
    if [ "$BACKUP_SOURCE" = "local" ]; then
        find "$BACKUP_DIR/$component" -name "$backup_pattern" -type f -printf '%T@ %p\n' 2>/dev/null | \
            sort -n | tail -1 | cut -d' ' -f2- || error "No backup found for component: $component"
    elif [ "$BACKUP_SOURCE" = "s3" ]; then
        # Return S3 path - actual file selection done in restore script
        echo "s3://${S3_BUCKET}/${component}-backups/"
    fi
}

# Function to perform MongoDB DR
dr_mongodb() {
    log "=== Starting MongoDB Disaster Recovery ==="
    
    verify_backups "mongodb"
    
    # Find backup file
    local backup_file=$(find_latest_backup "mongodb")
    if [ -z "$backup_file" ]; then
        error "No MongoDB backup found"
    fi
    
    log "Using backup file: $backup_file"
    
    # Run restore script
    local restore_script="${SCRIPT_DIR}/restore-mongodb.sh"
    if [ ! -f "$restore_script" ]; then
        error "Restore script not found: $restore_script"
    fi
    
    # Extract database name from backup file if not specified
    if [ -z "$MONGODB_DATABASES" ]; then
        MONGODB_DATABASES=$(basename "$backup_file" | sed -n 's/mongodb_\(.*\)_\([0-9]*_[0-9]*\)\.archive\.\(gz\|bz2\|xz\)\.enc/\1/p')
    fi
    
    if [ -z "$MONGODB_DATABASES" ]; then
        error "Cannot determine database name from backup file"
    fi
    
    log "Restoring database: $MONGODB_DATABASES"
    DROP_BEFORE_RESTORE=true \
    "$restore_script" "$backup_file" "$MONGODB_DATABASES" 2>&1 | tee -a "$LOG_FILE" || error "MongoDB restore failed"
    
    log "=== MongoDB Disaster Recovery Completed ==="
}

# Function to perform Redis DR
dr_redis() {
    log "=== Starting Redis Disaster Recovery ==="
    
    verify_backups "redis"
    
    # Find backup file
    local backup_file=$(find_latest_backup "redis")
    if [ -z "$backup_file" ]; then
        error "No Redis backup found"
    fi
    
    log "Using backup file: $backup_file"
    
    # Run restore script
    local restore_script="${SCRIPT_DIR}/restore-redis.sh"
    if [ ! -f "$restore_script" ]; then
        error "Restore script not found: $restore_script"
    fi
    
    log "Restoring Redis database: $REDIS_DB"
    FLUSHDB_BEFORE_RESTORE=true \
    "$restore_script" "$backup_file" 2>&1 | tee -a "$LOG_FILE" || error "Redis restore failed"
    
    log "=== Redis Disaster Recovery Completed ==="
}

# Function to perform GPU DR
dr_gpu() {
    log "=== Starting GPU Disaster Recovery ==="
    
    verify_backups "gpu"
    
    # Find backup files
    local backup_files=$(find "$BACKUP_DIR/gpu-images" -name "gpu_*.enc" -type f 2>/dev/null | head -1)
    
    if [ -z "$backup_files" ]; then
        warn "No GPU backups found. Skipping GPU recovery."
        return
    fi
    
    log "Using backup files: $backup_files"
    
    # Run restore script for images
    if [ -n "$GPU_IMAGE_NAMES" ]; then
        local restore_script="${SCRIPT_DIR}/restore-gpu-images.sh"
        if [ -f "$restore_script" ]; then
            for image_name in $GPU_IMAGE_NAMES; do
                # Find matching backup file
                local image_backup=$(find "$BACKUP_DIR/gpu-images" -name "*image*$(echo $image_name | tr '/:' '_')*.enc" -type f 2>/dev/null | head -1)
                if [ -n "$image_backup" ]; then
                    log "Restoring GPU image: $image_name"
                    "$restore_script" "$image_backup" "image" "$image_name" 2>&1 | tee -a "$LOG_FILE" || warn "GPU image restore failed: $image_name"
                fi
            done
        fi
    fi
    
    # Run restore script for volumes
    if [ -n "$GPU_VOLUME_NAMES" ]; then
        local restore_script="${SCRIPT_DIR}/restore-gpu-images.sh"
        if [ -f "$restore_script" ]; then
            for volume_name in $GPU_VOLUME_NAMES; do
                # Find matching backup file
                local volume_backup=$(find "$BACKUP_DIR/gpu-images" -name "*volume*${volume_name}*.enc" -type f 2>/dev/null | head -1)
                if [ -n "$volume_backup" ]; then
                    log "Restoring GPU volume: $volume_name"
                    "$restore_script" "$volume_backup" "volume" "$volume_name" 2>&1 | tee -a "$LOG_FILE" || warn "GPU volume restore failed: $volume_name"
                fi
            done
        fi
    fi
    
    log "=== GPU Disaster Recovery Completed ==="
}

# Function to verify services after recovery
verify_services() {
    log "=== Verifying Services After Recovery ==="
    
    # Verify MongoDB
    if [ "$DR_MODE" = "full" ] || [ "$DR_MODE" = "mongodb" ]; then
        log "Verifying MongoDB connection..."
        if command -v mongo &> /dev/null; then
            local mongo_uri="mongodb://${MONGODB_USER}:${MONGODB_PASSWORD}@${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_AUTH_DB:-admin}"
            mongo "$mongo_uri" --eval "db.adminCommand('ping')" &>/dev/null && log "MongoDB is accessible" || warn "MongoDB may not be accessible"
        fi
    fi
    
    # Verify Redis
    if [ "$DR_MODE" = "full" ] || [ "$DR_MODE" = "redis" ]; then
        log "Verifying Redis connection..."
        local redis_cmd="redis-cli -h $REDIS_HOST -p $REDIS_PORT"
        if [ -n "$REDIS_PASSWORD" ]; then
            redis_cmd="$redis_cmd -a $REDIS_PASSWORD"
        fi
        $redis_cmd ping &>/dev/null && log "Redis is accessible" || warn "Redis may not be accessible"
    fi
    
    # Verify Docker/GPU
    if [ "$DR_MODE" = "full" ] || [ "$DR_MODE" = "gpu" ]; then
        log "Verifying Docker..."
        docker ps &>/dev/null && log "Docker is accessible" || warn "Docker may not be accessible"
    fi
    
    log "=== Service Verification Completed ==="
}

# Main execution
log "=== Disaster Recovery Started ==="
log "DR Mode: $DR_MODE"
log "Recovery Point: $RECOVERY_POINT"
log "Backup Source: $BACKUP_SOURCE"

# Perform DR based on mode
case "$DR_MODE" in
    mongodb)
        dr_mongodb
        ;;
    redis)
        dr_redis
        ;;
    gpu)
        dr_gpu
        ;;
    full)
        dr_mongodb
        dr_redis
        dr_gpu
        ;;
    *)
        error "Invalid DR mode: $DR_MODE (must be: full, mongodb, redis, or gpu)"
        ;;
esac

# Verify services after recovery
verify_services

log "=== Disaster Recovery Completed ==="
log "Recovery completed successfully"

exit 0

