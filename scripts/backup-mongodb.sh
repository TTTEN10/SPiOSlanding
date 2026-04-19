#!/bin/bash

# MongoDB Backup Script
# Creates encrypted backups of MongoDB databases
# Follows SafePsy security standards: AES-256-GCM encryption

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/mongodb}"
RETENTION_DAYS="${MONGODB_BACKUP_RETENTION_DAYS:-30}"
ENCRYPT_KEY="${MONGODB_BACKUP_ENCRYPT_KEY:-}"
COMPRESSION="${MONGODB_BACKUP_COMPRESSION:-gzip}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# MongoDB Configuration
MONGODB_HOST="${MONGODB_HOST:-localhost}"
MONGODB_PORT="${MONGODB_PORT:-27017}"
MONGODB_USER="${MONGODB_USER:-}"
MONGODB_PASSWORD="${MONGODB_PASSWORD:-}"
MONGODB_AUTH_DB="${MONGODB_AUTH_DB:-admin}"
MONGODB_DATABASES="${MONGODB_DATABASES:-}"

# Remote storage configuration (optional)
REMOTE_STORAGE_ENABLED="${MONGODB_REMOTE_BACKUP_ENABLED:-false}"
REMOTE_STORAGE_TYPE="${MONGODB_REMOTE_STORAGE_TYPE:-s3}"
S3_BUCKET="${MONGODB_S3_BUCKET:-}"
S3_REGION="${MONGODB_S3_REGION:-us-east-1}"
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}"

# Logging
LOG_FILE="${LOG_FILE:-/var/log/safepsy/backup-mongodb.log}"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" >&2
    exit 1
}

# Verify mongodump is available
if ! command -v mongodump &> /dev/null; then
    error "mongodump not found. Please install MongoDB client tools."
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Build MongoDB connection URI
if [ -n "$MONGODB_USER" ] && [ -n "$MONGODB_PASSWORD" ]; then
    MONGODB_URI="mongodb://${MONGODB_USER}:${MONGODB_PASSWORD}@${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_AUTH_DB}"
else
    MONGODB_URI="mongodb://${MONGODB_HOST}:${MONGODB_PORT}"
fi

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
    local s3_key="mongodb-backups/$(basename "$file_path")"
    
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
backup_database() {
    local db_name="$1"
    local backup_name="mongodb_${db_name}_${TIMESTAMP}"
    local backup_path="${BACKUP_DIR}/${backup_name}"
    local archive_file="${backup_path}.archive"
    local compressed_file="${archive_file}.${COMPRESSION}"
    local encrypted_file="${compressed_file}.enc"
    
    log "Starting backup for database: $db_name"
    
    # Create database backup
    mongodump \
        --uri="$MONGODB_URI" \
        --db="$db_name" \
        --archive="$archive_file" \
        --gzip 2>>"$LOG_FILE" || error "MongoDB backup failed for database: $db_name"
    
    log "Backup created: $archive_file"
    
    # Compress if needed (mongodump already uses gzip with --gzip, but we can add extra compression)
    if [ "$COMPRESSION" != "none" ] && [ "$COMPRESSION" != "gzip" ]; then
        case "$COMPRESSION" in
            bzip2)
                bzip2 "$archive_file" && archive_file="${archive_file}.bz2"
                ;;
            xz)
                xz "$archive_file" && archive_file="${archive_file}.xz"
                ;;
        esac
    fi
    
    # Encrypt backup
    encrypt_backup "$archive_file" "$encrypted_file"
    
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
    
    log "Backup completed for database: $db_name"
    echo "$encrypted_file"
}

# Main execution
log "=== MongoDB Backup Started ==="
log "Backup directory: $BACKUP_DIR"
log "Retention days: $RETENTION_DAYS"

# Get list of databases if not specified
if [ -z "$MONGODB_DATABASES" ]; then
    log "No databases specified. Listing all databases..."
    MONGODB_DATABASES=$(mongo "$MONGODB_URI" --quiet --eval "db.adminCommand('listDatabases').databases.forEach(function(d) { print(d.name) })" 2>>"$LOG_FILE" | grep -v -E '^(admin|config|local)$' || echo "")
fi

if [ -z "$MONGODB_DATABASES" ]; then
    error "No databases found or unable to list databases"
fi

# Backup each database
BACKUP_FILES=()
for db in $MONGODB_DATABASES; do
    backup_file=$(backup_database "$db")
    BACKUP_FILES+=("$backup_file")
done

# Cleanup old backups (local)
log "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "mongodb_*.enc" -type f -mtime +$RETENTION_DAYS -delete 2>>"$LOG_FILE" || true
find "$BACKUP_DIR" -name "*.sha256" -type f -mtime +$RETENTION_DAYS -delete 2>>"$LOG_FILE" || true
log "Cleanup completed"

log "=== MongoDB Backup Completed ==="
log "Backed up databases: $MONGODB_DATABASES"
log "Total backups created: ${#BACKUP_FILES[@]}"

exit 0

