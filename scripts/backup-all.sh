#!/bin/bash

# Unified Backup Script
# Orchestrates backups for MongoDB, Redis, and GPU images
# Follows SafePsy security standards

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${LOG_FILE:-/var/log/safepsy/backup-all.log}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup components (comma-separated: mongodb,redis,gpu)
BACKUP_COMPONENTS="${BACKUP_COMPONENTS:-mongodb,redis,gpu}"

# Logging
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" >&2
    exit 1
}

# Function to run backup script
run_backup() {
    local component="$1"
    local script_name="backup-${component}.sh"
    local script_path="${SCRIPT_DIR}/${script_name}"
    
    if [ ! -f "$script_path" ]; then
        error "Backup script not found: $script_path"
    fi
    
    if [ ! -x "$script_path" ]; then
        chmod +x "$script_path"
    fi
    
    log "Running backup for component: $component"
    "$script_path" 2>&1 | tee -a "$LOG_FILE" || error "Backup failed for component: $component"
    log "Backup completed for component: $component"
}

# Main execution
log "=== Unified Backup Started ==="
log "Timestamp: $TIMESTAMP"
log "Components: $BACKUP_COMPONENTS"
log "Script directory: $SCRIPT_DIR"

# Parse components and run backups
IFS=',' read -ra COMPONENTS <<< "$BACKUP_COMPONENTS"
for component in "${COMPONENTS[@]}"; do
    component=$(echo "$component" | tr -d '[:space:]')
    if [ -n "$component" ]; then
        run_backup "$component"
    fi
done

log "=== Unified Backup Completed ==="
log "All backups completed successfully"

exit 0

