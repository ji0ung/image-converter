// ===== 이미지 변환기 JavaScript =====

// --- 1. HTML 요소들을 변수에 저장 ---
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const formatSelect = document.getElementById('formatSelect');
const convertBtn = document.getElementById('convertBtn');
const clearBtn = document.getElementById('clearBtn');
const fileList = document.getElementById('fileList');
const resultArea = document.getElementById('resultArea');

// --- 2. 데이터 저장 변수 ---
let selectedFiles = [];        // 선택된 파일들
let checkedIndexes = new Set(); // 체크된 파일 인덱스
let convertedResults = [];     // 변환된 결과 (새로고침 전까지 유지)
const MAX_FILES = 30;

// --- 3. 파일 선택 이벤트 ---
fileInput.addEventListener('change', function(event) {
    handleFiles(event.target.files);
    // input 초기화 (같은 파일 다시 선택 가능하게)
    fileInput.value = '';
});

// --- 4. 드래그 앤 드롭 ---
uploadArea.addEventListener('dragover', function(event) {
    event.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', function() {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', function(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
    handleFiles(event.dataTransfer.files);
});

// --- 5. 파일 처리 함수 ---
function handleFiles(files) {
    const newFiles = Array.from(files);
    const imageFiles = newFiles.filter(file => file.type.startsWith('image/'));

    if (selectedFiles.length + imageFiles.length > MAX_FILES) {
        alert(`최대 ${MAX_FILES}개의 파일만 선택할 수 있습니다.`);
        return;
    }

    // 기존 파일에 새 파일 추가
    const startIndex = selectedFiles.length;
    selectedFiles = [...selectedFiles, ...imageFiles];

    // 새로 추가된 파일들 자동 체크
    imageFiles.forEach((_, i) => {
        checkedIndexes.add(startIndex + i);
    });

    displayFileList();
    updateButtons();
}

// --- 6. 파일 목록 표시 ---
function displayFileList() {
    if (selectedFiles.length === 0) {
        fileList.innerHTML = '';
        return;
    }

    const allChecked = checkedIndexes.size === selectedFiles.length;

    let html = `
        <div class="file-list-header">
            <strong>선택된 파일 (${selectedFiles.length}개)</strong>
            <label class="select-all-wrap">
                <input type="checkbox" id="selectAll" ${allChecked ? 'checked' : ''}>
                전체 선택
            </label>
        </div>
    `;

    selectedFiles.forEach((file, index) => {
        const size = (file.size / 1024).toFixed(1) + ' KB';
        const checked = checkedIndexes.has(index) ? 'checked' : '';
        html += `
            <div class="file-item">
                <input type="checkbox" data-index="${index}" ${checked}>
                <span class="name">${file.name}</span>
                <span class="size">${size}</span>
                <button class="delete-btn" data-index="${index}">×</button>
            </div>
        `;
    });

    fileList.innerHTML = html;

    // 이벤트 연결
    document.getElementById('selectAll').addEventListener('change', toggleSelectAll);
    document.querySelectorAll('.file-item input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', handleCheckbox);
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', handleDelete);
    });
}

// --- 7. 전체 선택/해제 ---
function toggleSelectAll(event) {
    if (event.target.checked) {
        selectedFiles.forEach((_, index) => checkedIndexes.add(index));
    } else {
        checkedIndexes.clear();
    }
    displayFileList();
    updateButtons();
}

// --- 8. 개별 체크박스 처리 ---
function handleCheckbox(event) {
    const index = parseInt(event.target.dataset.index);
    if (event.target.checked) {
        checkedIndexes.add(index);
    } else {
        checkedIndexes.delete(index);
    }
    displayFileList();
    updateButtons();
}

// --- 9. 파일 삭제 ---
function handleDelete(event) {
    const index = parseInt(event.target.dataset.index);
    selectedFiles.splice(index, 1);

    // 인덱스 재조정
    const newChecked = new Set();
    checkedIndexes.forEach(i => {
        if (i < index) newChecked.add(i);
        else if (i > index) newChecked.add(i - 1);
    });
    checkedIndexes = newChecked;

    displayFileList();
    updateButtons();
}

