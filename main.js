const PALETTE = [
    { kanji: '赤', name: 'あか', rgb: [230, 0, 18], hex: '#E60012', active: true },
    { kanji: '橙', name: 'だいだい', rgb: [243, 152, 0], hex: '#F39800', active: true },
    { kanji: '黄', name: 'きいろ', rgb: [255, 241, 0], hex: '#FFF100', active: true },
    { kanji: '緑', name: 'みどり', rgb: [0, 153, 68], hex: '#009944', active: true },
    { kanji: '青', name: 'あお', rgb: [0, 104, 183], hex: '#0068B7', active: true },
    { kanji: '水', name: 'みずいろ', rgb: [0, 160, 233], hex: '#00A0E9', active: true },
    { kanji: '紫', name: 'むらさき', rgb: [146, 7, 131], hex: '#920783', active: true },
    { kanji: '桃', name: 'もも', rgb: [228, 0, 127], hex: '#E4007F', active: true },
    { kanji: '茶', name: 'ちゃいろ', rgb: [138, 59, 0], hex: '#8A3B00', active: true },
    { kanji: '黒', name: 'くろ', rgb: [20, 0, 21], hex: '#140015', active: true },
    { kanji: '灰', name: 'はいいろ', rgb: [156, 174, 183], hex: '#9CAEB7', active: true },
    { kanji: '白', name: 'しろ', rgb: [255, 255, 255], hex: '#FFFFFF', active: true },
    { kanji: '肌', name: 'はだいろ', rgb: [241, 196, 165], hex: '#F1C4A5', active: true },
    { kanji: '草', name: 'きみどり', rgb: [143, 195, 31], hex: '#8FC31F', active: true }
];

let originalImage = null;
let mosiacData2D = [];
let blockSummary = [];
let processedCanvas = null;
let usedPalette = [];

// Initialize UI
document.addEventListener('DOMContentLoaded', () => {
    const paletteDisp = document.getElementById('paletteDisplay');
    PALETTE.forEach(p => {
        const div = document.createElement('div');
        div.className = 'palette-item';
        div.style.backgroundColor = p.hex;
        div.textContent = p.kanji;
        // Adjust text color based on background brightness
        const brightness = (p.rgb[0] * 299 + p.rgb[1] * 587 + p.rgb[2] * 114) / 1000;
        div.style.color = brightness > 125 ? '#000' : '#FFF';
        div.title = p.name;

        div.addEventListener('click', () => {
            p.active = !p.active;
            if (p.active) {
                div.classList.remove('disabled');
            } else {
                if (PALETTE.filter(c => c.active).length === 0) {
                    p.active = true;
                    alert('少なくとも1色は選択してください。');
                    return;
                }
                div.classList.add('disabled');
            }
        });

        paletteDisp.appendChild(div);
    });
});

// Drag and drop / File Input
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('imageInput');

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleImageSelect(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        handleImageSelect(e.target.files[0]);
    }
});

