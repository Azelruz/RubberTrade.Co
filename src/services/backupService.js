import { triggerBackup } from './apiService';

const BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_KEY = 'last_auto_backup_at';

export const backupService = {
    /**
     * Checks if it's time for an automatic backup and triggers it if necessary.
     */
    checkAndTriggerBackup: async () => {
        try {
            const lastBackupAt = localStorage.getItem(STORAGE_KEY);
            const now = Date.now();

            // If never backed up or more than 24h passed
            if (!lastBackupAt || (now - parseInt(lastBackupAt)) > BACKUP_INTERVAL) {
                console.log('[BackupService] Triggering scheduled daily backup...');
                
                // Set timestamp first to avoid duplicate triggers if the API takes time
                localStorage.setItem(STORAGE_KEY, now.toString());

                const result = await triggerBackup();
                
                if (result.status === 'success') {
                    console.log('[BackupService] Daily backup completed successfully:', result.backup.filename);
                } else {
                    console.error('[BackupService] Daily backup failed:', result.message);
                    // Optionally reset timestamp to retry on next session/mount
                    // localStorage.removeItem(STORAGE_KEY);
                }
            } else {
                const hoursLeft = ((BACKUP_INTERVAL - (now - parseInt(lastBackupAt))) / (1000 * 60 * 60)).toFixed(1);
                console.log(`[BackupService] Next auto-backup in approx ${hoursLeft} hours.`);
            }
        } catch (error) {
            console.error('[BackupService] Error in backup scheduler:', error);
        }
    },

    /**
     * Manually record that a backup happened (e.g. after a manual backup)
     */
    recordBackup: () => {
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
    }
};
