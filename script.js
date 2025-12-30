/**
 * 域名删除记录查看器 - 核心逻辑脚本
 * 功能：动态日期生成、GB2312解码读取、响应式交互
 */

// === 1. 全局配置 ===
const config = {
    tlds: ["中国", "cn"],
    startDate: new Date(2025, 7, 1), // 起始日期：2025年8月1日 (月份索引0-11)
    updateHour: 6 // 每天北京时间 06:00 更新
};

// === 2. DOM 元素获取 ===
const treeRoot = document.getElementById('file-tree');
const contentArea = document.getElementById('content-area');
const breadcrumb = document.getElementById('breadcrumb');
const sidebar = document.getElementById('sidebar');
const menuBtn = document.getElementById('menu-btn');
const overlay = document.getElementById('sidebar-overlay');

// === 3. 初始化与事件监听 ===

// 手机端菜单开关
if (menuBtn && overlay) {
    const toggleSidebar = () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
    };
    menuBtn.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);
}

/**
 * 4. 核心日期生成逻辑
 * 逻辑：从2025-08-01开始，如果当前时间未到06:00，则不显示当天的文件
 */
function generateDateTree() {
    const data = {};
    config.tlds.forEach(tld => data[tld] = {});

    let currentDate = new Date(config.startDate);
    
    // 获取当前时间判定截止日期
    const now = new Date();
    const deadlineDate = new Date(now);
    
    // 如果当前小时数小于 6点，则日期上限设为昨天
    if (now.getHours() < config.updateHour) {
        deadlineDate.setDate(now.getDate() - 1);
    }
    deadlineDate.setHours(23, 59, 59, 999);

    // 循环生成直到截止日期
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
            // 避免重复（逻辑保险）
            if (!data[tld][yearKey][monthKey].includes(fileName)) {
                data[tld][yearKey][monthKey].push(fileName);
            }
        });

        currentDate.setDate(currentDate.getDate() + 1);
    }
    return data;
}

/**
 * 5. 递归渲染树形结构
 */
function renderTree(nodeData, parentElement, currentPath) {
    if (Array.isArray(nodeData)) {
        // 渲染文件节点
        nodeData.sort().reverse().forEach(fileName => { // 最新的日期排在前面
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

    // 渲染目录节点（年份、月份）
    const keys = Object.keys(nodeData).sort((a, b) => parseInt(b) - parseInt(a)); // 倒序排列，方便查看近期

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

        // 默认展开顶级域名
        if (currentPath === "") li.classList.add('expanded');

        renderTree(nodeData[key], ul, newPath);
    });
}

/**
 * 6. 加载并解码文件内容
 */
window.loadFile = function(filePath, fileName, element) {
    // 手机端选完后自动收起侧边栏
    if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
    }

    // 更新 UI 选中状态
    document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    breadcrumb.textContent = filePath.replace(/^\./, '');

    contentArea.innerHTML = `<div class="status-msg">正在加载 ${fileName}...</div>`;

    fetch(filePath)
        .then(response => {
            if (!response.ok) throw new Error(`文件尚未生成或不存在 (${response.status})`);
            return response.arrayBuffer(); // 必须读取为原始二进制
        })
        .then(buffer => {
            const decoder = new TextDecoder('gb2312'); // 核心：按 GB2312 编码解码
            const text = decoder.decode(buffer);
            
            if (!text.trim()) {
                contentArea.innerHTML = `<div class="status-msg">该文件内容为空</div>`;
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

// === 7. 工具函数 ===

function pad(n) { 
    return n.toString().padStart(2, '0'); 
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// === 8. 启动初始化 ===
const treeData = generateDateTree();
renderTree(treeData, treeRoot, "");