function handleImageSelect(file) {
    if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください。');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            originalImage = img;
            dropZone.innerHTML = '<p>✅ 画像が読み込まれました (' + img.width + 'x' + img.height + ')</p>';
            dropZone.style.borderColor = '#10b981'; // Green accent indicating success
            dropZone.style.color = '#10b981';
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Processing
document.getElementById('generateBtn').addEventListener('click', generateMosaic);

function getNearestColor(r, g, b, currentPalette) {
    let minDist = Infinity;
    let best = currentPalette[0];
    for (let p of currentPalette) {
        // Simple Euclidean distance
        const d = (p.rgb[0] - r) ** 2 + (p.rgb[1] - g) ** 2 + (p.rgb[2] - b) ** 2;
        if (d < minDist) {
            minDist = d;
            best = p;
        }
    }
    return best;
}

function generateMosaic() {
    if (!originalImage) return alert("画像をアップロードしてください");

    usedPalette = PALETTE.filter(p => p.active);

    let tileWidth = parseInt(document.getElementById('tileWidth').value) || 100;
    const blockSize = parseInt(document.getElementById('blockSize').value) || 10;

    // Limits based on requirements (up to 2000px width)
    if (tileWidth > 2000) tileWidth = 2000;
    if (tileWidth < 1) tileWidth = parseInt(document.getElementById('tileWidth').value = 100);

    const aspect = originalImage.height / originalImage.width;
    const tileHeight = Math.round(tileWidth * aspect);

    const canvas = document.createElement('canvas');
    canvas.width = tileWidth;
    canvas.height = tileHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Draw and scale down
    ctx.drawImage(originalImage, 0, 0, tileWidth, tileHeight);

    const imgData = ctx.getImageData(0, 0, tileWidth, tileHeight);
    const data = imgData.data;

    mosiacData2D = [];

    for (let y = 0; y < tileHeight; y++) {
        let row = [];
        for (let x = 0; x < tileWidth; x++) {
            const index = (y * tileWidth + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            // map to palette
            const cColor = getNearestColor(r, g, b, usedPalette);

            data[index] = cColor.rgb[0];
            data[index + 1] = cColor.rgb[1];
            data[index + 2] = cColor.rgb[2];
            data[index + 3] = 255;

            row.push(cColor);
        }
        mosiacData2D.push(row);
    }

    ctx.putImageData(imgData, 0, 0);
    processedCanvas = canvas;

    const preview = document.getElementById('mosaicPreview');
    preview.src = canvas.toDataURL('image/png');
    preview.style.display = 'block';

    computeBlockSummary(tileWidth, tileHeight, blockSize, usedPalette);

    document.getElementById('downloadsSection').style.display = 'block';

    // Smooth scroll down to preview on small screens
    preview.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function computeBlockSummary(width, height, blockSize, currentPalette) {
    blockSummary = [];
    const blocksX = Math.ceil(width / blockSize);
    const blocksY = Math.ceil(height / blockSize);

    for (let by = 0; by < blocksY; by++) {
        for (let bx = 0; bx < blocksX; bx++) {
            const blockName = `Block(${bx + 1}-${by + 1})`;
            const counts = {};
            currentPalette.forEach(p => counts[p.kanji] = 0);

            let total = 0;
            const startY = by * blockSize;
            const endY = Math.min((by + 1) * blockSize, height);
            const startX = bx * blockSize;
            const endX = Math.min((bx + 1) * blockSize, width);

            for (let y = startY; y < endY; y++) {
                for (let x = startX; x < endX; x++) {
                    const kanji = mosiacData2D[y][x].kanji;
                    counts[kanji]++;
                    total++;
                }
            }
            // Record boundaries to help humans format it nicely
            const position = `X:${startX + 1}〜${endX}, Y:${startY + 1}〜${endY}`;
            blockSummary.push({ name: blockName, position, total, counts });
        }
    }
}

// Download handlers
document.getElementById('dlImageBtn').addEventListener('click', () => {
    if (!processedCanvas) return;
    const url = processedCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mosaic_image.png';
    a.click();
});

document.getElementById('dlColorMapBtn').addEventListener('click', () => {
    if (mosiacData2D.length === 0) return;

    if (typeof XLSX === 'undefined') {
        alert("Excel出力ライブラリが読み込まれていません。通信環境を確認してください。");
        return;
    }

    const wb = XLSX.utils.book_new();
    const wsData = mosiacData2D.map(row => row.map(c => c.kanji));
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // エクセルの「セルの幅を2」にする設定 (wch: 横幅)
    const colWidths = [];
    for (let i = 0; i < wsData[0].length; i++) {
        colWidths.push({ wch: 2 });
    }
    ws['!cols'] = colWidths;

    // 同じく「セルの高さを正方形に近づける」設定 (hpt: ポイント)
    // エクセルで幅「2」のピクセル数に高さを合わせるため、約15ポイントを指定します。
    // （ご要望がエクセルの表示設定としての「高さ2」の場合は hpt:2 ですが、
    //  それだと見えなくなってしまうため、正方形になるように調整しています）
    const rowHeights = [];
    for (let i = 0; i < wsData.length; i++) {
        rowHeights.push({ hpt: 15 });
    }
    ws['!rows'] = rowHeights;

    XLSX.utils.book_append_sheet(wb, ws, "ColorMap");
    XLSX.writeFile(wb, "mosaic_colormap.xlsx");
});

document.getElementById('dlSummaryBtn').addEventListener('click', () => {
    if (blockSummary.length === 0 || usedPalette.length === 0) return;

    let csv = "ブロック名,位置(画素),合計枚数,";
    csv += usedPalette.map(p => p.kanji + "(" + p.name + ")").join(",") + "\n";

    for (let b of blockSummary) {
        let row = `"${b.name}","${b.position}",${b.total}`;
        for (let p of usedPalette) {
            row += "," + (b.counts[p.kanji] || 0);
        }
        csv += row + "\n";
    }

    downloadTextFile(csv, "mosaic_block_summary.csv");
});

function downloadTextFile(text, filename) {
    // Add UTF-8 BOM so Excel opens it correctly without garbled characters
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
