#!/bin/bash

# Redis Restore Script
# Restores encrypted backups of Redis databases
# Follows SafePsy security standards: AES-256-GCM decryption

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/redis}"
ENCRYPT_KEY="${REDIS_BACKUP_ENCRYPT_KEY:-}"
COMPRESSION="${REDIS_BACKUP_COMPRESSION:-gzip}"

# Redis Configuration
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
REDIS_DB="${REDIS_DB:-0}"
REDIS_RDB_PATH="${REDIS_RDB_PATH:-/var/lib/redis/dump.rdb}"

# Restore Configuration
BACKUP_FILE="${1:-}"
FLUSHDB_BEFORE_RESTORE="${FLUSHDB_BEFORE_RESTORE:-false}"

# Remote storage configuration (optional)
REMOTE_STORAGE_TYPE="${REDIS_REMOTE_STORAGE_TYPE:-s3}"
S3_BUCKET="${REDIS_S3_BUCKET:-}"
S3_REGION="${REDIS_S3_REGION:-us-east-1}"
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}"

# Logging
LOG_FILE="${LOG_FILE:-/var/log/safepsy/restore-redis.log}"
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

# Verify backup file is provided
if [ -z "$BACKUP_FILE" ]; then
    error "Usage: $0 <backup_file>"
fi

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

# Function to download from S3
download_from_s3() {
    local s3_key="$1"
    local output_file="$2"
    
    if ! command -v aws &> /dev/null; then
        error "AWS CLI not found. Install it or use local backup file."
    fi
    
    log "Downloading backup from S3: s3://${S3_BUCKET}/${s3_key}"
    AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
    AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
    aws s3 cp "s3://${S3_BUCKET}/${s3_key}" "$output_file" \
        --region "$S3_REGION" 2>>"$LOG_FILE" || error "S3 download failed"
    
    log "Backup downloaded from S3 successfully"
}

# Function to decrypt backup using AES-256-GCM (OpenSSL)
decrypt_backup() {
    local input_file="$1"
    local output_file="$2"
    
    if [ -z "$ENCRYPT_KEY" ]; then
        log "WARNING: Encryption key not set. Assuming backup is not encrypted."
        cp "$input_file" "$output_file"
        return
    fi
    
    # Use OpenSSL with AES-256-GCM (same as app security standards)
    openssl enc -aes-256-gcm -d -pbkdf2 -iter 100000 -in "$input_file" -out "$output_file" -k "$ENCRYPT_KEY" 2>>"$LOG_FILE" || error "Decryption failed"
    log "Backup decrypted using AES-256-GCM"
}

# Function to verify checksum
verify_checksum() {
    local backup_file="$1"
    local checksum_file="${backup_file}.sha256"
    
    if [ ! -f "$checksum_file" ]; then
        log "WARNING: Checksum file not found. Skipping verification."
        return
    fi
    
    log "Verifying backup checksum..."
    sha256sum -c "$checksum_file" 2>>"$LOG_FILE" || error "Checksum verification failed"
    log "Checksum verified successfully"
}

# Function to decompress backup
decompress_backup() {
    local input_file="$1"
    local output_file="$2"
    
    case "$COMPRESSION" in
        gzip)
            gunzip -c "$input_file" > "$output_file" 2>>"$LOG_FILE" || error "Decompression failed"
            ;;
        bzip2)
            bunzip2 -c "$input_file" > "$output_file" 2>>"$LOG_FILE" || error "Decompression failed"
            ;;
        xz)
            xz -dc "$input_file" > "$output_file" 2>>"$LOG_FILE" || error "Decompression failed"
            ;;
        none)
            cp "$input_file" "$output_file"
            ;;
        *)
            error "Unknown compression type: $COMPRESSION"
            ;;
    esac
    
    log "Backup decompressed"
}

