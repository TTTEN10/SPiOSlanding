#!/bin/bash

# Redis Backup Script
# Creates encrypted backups of Redis databases
# Follows SafePsy security standards: AES-256-GCM encryption

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/redis}"
RETENTION_DAYS="${REDIS_BACKUP_RETENTION_DAYS:-30}"
ENCRYPT_KEY="${REDIS_BACKUP_ENCRYPT_KEY:-}"
COMPRESSION="${REDIS_BACKUP_COMPRESSION:-gzip}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Redis Configuration
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
REDIS_DB="${REDIS_DB:-0}"

# Remote storage configuration (optional)
REMOTE_STORAGE_ENABLED="${REDIS_REMOTE_BACKUP_ENABLED:-false}"
REMOTE_STORAGE_TYPE="${REDIS_REMOTE_STORAGE_TYPE:-s3}"
S3_BUCKET="${REDIS_S3_BUCKET:-}"
S3_REGION="${REDIS_S3_REGION:-us-east-1}"
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}"

# Logging
LOG_FILE="${LOG_FILE:-/var/log/safepsy/backup-redis.log}"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" >&2
    exit 1
}

# Verify redis-cli is available
if ! command -v redis-cli &> /dev/null; then
    error "redis-cli not found. Please install Redis client tools."
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Build Redis connection command
REDIS_CMD="redis-cli -h $REDIS_HOST -p $REDIS_PORT"
if [ -n "$REDIS_PASSWORD" ]; then
    REDIS_CMD="$REDIS_CMD -a $REDIS_PASSWORD"
fi
if [ -n "$REDIS_DB" ] && [ "$REDIS_DB" != "0" ]; then
    REDIS_CMD="$REDIS_CMD -n $REDIS_DB"
fi

# Test Redis connection
if ! $REDIS_CMD ping &>/dev/null; then
    error "Cannot connect to Redis at $REDIS_HOST:$REDIS_PORT"
fi

log "Connected to Redis successfully"

# Function to encrypt backup using AES-256-GCM (OpenSSL)
encrypt_backup() {
    local input_file="$1"
    local output_file="$2"
    
    if [ -z "$ENCRYPT_KEY" ]; then
        log "WARNING: Encryption key not set. Backup will not be encrypted."
        cp "$input_file" "$output_file"
        return
    fi
    
    # Use OpenSSL with AES-256-GCM (same as app security standards)
    openssl enc -aes-256-gcm -salt -pbkdf2 -iter 100000 -in "$input_file" -out "$output_file" -k "$ENCRYPT_KEY" 2>>"$LOG_FILE" || error "Encryption failed"
    log "Backup encrypted using AES-256-GCM"
}

# Function to upload to S3
upload_to_s3() {
    local file_path="$1"
    local s3_key="redis-backups/$(basename "$file_path")"
    
    if ! command -v aws &> /dev/null; then
        error "AWS CLI not found. Install it or disable remote backup."
    fi
    
    log "Uploading backup to S3: s3://${S3_BUCKET}/${s3_key}"
    AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
    AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
    aws s3 cp "$file_path" "s3://${S3_BUCKET}/${s3_key}" \
        --region "$S3_REGION" \
        --storage-class STANDARD_IA \
        --server-side-encryption AES256 2>>"$LOG_FILE" || error "S3 upload failed"
    
    log "Backup uploaded to S3 successfully"
}

# Main backup function
backup_redis() {
    local backup_name="redis_db${REDIS_DB}_${TIMESTAMP}"
    local backup_path="${BACKUP_DIR}/${backup_name}"
    local rdb_file="${backup_path}.rdb"
    local compressed_file="${rdb_file}.${COMPRESSION}"
    local encrypted_file="${compressed_file}.enc"
    
    log "Starting Redis backup for database: $REDIS_DB"
    
    # Trigger BGSAVE to create RDB file
    log "Triggering BGSAVE..."
    $REDIS_CMD BGSAVE >> "$LOG_FILE" 2>&1
    
    # Wait for BGSAVE to complete
    local bgsave_in_progress=1
    local max_wait=300  # 5 minutes max wait
    local waited=0
    while [ $bgsave_in_progress -eq 1 ] && [ $waited -lt $max_wait ]; do
        sleep 2
        waited=$((waited + 2))
        bgsave_in_progress=$($REDIS_CMD LASTSAVE | awk '{if ($1 == lastsave) print 1; else print 0; lastsave=$1}' || echo 1)
        if ! $REDIS_CMD INFO persistence | grep -q "rdb_bgsave_in_progress:1"; then
            bgsave_in_progress=0
        fi
    done
    
    if [ $waited -ge $max_wait ]; then
        error "BGSAVE timeout. Backup may be incomplete."
    fi
    
    log "BGSAVE completed"
    
    # Get RDB file location from Redis
    local rdb_path=$($REDIS_CMD CONFIG GET dir | tail -1)/$($REDIS_CMD CONFIG GET dbfilename | tail -1)
    
    # Copy RDB file to backup location
    if [ -f "$rdb_path" ]; then
        cp "$rdb_path" "$rdb_file" || error "Failed to copy RDB file"
        log "RDB file copied: $rdb_file"
    else
        # Alternative: Use redis-cli --rdb to create backup directly
        log "Using redis-cli --rdb for backup..."
        $REDIS_CMD --rdb "$rdb_file" 2>>"$LOG_FILE" || error "Failed to create RDB backup"
        log "RDB backup created: $rdb_file"
    fi
    
    # Compress backup
    case "$COMPRESSION" in
        gzip)
            gzip -f "$rdb_file" && rdb_file="${rdb_file}.gz"
            ;;
        bzip2)
            bzip2 -f "$rdb_file" && rdb_file="${rdb_file}.bz2"
            ;;
        xz)
            xz -f "$rdb_file" && rdb_file="${rdb_file}.xz"
            ;;
        none)
            ;;
        *)
            error "Unknown compression type: $COMPRESSION"
            ;;
    esac
    
    log "Backup compressed: $rdb_file"
    
    # Encrypt backup
    encrypt_backup "$rdb_file" "$encrypted_file"
    
    # Calculate checksum for integrity verification (SHA-256)
    local checksum_file="${encrypted_file}.sha256"
    sha256sum "$encrypted_file" > "$checksum_file"
    log "Checksum generated: $checksum_file"
    
    # Upload to remote storage if enabled
    if [ "$REMOTE_STORAGE_ENABLED" = "true" ]; then
        case "$REMOTE_STORAGE_TYPE" in
            s3)
                upload_to_s3 "$encrypted_file"
                upload_to_s3 "$checksum_file"
                ;;
            *)
                log "WARNING: Unknown remote storage type: $REMOTE_STORAGE_TYPE"
                ;;
        esac
    fi
    
    log "Backup completed for Redis database: $REDIS_DB"
    echo "$encrypted_file"
}

# Main execution
log "=== Redis Backup Started ==="
log "Backup directory: $BACKUP_DIR"
log "Retention days: $RETENTION_DAYS"
log "Redis host: $REDIS_HOST:$REDIS_PORT"
log "Redis database: $REDIS_DB"

# Perform backup
backup_file=$(backup_redis)

# Cleanup old backups (local)
log "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "redis_*.enc" -type f -mtime +$RETENTION_DAYS -delete 2>>"$LOG_FILE" || true
find "$BACKUP_DIR" -name "*.sha256" -type f -mtime +$RETENTION_DAYS -delete 2>>"$LOG_FILE" || true
log "Cleanup completed"

log "=== Redis Backup Completed ==="
log "Backup file: $backup_file"

exit 0

