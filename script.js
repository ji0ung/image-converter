// ===== 이미지 변환기 JavaScript =====
// 이 파일은 이미지 변환의 모든 기능을 담당합니다.

// --- 1. HTML 요소들을 변수에 저장 ---
// document.getElementById()는 HTML에서 해당 id를 가진 요소를 찾아옵니다.
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const formatSelect = document.getElementById('formatSelect');
const convertBtn = document.getElementById('convertBtn');
const fileList = document.getElementById('fileList');
const resultArea = document.getElementById('resultArea');

// --- 2. 선택된 파일들을 저장할 변수 ---
let selectedFiles = [];
const MAX_FILES = 30; // 최대 30개 파일 제한

// --- 3. 파일 선택 이벤트 처리 ---
// 사용자가 파일을 선택하면 이 함수가 실행됩니다.
fileInput.addEventListener('change', function(event) {
    // event.target.files는 선택된 파일들의 목록입니다.
    handleFiles(event.target.files);
});

// --- 4. 드래그 앤 드롭 기능 ---
// 파일을 드래그해서 올려놓을 때의 이벤트들

// 드래그한 파일이 영역 위에 있을 때
uploadArea.addEventListener('dragover', function(event) {
    event.preventDefault(); // 기본 동작 방지
    uploadArea.classList.add('dragover'); // 스타일 변경
});

// 드래그한 파일이 영역을 벗어날 때
uploadArea.addEventListener('dragleave', function() {
    uploadArea.classList.remove('dragover');
});

// 파일을 놓았을 때
uploadArea.addEventListener('drop', function(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
    handleFiles(event.dataTransfer.files); // 드롭된 파일 처리
});

// --- 5. 파일 처리 함수 ---
// 선택된 파일들을 검증하고 목록에 추가합니다.
function handleFiles(files) {
    // 파일 목록을 배열로 변환
    const newFiles = Array.from(files);

    // 이미지 파일만 필터링 (jpg, png, gif, webp 등)
    const imageFiles = newFiles.filter(file => file.type.startsWith('image/'));

    // 최대 개수 확인
    if (selectedFiles.length + imageFiles.length > MAX_FILES) {
        alert(`최대 ${MAX_FILES}개의 파일만 선택할 수 있습니다.`);
        return;
    }

    // 선택된 파일 목록에 추가
    selectedFiles = [...selectedFiles, ...imageFiles];

    // 화면에 파일 목록 표시
    displayFileList();

    // 파일이 있으면 변환 버튼 활성화
    convertBtn.disabled = selectedFiles.length === 0;
}

// --- 6. 파일 목록 화면에 표시 ---
function displayFileList() {
    // 파일이 없으면 빈 문자열
    if (selectedFiles.length === 0) {
        fileList.innerHTML = '';
        return;
    }

    // 파일 목록 HTML 생성
    let html = `<p style="margin-bottom:10px;color:#333;"><strong>선택된 파일 (${selectedFiles.length}개):</strong></p>`;

    selectedFiles.forEach((file, index) => {
        // 파일 크기를 보기 좋게 변환 (KB 단위)
        const size = (file.size / 1024).toFixed(1) + ' KB';
        html += `
            <div class="file-item">
                <span class="name">${file.name}</span>
                <span class="size">${size}</span>
            </div>
        `;
    });

    fileList.innerHTML = html;
}

// --- 7. 변환 버튼 클릭 이벤트 ---
convertBtn.addEventListener('click', async function() {
    // 파일이 없으면 중단
    if (selectedFiles.length === 0) return;

    // 버튼 비활성화 및 로딩 표시
    convertBtn.disabled = true;
    convertBtn.textContent = '변환 중...';
    resultArea.innerHTML = '<div class="loading">이미지 변환 중입니다...</div>';

    // 선택된 형식 가져오기 (webp 또는 png)
    const format = formatSelect.value;

    // 모든 파일 변환 (Promise.all로 병렬 처리)
    const results = await Promise.all(
        selectedFiles.map(file => convertImage(file, format))
    );

    // 결과 표시
    displayResults(results, format);

    // 버튼 원래대로
    convertBtn.textContent = '🔄 변환하기';
    convertBtn.disabled = false;
});

// --- 8. 이미지 변환 함수 (핵심!) ---
// Canvas API를 사용해서 이미지 형식을 변환합니다.
function convertImage(file, format) {
    return new Promise((resolve) => {
        // 1. 파일을 읽기 위한 FileReader 생성
        const reader = new FileReader();

        // 2. 파일 읽기 완료시 실행
        reader.onload = function(e) {
            // 3. 이미지 객체 생성
            const img = new Image();

            // 4. 이미지 로드 완료시 변환 실행
            img.onload = function() {
                // 5. Canvas 생성 (그림판 같은 것)
                const canvas = document.createElement('canvas');
                canvas.width = img.width;   // 원본 너비 유지
                canvas.height = img.height; // 원본 높이 유지

                // 6. Canvas에 이미지 그리기
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                // 7. Canvas를 원하는 형식으로 변환
                // toDataURL은 이미지를 Base64 문자열로 변환합니다.
                const mimeType = format === 'webp' ? 'image/webp' : 'image/png';
                const quality = format === 'webp' ? 0.85 : 1; // WebP는 품질 85%
                const dataUrl = canvas.toDataURL(mimeType, quality);

                // 8. 결과 반환
                resolve({
                    originalName: file.name,
                    originalSize: file.size,
                    dataUrl: dataUrl,
                    newSize: Math.round((dataUrl.length * 3) / 4) // Base64 크기 계산
                });
            };

            // 이미지 소스 설정 (파일 데이터)
            img.src = e.target.result;
        };

        // 파일을 Data URL로 읽기
        reader.readAsDataURL(file);
    });
}

// --- 9. 변환 결과 표시 ---
function displayResults(results, format) {
    let html = `<p style="margin-bottom:10px;color:#28a745;"><strong>✅ 변환 완료! (${results.length}개)</strong></p>`;

    results.forEach((result, index) => {
        // 새 파일명 생성 (확장자 변경)
        const newName = result.originalName.replace(/\.[^.]+$/, `.${format}`);

        // 크기 정보
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

    resultArea.innerHTML = html;
}