// --- 10. 버튼 상태 업데이트 ---
function updateButtons() {
    convertBtn.disabled = checkedIndexes.size === 0;
    clearBtn.disabled = selectedFiles.length === 0;
}

// --- 11. 전체 삭제 버튼 ---
clearBtn.addEventListener('click', function() {
    selectedFiles = [];
    checkedIndexes.clear();
    displayFileList();
    updateButtons();
});

// --- 12. 변환 버튼 클릭 ---
convertBtn.addEventListener('click', async function() {
    if (checkedIndexes.size === 0) return;

    convertBtn.disabled = true;
    convertBtn.textContent = '변환 중...';
    resultArea.innerHTML = '<div class="loading">이미지 변환 중입니다...</div>';

    const format = formatSelect.value;

    // 체크된 파일만 변환
    const filesToConvert = selectedFiles.filter((_, index) => checkedIndexes.has(index));

    const results = await Promise.all(
        filesToConvert.map(file => convertImage(file, format))
    );

    // 결과 저장 (기존 결과에 추가)
    convertedResults = [...convertedResults, ...results];

    displayResults(format);

    convertBtn.textContent = '선택 파일 변환';
    convertBtn.disabled = checkedIndexes.size === 0;
});

// --- 13. 이미지 변환 함수 ---
function convertImage(file, format) {
    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = function(e) {
            const img = new Image();

            img.onload = function() {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                const mimeType = format === 'webp' ? 'image/webp' : 'image/png';
                const quality = format === 'webp' ? 0.85 : 1;
                const dataUrl = canvas.toDataURL(mimeType, quality);

                resolve({
                    originalName: file.name,
                    originalSize: file.size,
                    dataUrl: dataUrl,
                    newSize: Math.round((dataUrl.length * 3) / 4),
                    format: format
                });
            };

            img.src = e.target.result;
        };

        reader.readAsDataURL(file);
    });
}

// --- 14. 변환 결과 표시 ---
function displayResults(format) {
    if (convertedResults.length === 0) {
        resultArea.innerHTML = '';
        return;
    }

    let html = `
        <div class="result-header">
            <strong>변환 완료! (${convertedResults.length}개)</strong>
        </div>
    `;

    convertedResults.forEach((result, index) => {
        const newName = result.originalName.replace(/\.[^.]+$/, `.${result.format}`);
        const originalKB = (result.originalSize / 1024).toFixed(1);
        const newKB = (result.newSize / 1024).toFixed(1);

        html += `
            <div class="result-item">
                <div class="info">
                    <span class="name">${newName}</span>
                    <span class="sizes">${originalKB}KB → ${newKB}KB</span>
                </div>
                <a href="${result.dataUrl}" download="${newName}">다운로드</a>
            </div>
        `;
    });

    // 전체 다운로드 버튼 (2개 이상일 때)
    if (convertedResults.length >= 2) {
        html += `<button class="download-all" id="downloadAllBtn">전체 다운로드 (ZIP)</button>`;
    }

    resultArea.innerHTML = html;

    // 전체 다운로드 이벤트 연결
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    if (downloadAllBtn) {
        downloadAllBtn.addEventListener('click', downloadAllAsZip);
    }
}

// --- 15. 전체 다운로드 (ZIP) ---
async function downloadAllAsZip() {
    const downloadBtn = document.getElementById('downloadAllBtn');
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'ZIP 생성 중...';

    const zip = new JSZip();

    convertedResults.forEach((result) => {
        const newName = result.originalName.replace(/\.[^.]+$/, `.${result.format}`);
        // Base64 데이터에서 실제 이미지 데이터 추출
        const base64Data = result.dataUrl.split(',')[1];
        zip.file(newName, base64Data, { base64: true });
    });

    const content = await zip.generateAsync({ type: 'blob' });

    // 다운로드 실행
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = 'converted_images.zip';
    link.click();

    downloadBtn.disabled = false;
    downloadBtn.textContent = '전체 다운로드 (ZIP)';
}
