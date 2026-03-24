const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const lineWidth = document.getElementById('lineWidth');
const shapeSelector = document.getElementById('shapeSelector');
const clearBtn = document.getElementById('clear');
const themeBtn = document.getElementById('theme-toggle');

let isDrawing = false;
let startX, startY;
let snapshot;
let shapes = [];
let undoneShapes = []; 
let selectedShape = null;

let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let resizingCorner = null;
let shapeBeforeResize = null;
let isRotating = false;
let rotationStartAngle = 0;
let shapeStartRotation = 0;

const HANDLE_SIZE = 6;
const ROTATE_DIST = 28;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight - 70;

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 70;
    draw();
});

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < shapes.length; i++) {
        let s = shapes[i];
        ctx.save();

        let cx = s.x + (s.w || 0) / 2;
        let cy = s.y + (s.h || 0) / 2;
        if (s.type === 'brush' || s.type === 'text') {
            cx = s.x; cy = s.y;
        }

        ctx.translate(cx, cy);
        ctx.rotate(s.rotation);
        ctx.translate(-cx, -cy);

        ctx.lineCap = 'round';   
        ctx.lineJoin = 'round';
        ctx.lineWidth = s.lineWidth || 2;
        ctx.strokeStyle = s.color;
        ctx.fillStyle = s.color;

        if (s.type === 'brush') {
            ctx.beginPath();
            ctx.moveTo(s.points[0].x, s.points[0].y);
            for (let j = 1; j < s.points.length; j++) {
                ctx.lineTo(s.points[j].x, s.points[j].y);
            }
            ctx.stroke();
        }
        else if (s.type === 'text') {
            ctx.font = `${s.size}px Inter, sans-serif`;
            ctx.textBaseline = 'top';
            ctx.fillText(s.text, s.x, s.y);
        }
        else if (s.type === 'image') {
            ctx.drawImage(s.img, s.x, s.y, s.w, s.h);
        }
        else if (s.type === 'rect' || s.type === 'square') {
            ctx.strokeRect(s.x, s.y, s.w, s.h);
        }
        else if (s.type === 'circle') {
            let r = Math.min(Math.abs(s.w), Math.abs(s.h)) / 2;
            ctx.beginPath();
            ctx.arc(s.x + s.w / 2, s.y + s.h / 2, r, 0, 2 * Math.PI);
            ctx.stroke();
        }
        else if (s.type === 'triangle') {
            ctx.beginPath();
            ctx.moveTo(s.x + s.w / 2, s.y);
            ctx.lineTo(s.x + s.w, s.y + s.h);
            ctx.lineTo(s.x, s.y + s.h);
            ctx.closePath();
            ctx.stroke();
        }

        ctx.restore();

        if (s === selectedShape) {
            drawHandles(s);
        }
    }
}

function drawHandles(s) {
    if (s.type === 'brush') return; 
    let cx = s.x + s.w / 2;
    let cy = s.y + s.h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(s.rotation);
    ctx.translate(-cx, -cy);
    ctx.strokeStyle = '#0078d7';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(s.x, s.y, s.w, s.h);
    ctx.setLineDash([]);
    let corners = getCorners(s);
    for (let i = 0; i < corners.length; i++) {
        ctx.fillStyle = 'white';
        ctx.strokeRect(corners[i].x - HANDLE_SIZE, corners[i].y - HANDLE_SIZE, HANDLE_SIZE * 2, HANDLE_SIZE * 2);
        ctx.fillRect(corners[i].x - HANDLE_SIZE, corners[i].y - HANDLE_SIZE, HANDLE_SIZE * 2, HANDLE_SIZE * 2);
    }
    ctx.beginPath();
    ctx.moveTo(cx, s.y);
    ctx.lineTo(cx, s.y - ROTATE_DIST);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, s.y - ROTATE_DIST, HANDLE_SIZE + 1, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function getCorners(s) {
    return [
        { name: 'nw', x: s.x,       y: s.y       },
        { name: 'ne', x: s.x + s.w, y: s.y       },
        { name: 'sw', x: s.x,       y: s.y + s.h },
        { name: 'se', x: s.x + s.w, y: s.y + s.h },
    ];
}

function toLocal(s, mx, my) {
    let cx = s.x + (s.w || 0) / 2;
    let cy = s.y + (s.h || 0) / 2;
    let angle = -s.rotation;
    let dx = mx - cx;
    let dy = my - cy;
    return {
        x: dx * Math.cos(angle) - dy * Math.sin(angle) + cx,
        y: dx * Math.sin(angle) + dy * Math.cos(angle) + cy
    };
}

function distBetween(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1)**2 + (y2 - y1)**2);
}

