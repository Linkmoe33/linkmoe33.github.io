// 域名删除记录浏览器
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

    // 检查是否需要考虑凌晨6点更新
    shouldShowTodayFile() {
        const now = new Date();
        const currentHour = now.getHours();
        // 如果当前时间在凌晨6点之前，认为今天的文件还没更新
        return currentHour >= 6;
    }

    // 加载根目录
    async loadRootDirectory() {
        this.currentPath = '';
        this.history = [];
        await this.loadDirectory('');
    }

    // 加载指定目录
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

    // 动态生成目录项目
    async generateDirectoryItems(path) {
        const items = [];
        
        if (path === '') {
            // 根目录 - 显示顶级域名文件夹
            items.push(
                this.createFolderItem('cn', '.cn'),
                this.createFolderItem('中国', '.中国')
            );
        } else {
            const pathParts = path.split('/');
            
            if (pathParts.length === 1) {
                // 域名目录 - 显示年份文件夹
                items.push(...await this.generateYearFolders(path));
            } else if (pathParts.length === 2) {
                // 年份目录 - 显示月份文件夹
                items.push(...await this.generateMonthFolders(path));
            } else if (pathParts.length === 3) {
                // 月份目录 - 显示日期文件
                items.push(...await this.generateDateFiles(path));
            }
        }
        
        // 按名称正序排列
        return items.sort((a, b) => a.name.localeCompare(b.name));
    }

    // 创建文件夹项目
    createFolderItem(name, displayName) {
        return {
            name: name,
            type: 'folder',
            path: this.currentPath ? `${this.currentPath}/${name}` : name,
            displayName: displayName || name
        };
    }

    // 生成年份文件夹
    async generateYearFolders(domainPath) {
        const folders = [];
        const currentYear = new Date().getFullYear();
        
        // 从2025年开始到当前年份
        for (let year = 2025; year <= currentYear; year++) {
            const yearFolder = `${year}年`;
            folders.push(this.createFolderItem(yearFolder, `${year}年`));
        }
        
        return folders;
    }

    // 生成月份文件夹
    async generateMonthFolders(yearPath) {
        const folders = [];
        const pathParts = yearPath.split('/');
        const year = parseInt(pathParts[1]);
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        
        let startMonth = 1;
        let endMonth = 12;
        
        // 如果是2025年，从8月开始
        if (year === 2025) {
            startMonth = 8;
        }
        
        // 如果是当前年份，只显示到当前月份
        if (year === currentYear) {
            endMonth = currentMonth;
        }
        
        for (let month = startMonth; month <= endMonth; month++) {
            const monthFolder = `${month.toString().padStart(2, '0')}月`;
            folders.push(this.createFolderItem(monthFolder, `${month}月`));
        }
        
        return folders;
    }

    // 生成日期文件
    async generateDateFiles(monthPath) {
        const files = [];
        const pathParts = monthPath.split('/');
        const year = parseInt(pathParts[1]);
        const month = parseInt(pathParts[2]);
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const currentDay = currentDate.getDate();
        
        // 计算该月的天数
        const daysInMonth = new Date(year, month, 0).getDate();
        let endDay = daysInMonth;
        
        // 如果是当前年月，考虑凌晨6点更新的逻辑
        if (year === currentYear && month === currentMonth) {
            endDay = this.shouldShowTodayFile() ? currentDay : currentDay - 1;
        }
        
        for (let day = 1; day <= endDay; day++) {
            const fileName = `${day.toString().padStart(2, '0')}日.txt`;
            const filePath = `${monthPath}/${fileName}`;
            
            // 检查文件是否存在
            const fileExists = await this.checkFileExists(filePath);
            
            files.push({
                name: fileName,
                type: 'file',
                path: filePath,
                displayName: `${day}日.txt`,
                date: new Date(year, month - 1, day),
                exists: fileExists
            });
        }
        
        return files;
    }

    // 检查文件是否存在
    async checkFileExists(filePath) {
        try {
            const response = await fetch(filePath, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    // 渲染目录内容
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
                const statusClass = item.exists ? 'file-exists' : 'file-missing';
                const statusText = item.exists ? '有文件' : '无文件';
                const onClick = item.exists ? `onclick="browser.handleItemClick('file', '${item.path}')"` : '';
                
                return `
                    <div class="file-item ${statusClass}" ${onClick}>
                        <div class="item-name">${item.displayName}</div>
                        <div class="item-info">${item.exists ? '可访问' : '文件不存在'}</div>
                        <div class="file-status">${statusText}</div>
                    </div>
                `;
            }
        }).join('');
    }

    // 处理项目点击
    handleItemClick(type, path) {
        if (type === 'folder') {
            this.navigateTo(path);
        } else {
            this.openFile(path);
        }
    }

    // 导航到指定路径
    navigateTo(path) {
        this.history.push(this.currentPath);
        this.loadDirectory(path);
    }

    // 返回上级
    goBack() {
        if (this.history.length > 0) {
            const previousPath = this.history.pop();
            this.loadDirectory(previousPath);
        }
    }

    // 刷新当前目录
    refreshCurrent() {
        this.loadDirectory(this.currentPath);
    }

    // 更新面包屑导航
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

    // 更新控制按钮状态
    updateControls() {
        const backBtn = document.getElementById('backBtn');
        backBtn.disabled = this.history.length === 0;
    }

    // 打开文件 - 修复中文编码问题
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
            
            // 获取ArrayBuffer来处理编码
            const buffer = await response.arrayBuffer();
            const content = await this.decodeFileContent(buffer);
            document.getElementById('fileContent').textContent = content;
            
        } catch (error) {
            console.error('加载文件内容失败:', error);
            document.getElementById('fileContent').textContent = `加载文件内容失败: ${error.message}`;
        }
    }

    // 解码文件内容，处理中文编码
    async decodeFileContent(buffer) {
        // 尝试不同的编码
        const encodings = ['utf-8', 'gbk', 'gb2312', 'big5', 'windows-1252'];
        
        for (let encoding of encodings) {
            try {
                const decoder = new TextDecoder(encoding);
                const content = decoder.decode(buffer);
                
                // 检查内容是否包含中文字符且没有明显的乱码
                if (this.isValidChineseContent(content)) {
                    return content;
                }
            } catch (e) {
                continue;
            }
        }
        
        // 如果所有编码都失败，使用UTF-8作为后备
        return new TextDecoder('utf-8').decode(buffer);
    }

    // 检查内容是否包含有效的中文
    isValidChineseContent(content) {
        // 检查是否包含中文字符
        const hasChinese = /[\u4e00-\u9fa5]/.test(content);
        if (!hasChinese) return true; // 如果没有中文，也认为是有效的
        
        // 检查是否有明显的乱码字符
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

// 初始化应用
const browser = new DomainDeleteBrowser();