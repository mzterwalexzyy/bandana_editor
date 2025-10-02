const fileInput = document.getElementById('fileInput');
const pfpImage = document.getElementById('pfp-image');
const wrapper = document.getElementById('bandana-wrapper');
const bandana = document.getElementById('bandana-overlay');
const handle = document.getElementById('resize-handle');
const editor = document.getElementById('editor-container');
const downloadButton = document.getElementById('downloadButton');
const positionDisplay = document.getElementById('positionDisplay');

const rotateSlider = document.getElementById('rotateSlider');
const skewXSlider = document.getElementById('skewXSlider');
const skewYSlider = document.getElementById('skewYSlider');

let isPfpLoaded = false;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let isResizing = false;
let keysPressed = {};
let step = 10;

// --- Clamp function to keep wrapper inside container ---
function clampPosition(x, y) {
    // FIX: Use the wrapper's dimensions (wrapper.offsetWidth/Height)
    // because the 'wrapper' is the element being positioned via left/top.
    const maxX = editor.clientWidth - wrapper.offsetWidth;
    const maxY = editor.clientHeight - wrapper.offsetHeight;

    return {
        x: Math.max(0, Math.min(x, maxX)),
        y: Math.max(0, Math.min(y, maxY))
    };
}

// --- Update transform (rotate + skew) ---
function updateTransform() {
    const r = rotateSlider.value;
    const sx = skewXSlider.value;
    const sy = skewYSlider.value;
    bandana.style.transform = `rotate(${r}deg) skewX(${sx}deg) skewY(${sy}deg)`;
    updateDisplay();
}
rotateSlider.addEventListener('input', updateTransform);
skewXSlider.addEventListener('input', updateTransform);
skewYSlider.addEventListener('input', updateTransform);

// --- Upload PFP ---
fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        pfpImage.src = ev.target.result;
        isPfpLoaded = true;
        downloadButton.disabled = false;
        wrapper.style.opacity = 1;
        
        // FIX: Ensure initial sizing is set for the wrapper to guarantee correct offsetWidth/Height for clamping.
        // We set a default width of 80% of the editor width, then calculate height based on the bandana's aspect ratio.
        const initialBandanaWidth = editor.clientWidth * 0.8; 
        const initialBandanaHeight = initialBandanaWidth * (bandana.naturalHeight / bandana.naturalWidth);
        
        wrapper.style.width = initialBandanaWidth + 'px';
        wrapper.style.height = initialBandanaHeight + 'px';
        // Set the inner image to fill the wrapper
        bandana.style.width = '100%'; 
        bandana.style.height = '100%';


        // Initialize position based on the now-set wrapper dimensions
        wrapper.style.left = (editor.clientWidth - wrapper.offsetWidth) / 2 + 'px';
        wrapper.style.top = (editor.clientHeight * 0.075) + 'px';
        updateDisplay();
    };
    reader.readAsDataURL(file);
});

// --- Dragging ---
wrapper.addEventListener('mousedown', e => {
    if (e.target === handle) return;
    if (!isPfpLoaded) return;

    isDragging = true;

    const containerRect = editor.getBoundingClientRect();

    // Mouse offset relative to container + current wrapper position
    dragOffset.x = e.clientX - containerRect.left - wrapper.offsetLeft;
    dragOffset.y = e.clientY - containerRect.top - wrapper.offsetTop;

    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', endDrag);
});

// Touch support
wrapper.addEventListener('touchstart', e => {
    if (!isPfpLoaded) return;
    // CRITICAL FIX: Prevent default scrolling behavior on touchstart to allow vertical dragging
    e.preventDefault(); 
    isDragging = true;
    const touch = e.touches[0];
    const containerRect = editor.getBoundingClientRect();
    dragOffset.x = touch.clientX - containerRect.left - wrapper.offsetLeft;
    dragOffset.y = touch.clientY - containerRect.top - wrapper.offsetTop;

    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', endTouch);
});

function onDrag(e) {
    if (!isDragging) return;

    const containerRect = editor.getBoundingClientRect();
    let newX = e.clientX - containerRect.left - dragOffset.x;
    let newY = e.clientY - containerRect.top - dragOffset.y;

    const pos = clampPosition(newX, newY);
    wrapper.style.left = pos.x + 'px';
    wrapper.style.top = pos.y + 'px';
    updateDisplay();
}