function isMouseInShape(s, mx, my) {
    let local = toLocal(s, mx, my);
    if (s.type === 'brush') return false; 
    if (s.type === 'rect' || s.type === 'square' || s.type === 'image' || s.type === 'text') {
        let w = s.w || s.size; let h = s.h || s.size;
        return local.x >= s.x && local.x <= s.x + (s.w || 100) && local.y >= s.y && local.y <= s.y + (s.h || 30);
    }
    else if (s.type === 'circle') {
        let r = Math.min(Math.abs(s.w), Math.abs(s.h)) / 2;
        return distBetween(local.x, local.y, s.x + s.w / 2, s.y + s.h / 2) <= r;
    }
    return false;
}

function isNearHandle(hx, hy, px, py) {
    return Math.abs(px - hx) <= HANDLE_SIZE + 4 && Math.abs(py - hy) <= HANDLE_SIZE + 4;
}

canvas.addEventListener('mousedown', (e) => {
    let mouseX = e.clientX;
    let mouseY = e.clientY - 70;
    undoneShapes = []; 

    if (shapeSelector.value === 'addImage') {
        addImage(mouseX, mouseY);
        return;
    }

    if (shapeSelector.value === 'text') {
        const input = document.createElement('textarea');
        input.style.position = 'fixed';
        input.style.left = e.clientX + 'px';
        input.style.top = e.clientY + 'px';
        input.style.background = 'transparent';
        input.style.border = '1px dashed ' + colorPicker.value;
        input.style.color = colorPicker.value;
        input.style.font = `${lineWidth.value * 4}px Inter, sans-serif`;
        input.style.outline = 'none';
        input.style.resize = 'none';
        document.body.appendChild(input);
        setTimeout(() => input.focus(), 0);
        input.onblur = () => {
            if (input.value.trim() !== "") {
                shapes.push({
                    type: 'text', text: input.value, x: mouseX, y: mouseY,
                    color: colorPicker.value, rotation: 0, size: lineWidth.value * 4,
                    w: ctx.measureText(input.value).width, h: lineWidth.value * 4
                });
                draw();
                saveCanvas();
            }
            document.body.removeChild(input);
        };
        return;
    }

    if (shapeSelector.value === 'brush') {
        isDrawing = true;
        shapes.push({
            type: 'brush', points: [{ x: mouseX, y: mouseY }],
            color: colorPicker.value, lineWidth: lineWidth.value, rotation: 0, x: mouseX, y: mouseY
        });
        return;
    }

    if (selectedShape) {
        let local = toLocal(selectedShape, mouseX, mouseY);
        let cx = selectedShape.x + selectedShape.w / 2;
        if (isNearHandle(cx, selectedShape.y - ROTATE_DIST, local.x, local.y)) {
            isRotating = true;
            rotationStartAngle = Math.atan2(mouseY - (selectedShape.y + selectedShape.h / 2), mouseX - (selectedShape.x + selectedShape.w / 2));
            shapeStartRotation = selectedShape.rotation;
            return;
        }
        let corners = getCorners(selectedShape);
        for (let i = 0; i < corners.length; i++) {
            if (isNearHandle(corners[i].x, corners[i].y, local.x, local.y)) {
                resizingCorner = corners[i].name;
                shapeBeforeResize = { x: selectedShape.x, y: selectedShape.y, w: selectedShape.w, h: selectedShape.h };
                return;
            }
        }
        if (isMouseInShape(selectedShape, mouseX, mouseY)) {
            isDragging = true;
            dragOffsetX = mouseX - selectedShape.x;
            dragOffsetY = mouseY - selectedShape.y;
            return;
        }
    }

    let clicked = shapes.slice().reverse().find(s => isMouseInShape(s, mouseX, mouseY));
    if (clicked) {
        selectedShape = clicked;
        isDragging = true;
        dragOffsetX = mouseX - selectedShape.x;
        dragOffsetY = mouseY - selectedShape.y;
        draw();
        return;
    }

    selectedShape = null;
    isDrawing = true;
    startX = mouseX;
    startY = mouseY;
    draw();
});

