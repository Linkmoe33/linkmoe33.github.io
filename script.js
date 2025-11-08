document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    const fileInfo = document.getElementById('fileInfo');
    const processBtn = document.getElementById('processBtn');
    const progressArea = document.getElementById('progressArea');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const resultArea = document.getElementById('resultArea');
    const resultText = document.getElementById('resultText');
    const downloadBtn = document.getElementById('downloadBtn');
    
    let selectedFile = null;
    let processedBlob = null;
    
    // 拖放功能
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', function() {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
    
    // 点击上传区域触发文件选择
    uploadArea.addEventListener('click', function() {
        fileInput.click();
    });
    
    // 文件选择处理
    fileInput.addEventListener('change', function() {
        if (this.files.length) {
            handleFile(this.files[0]);
        }
    });
    
    // 处理文件选择
    function handleFile(file) {
        selectedFile = file;
        fileInfo.textContent = `已选择: ${file.name} (${formatFileSize(file.size)})`;
        processBtn.disabled = false;
        
        // 隐藏结果区域
        resultArea.style.display = 'none';
    }
    
    // 处理按钮点击事件
    processBtn.addEventListener('click', function() {
        if (!selectedFile) return;
        
        const operation = document.querySelector('input[name="operation"]:checked').value;
        
        // 显示进度区域
        progressArea.style.display = 'block';
        resultArea.style.display = 'none';
        
        // 处理文件
        if (operation === 'encrypt') {
            encryptFile(selectedFile);
        } else {
            decryptFile(selectedFile);
        }
    });
    
    // 加密文件
    function encryptFile(file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            // 模拟进度更新
            simulateProgress(function() {
                const base64 = btoa(
                    new Uint8Array(e.target.result)
                    .reduce((data, byte) => data + String.fromCharCode(byte), '')
                );
                
                processedBlob = new Blob([base64], { type: 'text/plain' });
                
                // 显示结果
                resultText.textContent = '文件加密成功！';
                resultArea.style.display = 'block';
                progressArea.style.display = 'none';
            });
        };
        
        reader.onerror = function() {
            alert('文件读取失败');
            progressArea.style.display = 'none';
        };
        
        reader.readAsArrayBuffer(file);
    }
    
    // 解密文件
    function decryptFile(file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            // 模拟进度更新
            simulateProgress(function() {
                try {
                    const binaryString = atob(e.target.result);
                    const bytes = new Uint8Array(binaryString.length);
                    
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    
                    processedBlob = new Blob([bytes], { type: 'application/octet-stream' });
                    
                    // 显示结果
                    resultText.textContent = '文件解密成功！';
                    resultArea.style.display = 'block';
                    progressArea.style.display = 'none';
                } catch (error) {
                    progressArea.style.display = 'none';
                    alert('解密失败：文件可能不是有效的Base64格式');
                }
            });
        };
        
        reader.onerror = function() {
            alert('文件读取失败');
            progressArea.style.display = 'none';
        };
        
        reader.readAsText(file);
    }
    
    // 下载处理后的文件
    downloadBtn.addEventListener('click', function() {
        if (!processedBlob) return;
        
        const url = URL.createObjectURL(processedBlob);
        const a = document.createElement('a');
        const operation = document.querySelector('input[name="operation"]:checked').value;
        const extension = operation === 'encrypt' ? '.b64' : '';
        const originalName = selectedFile.name.replace(/\.[^/.]+$/, "");
        
        a.href = url;
        a.download = `${originalName}${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
    
    // 模拟进度条（实际应用中可根据实际进度更新）
    function simulateProgress(callback) {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                callback();
            }
            
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `处理中... ${Math.round(progress)}%`;
        }, 200);
    }
    
    // 格式化文件大小显示
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
});