function onTouchMove(e) {
    e.preventDefault();
    if (!isDragging) return;
    const touch = e.touches[0];
    const containerRect = editor.getBoundingClientRect();
    let newX = touch.clientX - containerRect.left - dragOffset.x;
    let newY = touch.clientY - containerRect.top - dragOffset.y;

    const pos = clampPosition(newX, newY);
    wrapper.style.left = pos.x + 'px';
    wrapper.style.top = pos.y + 'px';
    updateDisplay();
}

function endDrag() {
    isDragging = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);
}

function endTouch() {
    isDragging = false;
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', endTouch);
}

// --- Resizing ---
handle.addEventListener('mousedown', e => {
    e.stopPropagation();
    if (!isPfpLoaded) return;
    isResizing = true;
    document.addEventListener('mousemove', onResize);
    document.addEventListener('mouseup', endResize);
});

function onResize(e) {
    if (!isResizing) return;
    const rect = wrapper.getBoundingClientRect();
    let newWidth = e.clientX - rect.left;
    const aspect = bandana.naturalHeight / bandana.naturalWidth;
    let newHeight = newWidth * aspect;

    // Clamp newWidth/newHeight based on container size AND current wrapper position
    newWidth = Math.max(50, Math.min(newWidth, editor.clientWidth - wrapper.offsetLeft));
    newHeight = Math.max(50 * aspect, Math.min(newHeight, editor.clientHeight - wrapper.offsetTop));

    // FIX: Set the wrapper's dimensions. This is CRITICAL for clampPosition to work after resize.
    wrapper.style.width = newWidth + 'px';
    wrapper.style.height = newHeight + 'px';

    // The inner bandana image is now sized via its wrapper (using 100% width/height)
    bandana.style.width = '100%'; 
    bandana.style.height = '100%';


    const pos = clampPosition(wrapper.offsetLeft, wrapper.offsetTop);
    wrapper.style.left = pos.x + 'px';
    wrapper.style.top = pos.y + 'px';
    updateDisplay();
}

function endResize() {
    isResizing = false;
    document.removeEventListener('mousemove', onResize);
    document.removeEventListener('mouseup', endResize);
}

// --- Keyboard movement ---
document.addEventListener('keydown', e => keysPressed[e.key] = true);
document.addEventListener('keyup', e => keysPressed[e.key] = false);

function handleKeyboard() {
    if (!isPfpLoaded) return;
    if (document.activeElement === fileInput) return;

    let dx = (keysPressed['ArrowRight'] ? step : 0) - (keysPressed['ArrowLeft'] ? step : 0);
    let dy = (keysPressed['ArrowDown'] ? step : 0) - (keysPressed['ArrowUp'] ? step : 0);

    if (dx !== 0 || dy !== 0) {
        const pos = clampPosition(wrapper.offsetLeft + dx, wrapper.offsetTop + dy);
        wrapper.style.left = pos.x + 'px';
        wrapper.style.top = pos.y + 'px';
        updateDisplay();
    }

    requestAnimationFrame(handleKeyboard);
}
handleKeyboard();

// --- Display ---
function updateDisplay() {
    // Display the wrapper's size and position
    positionDisplay.textContent = `X:${Math.round(wrapper.offsetLeft)}, Y:${Math.round(wrapper.offsetTop)}, W:${Math.round(wrapper.offsetWidth)}, H:${Math.round(wrapper.offsetHeight)}, R:${rotateSlider.value}°, SX:${skewXSlider.value}°, SY:${skewYSlider.value}°`;
}

// --- Download ---
downloadButton.addEventListener('click', () => {
    if (!isPfpLoaded) return;

    const canvas = document.createElement('canvas');
    canvas.width = editor.clientWidth;
    canvas.height = editor.clientHeight;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(pfpImage, 0, 0, canvas.width, canvas.height);

    const x = wrapper.offsetLeft;
    const y = wrapper.offsetTop;
    const w = wrapper.offsetWidth; // Use wrapper dimensions for drawing
    const h = wrapper.offsetHeight; // Use wrapper dimensions for drawing

    ctx.save();
    // Translate to the center of the wrapper for rotation/skewing
    ctx.translate(x + w / 2, y + h / 2); 
    
    const r = rotateSlider.value * Math.PI / 180;
    const sx = Math.tan(skewXSlider.value * Math.PI / 180);
    const sy = Math.tan(skewYSlider.value * Math.PI / 180);

    // Apply skew and rotation
    ctx.transform(1, sy, sx, 1, 0, 0);
    ctx.rotate(r);
    
    // Draw the image centered at the translated point (which is now 0, 0)
    ctx.drawImage(bandana, -w / 2, -h / 2, w, h);
    ctx.restore();

    canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'custom-bandana-pfp.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 'image/png');
});
