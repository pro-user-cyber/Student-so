// js/storage.js - Virtual Drive Engine
class VirtualDrive {
    constructor() {
        this.files = JSON.parse(localStorage.getItem('virtual_drive_v2') || '[]');
        this.maxStorage = 50 * 1024 * 1024; // 50MB
        this.currentDir = '/';
        this.init();
    }

    init() {
        this.validateFiles();
        this.save();
    }

    // Validate and clean up corrupted file entries
    validateFiles() {
        this.files = this.files.filter(file => {
            try {
                return file.name && file.content !== undefined && file.size !== undefined;
            } catch {
                return false;
            }
        });
    }

    // Get current storage usage
    getStorageUsage() {
        return this.files.reduce((total, file) => total + file.size, 0);
    }

    // Check if there's enough space
    hasSpace(size) {
        return this.getStorageUsage() + size <= this.maxStorage;
    }

    // List files in current directory
    list() {
        return this.files.filter(file => {
            const pathParts = file.path.split('/').filter(Boolean);
            const dirParts = this.currentDir.split('/').filter(Boolean);
            return pathParts.length === dirParts.length + 1 &&
                   pathParts.slice(0, dirParts.length).join('/') === dirParts.join('/');
        });
    }

    // Get file by path
    getFile(path) {
        return this.files.find(file => file.path === path);
    }

    // Create new file
    createFile(name, content, type = 'text/plain') {
        if (!name || !content) {
            throw new Error('Name and content are required');
        }

        const fullPath = this.currentDir === '/' ? `/${name}` : `${this.currentDir}/${name}`;
        const existing = this.getFile(fullPath);

        if (existing) {
            throw new Error(`File "${name}" already exists`);
        }

        const size = new Blob([content]).size;
        if (!this.hasSpace(size)) {
            throw new Error('Insufficient storage space');
        }

        const file = {
            name,
            path: fullPath,
            content,
            type,
            size,
            created: Date.now(),
            modified: Date.now()
        };

        this.files.push(file);
        this.save();
        return file;
    }

    // Read file content
    readFile(name) {
        const fullPath = this.currentDir === '/' ? `/${name}` : `${this.currentDir}/${name}`;
        const file = this.getFile(fullPath);
        
        if (!file) {
            throw new Error(`File "${name}" not found`);
        }

        return file.content;
    }

    // Update file content
    writeFile(name, content) {
        const fullPath = this.currentDir === '/' ? `/${name}` : `${this.currentDir}/${name}`;
        const fileIndex = this.files.findIndex(file => file.path === fullPath);

        if (fileIndex === -1) {
            throw new Error(`File "${name}" not found`);
        }

        const newSize = new Blob([content]).size;
        if (!this.hasSpace(newSize - this.files[fileIndex].size)) {
            throw new Error('Insufficient storage space');
        }

        this.files[fileIndex].content = content;
        this.files[fileIndex].size = newSize;
        this.files[fileIndex].modified = Date.now();
        this.save();
    }

    // Delete file
    deleteFile(name) {
        const fullPath = this.currentDir === '/' ? `/${name}` : `${this.currentDir}/${name}`;
        const fileIndex = this.files.findIndex(file => file.path === fullPath);

        if (fileIndex === -1) {
            throw new Error(`File "${name}" not found`);
        }

        this.files.splice(fileIndex, 1);
        this.save();
    }

    // Create directory
    mkdir(name) {
        if (!name) {
            throw new Error('Directory name is required');
        }

        const fullPath = this.currentDir === '/' ? `/${name}/` : `${this.currentDir}/${name}/`;
        if (this.getFile(fullPath)) {
            throw new Error(`Directory "${name}" already exists`);
        }

        // Create a special directory file
        const dirFile = {
            name,
            path: fullPath,
            content: null,
            type: 'directory',
            size: 0,
            created: Date.now(),
            modified: Date.now()
        };

        this.files.push(dirFile);
        this.save();
    }

    // Change directory
    cd(path) {
        let newDir = path === '..' ? 
            this.currentDir.split('/').slice(0, -2).join('/') + '/' :
            path.startsWith('/') ? path : `${this.currentDir}${path}`;

        // Normalize path
        newDir = newDir.replace(/\/+/g, '/');
        if (!newDir.endsWith('/')) newDir += '/';

        const dirFile = this.getFile(newDir);
        if (!dirFile || dirFile.type !== 'directory') {
            throw new Error(`Directory "${path}" not found`);
        }

        this.currentDir = newDir;
    }

    // Get current directory
    pwd() {
        return this.currentDir;
    }

    // Rename file or directory
    rename(oldName, newName) {
        const oldPath = this.currentDir === '/' ? `/${oldName}` : `${this.currentDir}/${oldName}`;
        const fileIndex = this.files.findIndex(file => file.path === oldPath);

        if (fileIndex === -1) {
            throw new Error(`File "${oldName}" not found`);
        }

        const newPath = this.currentDir === '/' ? `/${newName}` : `${this.currentDir}/${newName}`;
        if (this.getFile(newPath)) {
            throw new Error(`File "${newName}" already exists`);
        }

        this.files[fileIndex].name = newName;
        this.files[fileIndex].path = newPath;
        this.files[fileIndex].modified = Date.now();
        this.save();
    }

    // Save to localStorage
    save() {
        try {
            localStorage.setItem('virtual_drive_v2', JSON.stringify(this.files));
        } catch (e) {
            console.error('Failed to save virtual drive:', e);
        }
    }

    // Clear all files
    clear() {
        this.files = [];
        this.currentDir = '/';
        this.save();
    }

    // Export files as ZIP (requires JSZip library)
    exportAsZip() {
        if (typeof JSZip === 'undefined') {
            throw new Error('JSZip library required for export');
        }

        const zip = new JSZip();
        this.files.forEach(file => {
            if (file.type !== 'directory' && file.content !== null) {
                zip.file(file.path.slice(1), file.content);
            }
        });
        return zip.generateAsync({type: 'blob'});
    }

    // Import files from ZIP (requires JSZip and FileReader)
    async importFromZip(zipFile) {
        if (typeof JSZip === 'undefined') {
            throw new Error('JSZip library required for import');
        }

        const zip = await JSZip.loadAsync(zipFile);
        const files = Object.keys(zip.files).map(path => ({
            name: path.split('/').pop(),
            path: '/' + path.replace(/\/$/, ''),
            content: null,
            type: 'text/plain',
            size: 0,
            created: Date.now(),
            modified: Date.now()
        }));

        for (const file of Object.values(zip.files)) {
            if (!file.dir) {
                const content = await file.async('uint8array');
                const fileInfo = files.find(f => f.path === '/' + file.name);
                if (fileInfo) {
                    fileInfo.content = content;
                    fileInfo.size = content.length;
                }
            }
        }

        // Check total size
        const totalSize = files.reduce((sum, f) => sum + f.size, 0);
        if (!this.hasSpace(totalSize)) {
            throw new Error('Insufficient storage space for import');
        }

        this.files.push(...files);
        this.save();
    }

    // Get storage stats
    getStats() {
        const usage = this.getStorageUsage();
        return {
            total: this.maxStorage,
            used: usage,
            free: this.maxStorage - usage,
            usagePercent: Math.round((usage / this.maxStorage) * 100),
            fileCount: this.files.length,
            currentDir: this.currentDir
        };
    }
}

// Export globally
window.VirtualDrive = VirtualDrive;