# Main restore function
restore_redis() {
    local backup_file="$1"
    
    log "Starting Redis restore"
    log "Backup file: $backup_file"
    
    # Check if backup file exists (local or S3)
    local encrypted_file=""
    
    if [[ "$backup_file" == s3://* ]]; then
        # Download from S3
        local s3_key="${backup_file#s3://*/}"
        local temp_file=$(mktemp)
        download_from_s3 "$s3_key" "$temp_file"
        encrypted_file="$temp_file"
    elif [ -f "$backup_file" ]; then
        encrypted_file="$backup_file"
    else
        error "Backup file not found: $backup_file"
    fi
    
    # Create temporary files
    local temp_dir=$(mktemp -d)
    local decrypted_temp="${temp_dir}/backup.decrypted"
    local decompressed_temp="${temp_dir}/dump.rdb"
    
    # Verify checksum if available
    local checksum_file="${encrypted_file}.sha256"
    if [[ "$backup_file" != s3://* ]] && [ -f "$checksum_file" ]; then
        verify_checksum "$encrypted_file"
    elif [[ "$backup_file" == s3://* ]]; then
        # Download checksum file from S3
        local checksum_s3_key="${s3_key}.sha256"
        local checksum_temp=$(mktemp)
        if AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
           AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
           aws s3 cp "s3://${S3_BUCKET}/${checksum_s3_key}" "$checksum_temp" \
           --region "$S3_REGION" 2>>"$LOG_FILE"; then
            verify_checksum "$encrypted_file"
        fi
    fi
    
    # Decrypt backup
    decrypt_backup "$encrypted_file" "$decrypted_temp"
    
    # Decompress backup
    decompress_backup "$decrypted_temp" "$decompressed_temp"
    
    # Stop Redis (save current state first)
    log "Stopping Redis to restore backup..."
    $REDIS_CMD SAVE 2>>"$LOG_FILE" || log "WARNING: Failed to save Redis state"
    
    # Flush database if requested
    if [ "$FLUSHDB_BEFORE_RESTORE" = "true" ]; then
        log "Flushing database: $REDIS_DB"
        $REDIS_CMD FLUSHDB 2>>"$LOG_FILE" || error "Failed to flush database"
    fi
    
    # Get Redis RDB file location
    local redis_dir=$(dirname "$REDIS_RDB_PATH")
    mkdir -p "$redis_dir"
    
    # Copy RDB file to Redis directory
    log "Copying RDB file to Redis directory: $REDIS_RDB_PATH"
    cp "$decompressed_temp" "$REDIS_RDB_PATH" || error "Failed to copy RDB file"
    chown redis:redis "$REDIS_RDB_PATH" 2>/dev/null || log "WARNING: Failed to change ownership (may need root)"
    chmod 644 "$REDIS_RDB_PATH" 2>>"$LOG_FILE" || true
    
    # Restart Redis (or reload)
    log "Restarting Redis..."
    if systemctl is-active --quiet redis || systemctl is-active --quiet redis-server; then
        systemctl restart redis 2>>"$LOG_FILE" || systemctl restart redis-server 2>>"$LOG_FILE" || log "WARNING: Failed to restart Redis service"
    else
        log "WARNING: Redis service not found. Please restart Redis manually."
    fi
    
    # Wait for Redis to be ready
    sleep 2
    if ! $REDIS_CMD ping &>/dev/null; then
        error "Redis is not responding after restore"
    fi
    
    log "Redis restore completed successfully"
    
    # Cleanup temporary files
    rm -rf "$temp_dir"
    if [[ "$backup_file" == s3://* ]]; then
        rm -f "$encrypted_file"
    fi
}

# Main execution
log "=== Redis Restore Started ==="
log "Backup file: $BACKUP_FILE"
log "Redis host: $REDIS_HOST:$REDIS_PORT"
log "Redis database: $REDIS_DB"

# Perform restore
restore_redis "$BACKUP_FILE"

log "=== Redis Restore Completed ==="

exit 0