canvas.addEventListener('mousemove', (e) => {
    let mouseX = e.clientX;
    let mouseY = e.clientY - 70;

    if (isRotating && selectedShape) {
        let cx = selectedShape.x + selectedShape.w / 2;
        let cy = selectedShape.y + selectedShape.h / 2;
        selectedShape.rotation = shapeStartRotation + (Math.atan2(mouseY - cy, mouseX - cx) - rotationStartAngle);
        draw();
        return;
    } 
    
    if (resizingCorner && selectedShape) {
        let local = toLocal(selectedShape, mouseX, mouseY);
        let snap = shapeBeforeResize;
        if (resizingCorner === 'se') {
            selectedShape.w = Math.max(10, local.x - snap.x);
            selectedShape.h = Math.max(10, local.y - snap.y);
        } else if (resizingCorner === 'sw') {
            selectedShape.x = local.x;
            selectedShape.w = Math.max(10, (snap.x + snap.w) - local.x);
            selectedShape.h = Math.max(10, local.y - snap.y);
        } else if (resizingCorner === 'ne') {
            selectedShape.y = local.y;
            selectedShape.w = Math.max(10, local.x - snap.x);
            selectedShape.h = Math.max(10, (snap.y + snap.h) - local.y);
        } else if (resizingCorner === 'nw') {
            selectedShape.x = local.x; selectedShape.y = local.y;
            selectedShape.w = Math.max(10, (snap.x + snap.w) - local.x);
            selectedShape.h = Math.max(10, (snap.y + snap.h) - local.y);
        }
        draw();
        return;
    }

    if (isDragging && selectedShape) {
        selectedShape.x = mouseX - dragOffsetX;
        selectedShape.y = mouseY - dragOffsetY;
        draw();
        return;
    }

    if (!isDrawing || shapeSelector.value === 'addImage') return;;

    if (shapeSelector.value === 'brush') {
        shapes[shapes.length - 1].points.push({ x: mouseX, y: mouseY });
        draw();
    } else if (shapeSelector.value !== 'select') {
        draw();
        ctx.strokeStyle = colorPicker.value;
        ctx.lineWidth = lineWidth.value;
        if (shapeSelector.value === 'rect') ctx.strokeRect(startX, startY, mouseX - startX, mouseY - startY);
        else if (shapeSelector.value === 'circle') {
            let r = distBetween(startX, startY, mouseX, mouseY);
            ctx.beginPath(); ctx.arc(startX, startY, r, 0, Math.PI * 2); ctx.stroke();
        }
        else if (shapeSelector.value === 'square') {
            let s = Math.max(Math.abs(mouseX - startX), Math.abs(mouseY - startY));
            ctx.strokeRect(mouseX < startX ? startX - s : startX, mouseY < startY ? startY - s : startY, s, s);
        }
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (isDrawing && 
        shapeSelector.value !== 'brush' && 
        shapeSelector.value !== 'text' && 
        shapeSelector.value !== 'select' && 
        shapeSelector.value !== 'addImage') {
        
        let mouseX = e.clientX;
        let mouseY = e.clientY - 70;
        
        let w = mouseX - startX;
        let h = mouseY - startY;

        if (Math.abs(w) > 5 || Math.abs(h) > 5) {
            let newShape = {
                type: shapeSelector.value,
                color: colorPicker.value,
                lineWidth: lineWidth.value,
                rotation: 0,
                x: startX,
                y: startY,
                w: w,
                h: h
            };

            if (newShape.type === 'square') {
                let side = Math.max(Math.abs(w), Math.abs(h));
                newShape.x = mouseX < startX ? startX - side : startX;
                newShape.y = mouseY < startY ? startY - side : startY;
                newShape.w = side;
                newShape.h = side;
            } 
            else if (newShape.type === 'circle') {
                let r = Math.sqrt(Math.pow(mouseX - startX, 2) + Math.pow(mouseY - startY, 2));
                newShape.x = startX - r;
                newShape.y = startY - r;
                newShape.w = r * 2;
                newShape.h = r * 2;
            }
            else if (newShape.type === 'triangle') {
              
            }

            shapes.push(newShape);
            selectedShape = newShape; 
        }
    }

    
    isDrawing = false;
    isRotating = false;
    isDragging = false;
    resizingCorner = null;
    shapeBeforeResize = null;

    draw();
    saveCanvas();
});

document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (shapes.length > 0) { undoneShapes.push(shapes.pop()); draw(); saveCanvas(); }
    }
    if (e.key === 'Escape') { selectedShape = null; draw(); }
});


function addImage(mouseX, mouseY) {
    const url = prompt("Paste Image URL here:");
    if (!url) return;

    const img = new Image();
    img.crossOrigin = "anonymous"; //for external links
    
    img.onload = function() {
        console.log("Image loaded successfully!");
        const newImage = {
            type: 'image',
            img: img,
            x: mouseX - 100,
            y: mouseY - 100,
            w: 200,
            h: 200,
            rotation: 0
        };
        shapes.push(newImage);
        selectedShape = newImage;
        draw();
        saveCanvas();
    };

    img.onerror = function() {
        alert("Failed to load image. The URL might be broken or blocked by CORS.");
    };

    img.src = url; 
}

function saveCanvas() { localStorage.setItem('shapeshift_save', canvas.toDataURL()); }

clearBtn.addEventListener('click', () => {
    if (confirm('Clear everything?')) { shapes = []; selectedShape = null; draw(); localStorage.removeItem('shapeshift_save'); }
});

themeBtn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    themeBtn.innerHTML = isDark ? 'Dark Mode' : 'Light Mode';
});