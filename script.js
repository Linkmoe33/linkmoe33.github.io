// === 1. 全局配置与状态 ===
const config = {
    tlds: ["中国", "cn"],
    startDate: new Date(2025, 7, 1) // 2025年8月1日 (月份从0开始)
};

const treeRoot = document.getElementById('file-tree');
const contentArea = document.getElementById('content-area');
const breadcrumb = document.getElementById('breadcrumb');
const sidebar = document.getElementById('sidebar');
const menuBtn = document.getElementById('menu-btn');
const overlay = document.getElementById('sidebar-overlay');

// === 2. 移动端交互逻辑 ===
function toggleSidebar() {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
}

if (menuBtn) menuBtn.addEventListener('click', toggleSidebar);
if (overlay) overlay.addEventListener('click', toggleSidebar);

// === 3. 日期处理逻辑 ===
function pad(n) { 
    return n.toString().padStart(2, '0'); 
}

function generateDateTree() {
    const data = {};
    config.tlds.forEach(tld => data[tld] = {});

    let currentDate = new Date(config.startDate);
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    while (currentDate <= now) {
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

// === 4. 树形结构渲染 ===
function renderTree(nodeData, parentElement, currentPath) {
    if (Array.isArray(nodeData)) {
        nodeData.forEach(fileName => {
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

        if (currentPath === "") li.classList.add('expanded');

        renderTree(nodeData[key], ul, newPath);
    });
}

// === 5. 文件加载 (支持 GB2312) ===
window.loadFile = function(filePath, fileName, element) {
    // 手机端自动收起菜单
    if (window.innerWidth <= 768) {
        toggleSidebar();
    }

    // UI 状态更新
    document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    breadcrumb.textContent = filePath.replace(/^\./, '');

    contentArea.innerHTML = `<div class="status-msg">正在加载 ${fileName}...</div>`;

    fetch(filePath)
        .then(response => {
            if (!response.ok) throw new Error(`文件未找到 (${response.status})`);
            return response.arrayBuffer();
        })
        .then(buffer => {
            const decoder = new TextDecoder('gb2312'); // 处理 GB2312 编码
            const text = decoder.decode(buffer);
            
            if (!text.trim()) {
                contentArea.innerHTML = `<div class="status-msg">文件内容为空</div>`;
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

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// === 6. 初始化执行 ===
const treeData = generateDateTree();
renderTree(treeData, treeRoot, "");
