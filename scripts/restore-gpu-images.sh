#!/bin/bash

# GPU Image Restore Script
# Restores encrypted backups of GPU Docker images and volumes
# Follows SafePsy security standards: AES-256-GCM decryption

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/gpu-images}"
ENCRYPT_KEY="${GPU_BACKUP_ENCRYPT_KEY:-}"
COMPRESSION="${GPU_BACKUP_COMPRESSION:-gzip}"

# Restore Configuration
BACKUP_FILE="${1:-}"
RESTORE_TYPE="${2:-image}"  # image, volume, or both
IMAGE_NAME="${3:-}"
VOLUME_NAME="${4:-}"

# Remote storage configuration
REMOTE_STORAGE_TYPE="${GPU_REMOTE_STORAGE_TYPE:-s3}"
S3_BUCKET="${GPU_S3_BUCKET:-}"
S3_REGION="${GPU_S3_REGION:-us-east-1}"
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}"

# Logging
LOG_FILE="${LOG_FILE:-/var/log/safepsy/restore-gpu-images.log}"
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

# Verify backup file is provided
if [ -z "$BACKUP_FILE" ]; then
    error "Usage: $0 <backup_file> [image|volume] [image_name|volume_name]"
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

# Function to restore Docker image
restore_docker_image() {
    local backup_file="$1"
    local image_name="$2"
    
    log "Starting Docker image restore"
    log "Backup file: $backup_file"
    log "Image name: $image_name"
    
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
    local decompressed_temp="${temp_dir}/image.tar"
    
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
    
    # Load Docker image
    log "Loading Docker image..."
    docker load -i "$decompressed_temp" 2>>"$LOG_FILE" || error "Failed to load Docker image"
    
    # Tag image if name provided
    if [ -n "$image_name" ]; then
        local loaded_image=$(docker images --format "{{.Repository}}:{{.Tag}}" | head -1)
        if [ -n "$loaded_image" ]; then
            docker tag "$loaded_image" "$image_name" 2>>"$LOG_FILE" || log "WARNING: Failed to tag image"
            log "Image tagged as: $image_name"
        fi
    fi
    
    log "Docker image restored successfully"
    
    # Cleanup temporary files
    rm -rf "$temp_dir"
    if [[ "$backup_file" == s3://* ]]; then
        rm -f "$encrypted_file"
    fi
}

# Function to restore Docker volume
restore_docker_volume() {
    local backup_file="$1"
    local volume_name="$2"
    
    log "Starting Docker volume restore"
    log "Backup file: $backup_file"
    log "Volume name: $volume_name"
    
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
    local decompressed_temp="${temp_dir}/volume.tar"
    
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
    
    # Create volume if it doesn't exist
    if ! docker volume inspect "$volume_name" &>/dev/null; then
        log "Creating Docker volume: $volume_name"
        docker volume create "$volume_name" 2>>"$LOG_FILE" || error "Failed to create volume"
    fi
    
    # Restore volume from tar
    log "Restoring Docker volume..."
    docker run --rm \
        -v "$volume_name":/data \
        -v "$(dirname "$decompressed_temp")":/backup \
        alpine sh -c "cd /data && tar xzf /backup/$(basename "$decompressed_temp")" 2>>"$LOG_FILE" || error "Failed to restore volume"
    
    log "Docker volume restored successfully"
    
    # Cleanup temporary files
    rm -rf "$temp_dir"
    if [[ "$backup_file" == s3://* ]]; then
        rm -f "$encrypted_file"
    fi
}

# Main execution
log "=== GPU Image Restore Started ==="
log "Backup file: $BACKUP_FILE"
log "Restore type: $RESTORE_TYPE"

# Perform restore based on type
case "$RESTORE_TYPE" in
    image)
        if [ -z "$IMAGE_NAME" ]; then
            error "Image name required for image restore"
        fi
        restore_docker_image "$BACKUP_FILE" "$IMAGE_NAME"
        ;;
    volume)
        if [ -z "$VOLUME_NAME" ]; then
            error "Volume name required for volume restore"
        fi
        restore_docker_volume "$BACKUP_FILE" "$VOLUME_NAME"
        ;;
    *)
        error "Invalid restore type: $RESTORE_TYPE (must be 'image' or 'volume')"
        ;;
esac

log "=== GPU Image Restore Completed ==="

exit 0

