#!/bin/bash

# GPU Image Backup Script
# Creates encrypted backups of GPU Docker images and volumes
# Follows SafePsy security standards: AES-256-GCM encryption

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/gpu-images}"
RETENTION_DAYS="${GPU_BACKUP_RETENTION_DAYS:-30}"
ENCRYPT_KEY="${GPU_BACKUP_ENCRYPT_KEY:-}"
COMPRESSION="${GPU_BACKUP_COMPRESSION:-gzip}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# GPU Image Configuration
GPU_IMAGE_NAMES="${GPU_IMAGE_NAMES:-}"
GPU_CONTAINER_NAMES="${GPU_CONTAINER_NAMES:-}"
GPU_VOLUME_NAMES="${GPU_VOLUME_NAMES:-}"

# Scaleway GPU Instance Configuration (for snapshot backups)
SCALEWAY_ENABLED="${GPU_SCALEWAY_SNAPSHOT_ENABLED:-false}"
SCALEWAY_INSTANCE_IDS="${GPU_SCALEWAY_INSTANCE_IDS:-}"
SCALEWAY_REGION="${SCALEWAY_REGION:-fr-par}"

# Remote storage configuration
REMOTE_STORAGE_ENABLED="${GPU_REMOTE_BACKUP_ENABLED:-true}"
REMOTE_STORAGE_TYPE="${GPU_REMOTE_STORAGE_TYPE:-s3}"
S3_BUCKET="${GPU_S3_BUCKET:-}"
S3_REGION="${GPU_S3_REGION:-us-east-1}"
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}"

# Logging
LOG_FILE="${LOG_FILE:-/var/log/safepsy/backup-gpu-images.log}"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" >&2
    exit 1
}

# Verify docker is available
if ! command -v docker &> /dev/null; then
    error "docker not found. Please install Docker."
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

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
    local s3_key="gpu-backups/$(basename "$file_path")"
    
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

# Function to backup Docker image
backup_docker_image() {
    local image_name="$1"
    local backup_name="gpu_image_$(echo $image_name | tr '/:' '_')_${TIMESTAMP}"
    local backup_path="${BACKUP_DIR}/${backup_name}"
    local tar_file="${backup_path}.tar"
    local compressed_file="${tar_file}.${COMPRESSION}"
    local encrypted_file="${compressed_file}.enc"
    
    log "Backing up Docker image: $image_name"
    
    # Save Docker image to tar file
    docker save "$image_name" -o "$tar_file" 2>>"$LOG_FILE" || error "Failed to save Docker image: $image_name"
    log "Docker image saved: $tar_file"
    
    # Compress backup
    case "$COMPRESSION" in
        gzip)
            gzip -f "$tar_file" && tar_file="${tar_file}.gz"
            ;;
        bzip2)
            bzip2 -f "$tar_file" && tar_file="${tar_file}.bz2"
            ;;
        xz)
            xz -f "$tar_file" && tar_file="${tar_file}.xz"
            ;;
        none)
            ;;
        *)
            error "Unknown compression type: $COMPRESSION"
            ;;
    esac
    
    log "Image compressed: $tar_file"
    
    # Encrypt backup
    encrypt_backup "$tar_file" "$encrypted_file"
    
    # Calculate checksum
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
        esac
    fi
    
    echo "$encrypted_file"
}

# Function to backup Docker volume
backup_docker_volume() {
    local volume_name="$1"
    local backup_name="gpu_volume_${volume_name}_${TIMESTAMP}"
    local backup_path="${BACKUP_DIR}/${backup_name}"
    local tar_file="${backup_path}.tar"
    local compressed_file="${tar_file}.${COMPRESSION}"
    local encrypted_file="${compressed_file}.enc"
    local temp_container="backup-${volume_name}-$$"
    
    log "Backing up Docker volume: $volume_name"
    
    # Create temporary container to access volume
    docker run --rm \
        -v "$volume_name":/data:ro \
        -v "$(dirname "$tar_file")":/backup \
        alpine tar czf "/backup/$(basename "$tar_file")" -C /data . 2>>"$LOG_FILE" || error "Failed to backup volume: $volume_name"
    
    log "Volume backed up: $tar_file"
    
    # Compress backup (already compressed with gzip in tar, but can add extra compression)
    if [ "$COMPRESSION" != "none" ] && [ "$COMPRESSION" != "gzip" ]; then
        case "$COMPRESSION" in
            bzip2)
                bzip2 -f "$tar_file" && tar_file="${tar_file}.bz2"
                ;;
            xz)
                xz -f "$tar_file" && tar_file="${tar_file}.xz"
                ;;
        esac
    fi
    
    # Encrypt backup
    encrypt_backup "$tar_file" "$encrypted_file"
    
    # Calculate checksum
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
        esac
    fi
    
    echo "$encrypted_file"
}

# Function to create Scaleway snapshot (if enabled)
create_scaleway_snapshot() {
    local instance_id="$1"
    
    if [ "$SCALEWAY_ENABLED" != "true" ]; then
        return
    fi
    
    if ! command -v scw &> /dev/null; then
        log "WARNING: Scaleway CLI (scw) not found. Skipping snapshot."
        return
    fi
    
    log "Creating Scaleway snapshot for instance: $instance_id"
    
    local snapshot_name="gpu-backup-${instance_id}-${TIMESTAMP}"
    
    # Create snapshot using Scaleway CLI
    scw instance snapshot create \
        instance-id="$instance_id" \
        name="$snapshot_name" \
        zone="$SCALEWAY_REGION" 2>>"$LOG_FILE" || log "WARNING: Failed to create Scaleway snapshot"
    
    log "Scaleway snapshot created: $snapshot_name"
}

# Main execution
log "=== GPU Image Backup Started ==="
log "Backup directory: $BACKUP_DIR"
log "Retention days: $RETENTION_DAYS"

BACKUP_FILES=()

# Backup Docker images
if [ -n "$GPU_IMAGE_NAMES" ]; then
    log "Backing up Docker images..."
    for image in $GPU_IMAGE_NAMES; do
        backup_file=$(backup_docker_image "$image")
        BACKUP_FILES+=("$backup_file")
    done
else
    log "No GPU images specified for backup"
fi

# Backup Docker volumes
if [ -n "$GPU_VOLUME_NAMES" ]; then
    log "Backing up Docker volumes..."
    for volume in $GPU_VOLUME_NAMES; do
        backup_file=$(backup_docker_volume "$volume")
        BACKUP_FILES+=("$backup_file")
    done
else
    log "No GPU volumes specified for backup"
fi

# Create Scaleway snapshots
if [ "$SCALEWAY_ENABLED" = "true" ] && [ -n "$SCALEWAY_INSTANCE_IDS" ]; then
    log "Creating Scaleway snapshots..."
    for instance_id in $SCALEWAY_INSTANCE_IDS; do
        create_scaleway_snapshot "$instance_id"
    done
fi

# Cleanup old backups (local)
log "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "gpu_*.enc" -type f -mtime +$RETENTION_DAYS -delete 2>>"$LOG_FILE" || true
find "$BACKUP_DIR" -name "*.sha256" -type f -mtime +$RETENTION_DAYS -delete 2>>"$LOG_FILE" || true
log "Cleanup completed"

log "=== GPU Image Backup Completed ==="
log "Total backups created: ${#BACKUP_FILES[@]}"

exit 0

