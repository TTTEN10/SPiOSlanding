#!/bin/bash

# MongoDB Restore Script
# Restores encrypted backups of MongoDB databases
# Follows SafePsy security standards: AES-256-GCM decryption

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/mongodb}"
ENCRYPT_KEY="${MONGODB_BACKUP_ENCRYPT_KEY:-}"
COMPRESSION="${MONGODB_BACKUP_COMPRESSION:-gzip}"

# MongoDB Configuration
MONGODB_HOST="${MONGODB_HOST:-localhost}"
MONGODB_PORT="${MONGODB_PORT:-27017}"
MONGODB_USER="${MONGODB_USER:-}"
MONGODB_PASSWORD="${MONGODB_PASSWORD:-}"
MONGODB_AUTH_DB="${MONGODB_AUTH_DB:-admin}"

# Restore Configuration
BACKUP_FILE="${1:-}"
DB_NAME="${2:-}"
DROP_BEFORE_RESTORE="${DROP_BEFORE_RESTORE:-false}"

# Remote storage configuration (optional)
REMOTE_STORAGE_TYPE="${MONGODB_REMOTE_STORAGE_TYPE:-s3}"
S3_BUCKET="${MONGODB_S3_BUCKET:-}"
S3_REGION="${MONGODB_S3_REGION:-us-east-1}"
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}"

# Logging
LOG_FILE="${LOG_FILE:-/var/log/safepsy/restore-mongodb.log}"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" >&2
    exit 1
}

# Verify mongorestore is available
if ! command -v mongorestore &> /dev/null; then
    error "mongorestore not found. Please install MongoDB client tools."
fi

# Verify backup file is provided
if [ -z "$BACKUP_FILE" ]; then
    error "Usage: $0 <backup_file> [database_name]"
fi

# Build MongoDB connection URI
if [ -n "$MONGODB_USER" ] && [ -n "$MONGODB_PASSWORD" ]; then
    MONGODB_URI="mongodb://${MONGODB_USER}:${MONGODB_PASSWORD}@${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_AUTH_DB}"
else
    MONGODB_URI="mongodb://${MONGODB_HOST}:${MONGODB_PORT}"
fi

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
restore_database() {
    local backup_file="$1"
    local db_name="$2"
    
    log "Starting restore for database: $db_name"
    log "Backup file: $backup_file"
    
    # Check if backup file exists (local or S3)
    local local_backup_file=""
    local encrypted_file=""
    local decrypted_file=""
    local decompressed_file=""
    
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
    local decompressed_temp="${temp_dir}/backup.archive"
    
    # Decrypt backup
    decrypt_backup "$encrypted_file" "$decrypted_temp"
    
    # Verify checksum if available
    local checksum_file="${encrypted_file}.sha256"
    if [ -f "$checksum_file" ]; then
        verify_checksum "$encrypted_file"
    fi
    
    # Decompress backup
    decompress_backup "$decrypted_temp" "$decompressed_temp"
    
    # Drop database if requested
    if [ "$DROP_BEFORE_RESTORE" = "true" ]; then
        log "Dropping database: $db_name"
        mongo "$MONGODB_URI" --eval "db.getSiblingDB('$db_name').dropDatabase()" 2>>"$LOG_FILE" || log "WARNING: Failed to drop database (may not exist)"
    fi
    
    # Restore database
    log "Restoring database: $db_name"
    mongorestore \
        --uri="$MONGODB_URI" \
        --db="$db_name" \
        --archive="$decompressed_temp" \
        --gzip 2>>"$LOG_FILE" || error "MongoDB restore failed for database: $db_name"
    
    log "Database restored successfully: $db_name"
    
    # Cleanup temporary files
    rm -rf "$temp_dir"
    if [[ "$backup_file" == s3://* ]]; then
        rm -f "$encrypted_file"
    fi
}

# Main execution
log "=== MongoDB Restore Started ==="
log "Backup file: $BACKUP_FILE"
log "Database: ${DB_NAME:-auto-detect}"

# If database name not provided, try to extract from backup file name
if [ -z "$DB_NAME" ]; then
    DB_NAME=$(basename "$BACKUP_FILE" | sed -n 's/mongodb_\(.*\)_\([0-9]*_[0-9]*\)\.archive\.\(gz\|bz2\|xz\)\.enc/\1/p')
    if [ -z "$DB_NAME" ]; then
        error "Database name not provided and cannot be extracted from backup file name. Please specify database name."
    fi
    log "Extracted database name from backup file: $DB_NAME"
fi

# Perform restore
restore_database "$BACKUP_FILE" "$DB_NAME"

log "=== MongoDB Restore Completed ==="

exit 0

