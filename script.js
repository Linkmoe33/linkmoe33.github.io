// 域名删除记录
class DomainDeleteBrowser {
    constructor() {
        this.currentPath = '';
        this.history = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadRootDirectory();
    }

    setupEventListeners() {
        document.getElementById('backBtn').addEventListener('click', () => this.goBack());
        document.getElementById('homeBtn').addEventListener('click', () => this.loadRootDirectory());
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshCurrent());
        document.getElementById('closeViewer').addEventListener('click', () => this.closeFileViewer());
        
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('overlay')) {
                this.closeFileViewer();
            }
            if (e.target.classList.contains('breadcrumb-item')) {
                const path = e.target.getAttribute('data-path');
                this.navigateTo(path);
            }
        });
    }

    shouldShowTodayFile() {
        const now = new Date();
        const currentHour = now.getHours();
        return currentHour >= 6;
    }

    async loadRootDirectory() {
        this.currentPath = '';
        this.history = [];
        await this.loadDirectory('');
    }

    async loadDirectory(path) {
        try {
            this.showLoading();
            this.currentPath = path;
            
            const items = await this.generateDirectoryItems(path);
            this.renderDirectory(items);
            this.updateBreadcrumb();
            this.updateControls();
            
        } catch (error) {
            console.error('加载目录失败:', error);
            this.showError('加载目录失败');
        }
    }

    async generateDirectoryItems(path) {
        const items = [];
        
        if (path === '') {
            items.push(
                this.createFolderItem('cn', '.cn'),
                this.createFolderItem('中国', '.中国')
            );
        } else {
            const pathParts = path.split('/');
            
            if (pathParts.length === 1) {
                items.push(...await this.generateYearFolders(path));
            } else if (pathParts.length === 2) {
                items.push(...await this.generateMonthFolders(path));
            } else if (pathParts.length === 3) {
                items.push(...await this.generateDateFiles(path));
            }
        }
        
        return items.sort((a, b) => a.name.localeCompare(b.name));
    }

    createFolderItem(name, displayName) {
        return {
            name: name,
            type: 'folder',
            path: this.currentPath ? `${this.currentPath}/${name}` : name,
            displayName: displayName || name
        };
    }

    async generateYearFolders(domainPath) {
        const folders = [];
        const currentYear = new Date().getFullYear();
        
        for (let year = 2025; year <= currentYear; year++) {
            const yearFolder = `${year}年`;
            folders.push(this.createFolderItem(yearFolder, `${year}年`));
        }
        
        return folders;
    }

    async generateMonthFolders(yearPath) {
        const folders = [];
        const pathParts = yearPath.split('/');
        const year = parseInt(pathParts[1]);
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        
        let startMonth = 1;
        let endMonth = 12;
        
        if (year === 2025) {
            startMonth = 8;
        }
        
        if (year === currentYear) {
            endMonth = currentMonth;
        }
        
        for (let month = startMonth; month <= endMonth; month++) {
            const monthFolder = `${month.toString().padStart(2, '0')}月`;
            folders.push(this.createFolderItem(monthFolder, `${month}月`));
        }
        
        return folders;
    }

    async generateDateFiles(monthPath) {
        const files = [];
        const pathParts = monthPath.split('/');
        const year = parseInt(pathParts[1]);
        const month = parseInt(pathParts[2]);
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const currentDay = currentDate.getDate();
        
        const daysInMonth = new Date(year, month, 0).getDate();
        let endDay = daysInMonth;
        
        if (year === currentYear && month === currentMonth) {
            endDay = this.shouldShowTodayFile() ? currentDay : currentDay - 1;
        }
        
        for (let day = 1; day <= endDay; day++) {
            const fileName = `${day.toString().padStart(2, '0')}日.txt`;
            const filePath = `${monthPath}/${fileName}`;
            
            // 直接创建文件项，不检查文件是否存在
            files.push({
                name: fileName,
                type: 'file',
                path: filePath,
                displayName: `${day}日.txt`,
                date: new Date(year, month - 1, day)
            });
        }
        
        return files;
    }

    // 删除 checkFileExists 方法

    renderDirectory(items) {
        const fileList = document.getElementById('fileList');
        const currentPath = document.getElementById('currentPath');
        
        currentPath.textContent = this.currentPath || '根目录';
        
        if (items.length === 0) {
            fileList.innerHTML = `
                <div class="empty-state">
                    <p>此文件夹为空</p>
                </div>
            `;
            return;
        }
        
        fileList.innerHTML = items.map(item => {
            if (item.type === 'folder') {
                return `
                    <div class="folder-item" onclick="browser.handleItemClick('folder', '${item.path}')">
                        <div class="item-name">${item.displayName}</div>
                        <div class="item-info">文件夹</div>
                    </div>
                `;
            } else {
                // 所有文件都可以点击，不显示状态
                return `
                    <div class="file-item file-exists" onclick="browser.handleItemClick('file', '${item.path}')">
                        <div class="item-name">${item.displayName}</div>
                        <div class="item-info">可访问</div>
                        <div class="file-status">有文件</div>
                    </div>
                `;
            }
        }).join('');
    }

    handleItemClick(type, path) {
        if (type === 'folder') {
            this.navigateTo(path);
        } else {
            this.openFile(path);
        }
    }

    navigateTo(path) {
        this.history.push(this.currentPath);
        this.loadDirectory(path);
    }

    goBack() {
        if (this.history.length > 0) {
            const previousPath = this.history.pop();
            this.loadDirectory(previousPath);
        }
    }

    refreshCurrent() {
        this.loadDirectory(this.currentPath);
    }

    updateBreadcrumb() {
        const breadcrumb = document.getElementById('breadcrumb');
        const paths = this.currentPath.split('/').filter(p => p);
        
        let html = '<span class="breadcrumb-item" data-path="">根目录</span>';
        let currentPath = '';
        
        paths.forEach((part, index) => {
            currentPath += (currentPath ? '/' : '') + part;
            const displayName = part.endsWith('年') ? part : 
                              part.endsWith('月') ? part :
                              part === 'cn' ? '.cn' : 
                              part === '中国' ? '.中国' : part;
            
            html += `<span class="breadcrumb-separator">/</span>
                     <span class="breadcrumb-item" data-path="${currentPath}">${displayName}</span>`;
        });
        
        breadcrumb.innerHTML = html;
    }

    updateControls() {
        const backBtn = document.getElementById('backBtn');
        backBtn.disabled = this.history.length === 0;
    }

    async openFile(filePath) {
        try {
            document.getElementById('fileContent').textContent = '加载中...';
            
            if (!document.querySelector('.overlay')) {
                const overlay = document.createElement('div');
                overlay.className = 'overlay';
                document.body.appendChild(overlay);
            }
            
            document.getElementById('fileViewer').classList.remove('hidden');
            document.getElementById('fileName').textContent = filePath.split('/').pop();
            
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error('文件读取失败');
            }
            
            const buffer = await response.arrayBuffer();
            const content = await this.decodeFileContent(buffer);
            document.getElementById('fileContent').textContent = content;
            
        } catch (error) {
            console.error('加载文件内容失败:', error);
            document.getElementById('fileContent').textContent = `加载文件内容失败: ${error.message}`;
        }
    }

    async decodeFileContent(buffer) {
        const encodings = ['utf-8', 'gbk', 'gb2312', 'big5', 'windows-1252'];
        
        for (let encoding of encodings) {
            try {
                const decoder = new TextDecoder(encoding);
                const content = decoder.decode(buffer);
                
                if (this.isValidChineseContent(content)) {
                    return content;
                }
            } catch (e) {
                continue;
            }
        }
        
        return new TextDecoder('utf-8').decode(buffer);
    }

    isValidChineseContent(content) {
        const hasChinese = /[\u4e00-\u9fa5]/.test(content);
        if (!hasChinese) return true;
        
        const hasGarbledChars = /[ÂÃÀÁÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/.test(content);
        
        return hasChinese && !hasGarbledChars;
    }

    closeFileViewer() {
        document.getElementById('fileViewer').classList.add('hidden');
        const overlay = document.querySelector('.overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    showLoading() {
        document.getElementById('fileList').innerHTML = `
            <div class="empty-state">
                <p>加载中...</p>
            </div>
        `;
    }

    showError(message) {
        document.getElementById('fileList').innerHTML = `
            <div class="empty-state">
                <p>${message}</p>
            </div>
        `;
    }
}

const browser = new DomainDeleteBrowser();
