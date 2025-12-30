/**
 * 域名删除记录查看器 - 完整脚本
 * 包含：正序逻辑、06:00更新判定、GB2312解码
 */

// === 1. 全局配置 ===
const config = {
    tlds: ["中国", "cn"],
    startDate: new Date(2025, 7, 1), // 起始：2025-08-01 (月份索引从0开始)
    updateHour: 6 // 每天 06:00 更新
};

const treeRoot = document.getElementById('file-tree');
const contentArea = document.getElementById('content-area');
const breadcrumb = document.getElementById('breadcrumb');
const sidebar = document.getElementById('sidebar');
const menuBtn = document.getElementById('menu-btn');
const overlay = document.getElementById('sidebar-overlay');

// === 2. 响应式侧边栏交互 ===
function toggleSidebar() {
    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
    }
}

if (menuBtn) menuBtn.addEventListener('click', toggleSidebar);
if (overlay) overlay.addEventListener('click', toggleSidebar);

// === 3. 日期生成逻辑 (含06:00判定) ===
function pad(n) { return n.toString().padStart(2, '0'); }

function generateDateTree() {
    const data = {};
    config.tlds.forEach(tld => data[tld] = {});

    let currentDate = new Date(config.startDate);
    const now = new Date();
    
    // 判定截止日期
    const deadlineDate = new Date(now);
    if (now.getHours() < config.updateHour) {
        // 如果现在还没到早上6点，截止到昨天
        deadlineDate.setDate(now.getDate() - 1);
    }
    deadlineDate.setHours(23, 59, 59, 999);

    while (currentDate <= deadlineDate) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const day = currentDate.getDate();

        const yearKey = `${year}年`;
        const monthKey = `${pad(month)}月`;
        const fileName = `${pad(day)}日.txt`;

        config.tlds.forEach(tld => {
            if (!data[tld][yearKey]) data[tld][yearKey] = {};
            if (!data[tld][yearKey][monthKey]) data[tld][yearKey][monthKey] = [];
            data[tld][yearKey][monthKey].push(fileName);
        });

        currentDate.setDate(currentDate.getDate() + 1);
    }
    return data;
}

// === 4. 树形结构渲染 (正序排列) ===
function renderTree(nodeData, parentElement, currentPath) {
    if (Array.isArray(nodeData)) {
        // 文件节点正序排序 (01, 02, 03...)
        nodeData.sort().forEach(fileName => {
            const li = document.createElement('li');
            const relPath = `.${currentPath}/${fileName}`;
            
            li.innerHTML = `
                <div class="tree-item" onclick="loadFile('${relPath}', '${fileName}', this)">
                    <span class="caret" style="visibility:hidden"></span>
                    <span class="icon">📄</span>
                    <span>${fileName}</span>
                </div>
            `;
            parentElement.appendChild(li);
        });
        return;
    }

    // 目录节点正序排序 (2025 -> 2026, 08月 -> 09月)
    const keys = Object.keys(nodeData).sort((a, b) => parseInt(a) - parseInt(b));

    keys.forEach(key => {
        const li = document.createElement('li');
        const newPath = `${currentPath}/${key}`;
        
        li.innerHTML = `
            <div class="tree-item folder-item">
                <span class="caret">▶</span>
                <span class="icon">📁</span>
                <span>${key}</span>
            </div>
        `;

        const ul = document.createElement('ul');
        li.appendChild(ul);
        parentElement.appendChild(li);

        li.querySelector('.folder-item').addEventListener('click', (e) => {
            e.stopPropagation();
            li.classList.toggle('expanded');
        });

        // 默认展开顶级域名层级
        if (currentPath === "") li.classList.add('expanded');

        renderTree(nodeData[key], ul, newPath);
    });
}

// === 5. 文件加载逻辑 (GB2312 解码) ===
window.loadFile = function(filePath, fileName, element) {
    // 适配手机：点击后收起侧边栏
    if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
        toggleSidebar();
    }

    // 更新 UI 选中状态
    document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    breadcrumb.textContent = filePath.replace(/^\./, '');

    contentArea.innerHTML = `<div class="status-msg">正在加载 ${fileName}...</div>`;

    fetch(filePath)
        .then(response => {
            if (!response.ok) throw new Error(`文件未找到或尚未更新 (HTTP ${response.status})`);
            return response.arrayBuffer(); // 获取原始二进制数据
        })
        .then(buffer => {
            // 使用 GB2312 解码
            const decoder = new TextDecoder('gb2312');
            const text = decoder.decode(buffer);
            
            if (!text.trim()) {
                contentArea.innerHTML = `<div class="status-msg">该记录文件为空</div>`;
            } else {
                contentArea.innerHTML = `<pre>${escapeHtml(text)}</pre>`;
            }
        })
        .catch(err => {
            contentArea.innerHTML = `
                <div class="status-msg" style="color:#dc3545">
                    读取失败: ${fileName}<br>
                    <small>${err.message}</small>
                </div>`;
        });
};

// === 6. 工具函数 ===
function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// === 7. 初始化程序 ===
function init() {
    const treeData = generateDateTree();
    renderTree(treeData, treeRoot, "");
}

init();
