// js/storage.js - Virtual Drive Engine
class VirtualDrive {
    constructor() {
        this.files = JSON.parse(localStorage.getItem('virtual_drive_v2') || '[]');
        this.maxStorage = 50 * 1024 * 1024;
        this.init();
    }

    // ... [PASTE THE COMPLETE VirtualDrive CLASS FROM ABOVE] ...
}

// Export globally
window.VirtualDrive = VirtualDrive;
