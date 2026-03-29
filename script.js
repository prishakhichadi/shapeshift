const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const lineWidth = document.getElementById('lineWidth');
const opacitySelector = document.getElementById('opacity'); 
const clearBtn = document.getElementById('clear');
const themeBtn = document.getElementById('theme-toggle');
let togglebox=document.querySelector(".toggle-box")
let circle=document.querySelector(".circle")
const checkbox = document.getElementById("checkbox");
const toolButtons = document.querySelectorAll('.tool-btn');
const saveBtn = document.getElementById('saveBtn');

let isDrawing = false;
let startX, startY;
let shapeSelector = { value: 'brush' }; 
let brushStyle = { value: 'solid' }; 
let snapshot;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let shapes = [];
let undoneShapes = []; 
let selectedShape = null;
const HANDLE_SIZE = 8; 
const ROTATE_DIST = 30;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let resizingCorner = null;
let shapeBeforeResize = null;
let isRotating = false;
let rotationStartAngle = 0;
let shapeStartRotation = 0;
let tempTriPoints=[];



const savedData = localStorage.getItem('shapeshift_save_data');

if (savedData) {
    try {
        const parsed = JSON.parse(savedData);
        shapes = parsed.map(s => {
            if (s.type === 'image' && s.imgSrc) {
                const img = new Image();
                img.src = s.imgSrc;
                s.img = img;
                // Redraw once the image actually loads from the URL
                img.onload = () => draw(); 
            }
            return s;
        });
        setTimeout(draw, 100); 
    } catch (e) {
        console.error("Load failed:", e);
    }
}


window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
});

// FUNCTIONS

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    //darkmode

    const isDark = document.body.classList.contains('dark-theme');
    
    ctx.fillStyle = isDark ? '#1e1e1e' : '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < shapes.length; i++) {
        let s = shapes[i];
        ctx.save();
        
        ctx.globalAlpha = (s.opacity !== undefined) ? s.opacity / 100 : 1.0;

        ctx.lineCap = 'round';   
        ctx.lineJoin = 'round';
        ctx.lineWidth = s.lineWidth || 2;
        ctx.strokeStyle = s.color;
        ctx.fillStyle = s.color;

        if (s.dash && s.dash.length > 0) ctx.setLineDash(s.dash);
        else ctx.setLineDash([]);

        //this is for rot of strokes and triangles (if this works)
        let cx = s.x + (s.w || 0) / 2;
        let cy = s.y + (s.h || 0) / 2;
        ctx.translate(cx, cy);
        ctx.rotate(s.rotation || 0);
        ctx.translate(-cx, -cy);

        if (s.type === 'brush') {
            ctx.beginPath();
            ctx.moveTo(s.points[0].x, s.points[0].y);
            for (let j = 1; j < s.points.length; j++) {
                ctx.lineTo(s.points[j].x, s.points[j].y);
            }
            ctx.stroke();
        }

        else if (s.type === 'text') {
            ctx.setLineDash([]); 
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
            ctx.beginPath();
            ctx.arc(s.x + s.w / 2, s.y + s.h / 2, Math.abs(s.w / 2), 0, 2 * Math.PI);
            ctx.stroke();
        }
        else if (s.type === 'triangle') {
            ctx.beginPath();
            ctx.moveTo(s.points[0].x,s.points[0].y);
            ctx.lineTo(s.points[1].x,s.points[1].y);
            ctx.lineTo(s.points[2].x,s.points[2].y);
            ctx.closePath();
            ctx.stroke();

        }    

        ctx.restore();

        if (s === selectedShape) {
            drawHandles(s);
        }
    }

    if (tempTriPoints.length > 0 && shapeSelector.value === 'triangle') {
        ctx.save();
        ctx.strokeStyle = colorPicker.value;
        ctx.setLineDash([5, 5]);

        ctx.beginPath();
        ctx.moveTo(tempTriPoints[0].x, tempTriPoints[0].y);
        for (let i = 0; i < tempTriPoints.length; i++) {
            ctx.lineTo(tempTriPoints[i].x, tempTriPoints[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]); //reset dash for the points

        tempTriPoints.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); 
            ctx.fillStyle = '#0078d7';
            ctx.strokeStyle = '#0078d7';
            ctx.lineWidth = 1;
            ctx.fill();
            ctx.stroke();
    });

        ctx.restore();
    }

}

function drawHandles(s) {

    let cx = s.x + s.w / 2;
    let cy = s.y + s.h / 2;
    ctx.save();
    ctx.globalAlpha = 1.0; //selection handles should be fully visible always
    ctx.translate(cx, cy);
    ctx.rotate(s.rotation || 0);
    ctx.translate(-cx, -cy);

    //go to centre, rotate PAPER to match shape rotation, move backk
    
    ctx.strokeStyle = '#0078d7';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(s.x, s.y, s.w, s.h);
    ctx.setLineDash([]);
    
    let corners = getCorners(s);  //j make a fn that returns corners based on shape type, like x,y coords of 4 corners if rect
    for (let c of corners) {
        ctx.fillStyle = 'white';
        ctx.strokeRect(c.x - HANDLE_SIZE/2, c.y - HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
        ctx.fillRect(c.x - HANDLE_SIZE/2, c.y - HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
    }
    
    ctx.beginPath();
    ctx.moveTo(cx, s.y);
    ctx.lineTo(cx, s.y - ROTATE_DIST);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, s.y - ROTATE_DIST, HANDLE_SIZE/2 + 2, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
}

function toLocal(s, mx, my) {
    let cx = s.x + (s.w || 0) / 2;
    let cy = s.y + (s.h || 0) / 2;
    let angle = -(s.rotation || 0);
    let dx = mx - cx;
    let dy = my - cy;
    return {
        x: dx * Math.cos(angle) - dy * Math.sin(angle) + cx,
        y: dx * Math.sin(angle) + dy * Math.cos(angle) + cy
    };
}

function isMouseInShape(s, mx, my) {

    let local = toLocal(s, mx, my);

    if (s.type === 'brush') {
        return local.x >= s.x - 10 && local.x <= s.x + s.w + 10 && local.y >= s.y - 10 && local.y <= s.y + s.h + 10;
    }
    
    if (s.type === 'circle') {
        let r = Math.abs(s.w / 2);
        let dist = Math.sqrt((local.x - (s.x + s.w / 2))**2 + (local.y - (s.y + s.h / 2))**2);
        return dist <= r;
    }
    return local.x >= s.x && local.x <= s.x + s.w && local.y >= s.y && local.y <= s.y + s.h;
}
//triangle uses rectangle bounding box logic
//(mx,my) is mouse pos in canvas coords

function getCorners(s) {
    return [
        { name: 'nw', x: s.x,y: s.y},
        { name: 'ne', x: s.x + s.w, y: s.y},
        { name: 'sw', x: s.x,y: s.y + s.h },
        { name: 'se', x: s.x + s.w, y: s.y + s.h},
    ];
}

function isNearHandle(hx, hy, px, py) {
    return Math.abs(px - hx) <= HANDLE_SIZE + 5 && Math.abs(py - hy) <= HANDLE_SIZE + 5; //handle (hx, hy) and pointer (px, py)
} //buffer


function addImage(mx, my) {
    const url = prompt("Paste Image URL here:");

    //js doesnt know what url looks like so was taking any input as valid and kept code running so had to define url pattern

    const urlPattern = /^(https?:\/\/)/;

    if (!url || !urlPattern.test(url)) {
        alert("Invalid URL");
        return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous"; //security setting to avoid CORS issues?
    img.onload = () => {
        const newImg = { type: 'image', img: img, x: mx - 100, y: my - 100, w: 200, h: 200};
        shapes.push(newImg);
        selectedShape = newImg;
        draw();
    };
    img.src = url;
}

function saveCanvas() { localStorage.setItem('shapeshift_save_data', JSON.stringify(shapes)); }


function addText(x, y, w, h) {
    const input = document.createElement('textarea');

    input.style.zIndex='2000';

    input.style.position = 'fixed';
    input.style.left = x + 'px';
    input.style.top = y + 'px';
    input.style.width = Math.max(w, 100) + 'px';
    input.style.height = Math.max(h, 40) + 'px';
    
    input.style.color = colorPicker.value;
    input.style.fontSize = lineWidth.value * 5 + 'px';  //using size slider only for font size
    input.style.background = 'transparent';
    input.style.border = '1px dashed #0078d7';
    input.style.outline = 'none';
    
    document.body.appendChild(input);

    input.addEventListener('blur', () => { //called blur cause element loses focus when user clicks away
        if (input.value.trim() !== "") {
            shapes.push({
                type: 'text',
                text: input.value,
                x: x,
                y: y,
                w: input.offsetWidth,
                h: input.offsetHeight,
                size: parseInt(input.style.fontSize),
                color: colorPicker.value,
                opacity: parseInt(opacitySelector.value),
                textAlign:'center'
            });
        }
        input.remove(); 
        draw();
    });
}


function editText(shape) {
    const input = document.createElement('textarea');
    
    input.style.position = 'fixed';
    input.style.left = shape.x + 'px';
    input.style.top = shape.y + 'px';
    input.style.width = shape.w + 'px';
    input.style.height = shape.h + 'px';
    
    input.style.color = shape.color;
    input.style.fontSize = shape.size + 'px';
    input.value = shape.text; 
    
    input.style.background = 'rgba(255, 255, 255, 0.1)';
    input.style.border = '2px solid #0078d7';
    input.style.outline = 'none';
    input.style.zIndex = '5000';
    
    document.body.appendChild(input);
    
    setTimeout(() => {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
    }, 50);

    input.addEventListener('blur', () => {
        if (input.value.trim() !== "") {
            shapes.push({
                ...shape, //orig
                text: input.value,
                w: input.offsetWidth,
                h: input.offsetHeight,
                textAlign:'center'
            });
        }
        input.remove(); 
        draw();
    });
}


function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

//LISTENERS 


clearBtn.addEventListener('click', () => {
    if (confirm('Clear everything?')) {
        shapes = [];        
        undoneShapes = [];   
        selectedShape = null;
        draw();            
    }
});


//imp in general
window.addEventListener('keydown', (e) => {


    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();

        if (e.shiftKey) {

            if (undoneShapes.length > 0) {
                shapes.push(undoneShapes.pop());
            }
        } else {

            if (shapes.length > 0) {
                undoneShapes.push(shapes.pop());
            }
        }
        
        selectedShape = null; 
        draw();
    }


    if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedShape) {
            shapes = shapes.filter(s => s !== selectedShape);
            selectedShape = null;
            draw();
        }
    }
});

canvas.addEventListener('mousedown', (e) => {

    if (e.target.tagName === 'TEXTAREA') return;

    const pos = getMousePos(e);
    let mouseX = pos.x;
    let mouseY = pos.y;

    const isBrushTool = shapeSelector.value === 'brush' || ['solid', 'dashed', 'dotted'].includes(shapeSelector.value);

    if (isBrushTool) {
        isDrawing = true;
        selectedShape = null; 
        
        let dashPattern = []; 
        if (brushStyle.value === 'dashed') dashPattern = [15, 10];
        else if (brushStyle.value === 'dotted') dashPattern = [2, 8];

        shapes.push({
            type: 'brush', 
            points: [{ x: mouseX, y: mouseY }],
            color: colorPicker.value, 
            lineWidth: parseInt(lineWidth.value), 
            opacity: parseInt(opacitySelector.value), 
            dash: dashPattern, 
            x: mouseX, 
            y: mouseY,
            w: 0, 
            h: 0,
            rotation: 0
        });
        draw();
        return; 
    }

    //only runs if Brush is NOT active
    if (selectedShape) {
        let local = toLocal(selectedShape, mouseX, mouseY);
        let cx = selectedShape.x + selectedShape.w / 2;
        let cy = selectedShape.y + selectedShape.h / 2;

        if (isNearHandle(cx, selectedShape.y - ROTATE_DIST, local.x, local.y)) {
            isRotating = true;
            rotationStartAngle = Math.atan2(mouseY - cy, mouseX - cx);
            shapeStartRotation = selectedShape.rotation || 0;
            return;
        }

        let corners = getCorners(selectedShape);
        for (let c of corners) {
            if (isNearHandle(c.x, c.y, local.x, local.y)) {
                resizingCorner = c.name;
                shapeBeforeResize = { x: selectedShape.x, y: selectedShape.y, w: selectedShape.w, h: selectedShape.h };
                return;
            }
        }
    }

    let clicked = [...shapes].reverse().find(s => isMouseInShape(s, mouseX, mouseY));
    if (clicked) {
        selectedShape = clicked;
        isDragging = true;
        dragOffsetX = mouseX - selectedShape.x;
        dragOffsetY = mouseY - selectedShape.y;
        draw();
        return;
    }

    if (shapeSelector.value === 'addImage') {
        showImageUI(mouseX, mouseY); 
        return;
    }

    if (shapeSelector.value === 'triangle') {
        tempTriPoints.push({ x: mouseX, y: mouseY });
        if (tempTriPoints.length === 3) {
            shapes.push({
                type: 'triangle',
                points: [...tempTriPoints],
                color: colorPicker.value,
                lineWidth: parseInt(lineWidth.value),
                opacity: parseInt(opacitySelector.value),
                x: Math.min(...tempTriPoints.map(p => p.x)), //adding bounds for selection
                y: Math.min(...tempTriPoints.map(p => p.y)),
                w: Math.max(...tempTriPoints.map(p => p.x)) - Math.min(...tempTriPoints.map(p => p.x)),
                h: Math.max(...tempTriPoints.map(p => p.y)) - Math.min(...tempTriPoints.map(p => p.y))
            });
            tempTriPoints = [];
        }
        draw();
        return;
    }

    if (shapeSelector.value !== 'select') {
        selectedShape = null;
        isDrawing = true;
        startX = mouseX;
        startY = mouseY;
    }

    draw();
});


canvas.addEventListener('mousemove', (e) => {
    const pos = getMousePos(e);
    let mouseX = pos.x;
    let mouseY = pos.y;

    if (isRotating && selectedShape) {
        let cx = selectedShape.x + selectedShape.w / 2;
        let cy = selectedShape.y + selectedShape.h / 2;
        let currentAngle = Math.atan2(mouseY - cy, mouseX - cx);
        selectedShape.rotation = shapeStartRotation + (currentAngle - rotationStartAngle);
        draw();
        return;
    } 
    
    if (resizingCorner && selectedShape) {
        let local = toLocal(selectedShape, mouseX, mouseY);
        let s = selectedShape;
        let snap = shapeBeforeResize;

        if (resizingCorner === 'se') {
            s.w = Math.max(10, local.x - snap.x); //min size 10x10
            s.h = Math.max(10, local.y - snap.y);
        } else if (resizingCorner === 'sw') {
            s.x = local.x;
            s.w = Math.max(10, (snap.x + snap.w) - local.x);
            s.h = Math.max(10, local.y - snap.y);
        } else if (resizingCorner === 'ne') {
            s.y = local.y;
            s.w = Math.max(10, local.x - snap.x);
            s.h = Math.max(10, (snap.y + snap.h) - local.y);
        } else if (resizingCorner === 'nw') {
            s.x = local.x; s.y = local.y;
            s.w = Math.max(10, (snap.x + snap.w) - local.x);
            s.h = Math.max(10, (snap.y + snap.h) - local.y);
        }

        //just find ratio and scale!!!!

        if (s.points && oldW !== 0 && oldH !== 0) {
            let scaleX = s.w / oldW;
            let scaleY = s.h / oldH;
            s.points.forEach(p => {
                p.x = s.x + (p.x - oldX) * scaleX;
                p.y = s.y + (p.y - oldY) * scaleY;
            });
        }

        draw();
        return;
    }

    if (isDragging && selectedShape) {
        let dx = mouseX - dragOffsetX - selectedShape.x;
        let dy = mouseY - dragOffsetY - selectedShape.y;

        selectedShape.x += dx;
        selectedShape.y += dy;

        if (selectedShape.points) {
            selectedShape.points.forEach(p => {
                p.x += dx;
                p.y += dy;
            });
        }
        draw();
        return;
    }

    if (!isDrawing) return;

    const isBrushTool = shapeSelector.value === 'brush' || ['solid', 'dashed', 'dotted'].includes(shapeSelector.value);

        if (isBrushTool) {
            shapes[shapes.length - 1].points.push({ x: mouseX, y: mouseY });
            draw(); 
            return;
        } 
        else {
            draw(); 

        ctx.globalAlpha = parseInt(opacitySelector.value) / 100;
        ctx.strokeStyle = colorPicker.value;
        ctx.lineWidth = parseInt(lineWidth.value);
        ctx.setLineDash([]); 

        if (shapeSelector.value === 'rect') ctx.strokeRect(startX, startY, mouseX - startX, mouseY - startY);
        else if (shapeSelector.value === 'circle') {
            let r = Math.sqrt((mouseX - startX)**2 + (mouseY - startY)**2);
            ctx.beginPath();
            ctx.arc(startX, startY, r, 0, Math.PI * 2);
            ctx.stroke();
        }
        else if (shapeSelector.value === 'square') {
            let side = Math.max(Math.abs(mouseX - startX), Math.abs(mouseY - startY));
            ctx.strokeRect(mouseX < startX ? startX - side : startX, mouseY < startY ? startY - side : startY, side, side);
        }
        else if (shapeSelector.value === 'triangle') {
            ctx.beginPath();
            ctx.moveTo(startX + (mouseX - startX) / 2, startY); 
            ctx.lineTo(mouseX, mouseY); 
            ctx.lineTo(startX, mouseY); 
            ctx.closePath();
            ctx.stroke();
        }        
        else if (shapeSelector.value === 'text') {
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(startX, startY, mouseX - startX, mouseY - startY);
        }
        ctx.globalAlpha = 1.0; 
    }
});

canvas.addEventListener('mouseup', (e) => {

    const pos = getMousePos(e);
    let mouseX = pos.x;
    let mouseY = pos.y;

    if (isDrawing && shapeSelector.value === 'brush') {
        let lastStroke = shapes[shapes.length - 1];
        if (lastStroke.points.length > 0) {
            let xs = lastStroke.points.map(p => p.x);
            let ys = lastStroke.points.map(p => p.y);
        
            let minX = Math.min(...lastStroke.points.map(p => p.x));
            let maxX = Math.max(...lastStroke.points.map(p => p.x));
            let minY = Math.min(...lastStroke.points.map(p => p.y));
            let maxY = Math.max(...lastStroke.points.map(p => p.y));

            lastStroke.x = minX;
            lastStroke.y = minY;
            lastStroke.w = maxX - minX;
            lastStroke.h = maxY - minY;}

            
    }

    if (isDrawing && !['brush','text', 'select', 'addImage'].includes(shapeSelector.value)) {
        
        
        let dash = (brushStyle.value === 'dashed') ? [15, 10] : (brushStyle.value === 'dotted') ? [2, 8] : [];

        let newShape = {
            type: shapeSelector.value, color: colorPicker.value, lineWidth: parseInt(lineWidth.value),
            opacity: parseInt(opacitySelector.value), 
            rotation: 0, dash: dash, x: startX, y: startY, w: mouseX - startX, h: mouseY - startY
        };

        if (newShape.type === 'square') {
            let s = Math.max(Math.abs(newShape.w), Math.abs(newShape.h));
            newShape.x = mouseX < startX ? startX - s : startX; newShape.y = mouseY < startY ? startY - s : startY;
            newShape.w = s; newShape.h = s;
        } else if (newShape.type === 'circle') {
            let r = Math.sqrt((mouseX - startX)**2 + (mouseY - startY)**2);
            newShape.x = startX - r; newShape.y = startY - r; newShape.w = r * 2; newShape.h = r * 2;
        } else if (newShape.type === 'triangle') {
            newShape.x = Math.min(startX, mouseX); newShape.y = Math.min(startY, mouseY);
            newShape.w = Math.abs(mouseX - startX); newShape.h = Math.abs(mouseY - startY);
        } 
        
        shapes.push(newShape);
        selectedShape = newShape;
    }

    
    if (isDrawing && shapeSelector.value === 'text') {
        const pos = getMousePos(e);
        let mouseX = pos.x;
        let mouseY = pos.y;
        
        addText(startX, startY, mouseX - startX, mouseY - startY);

    }

    isDrawing = isRotating = resizingCorner = isDragging = false;
    draw();
});


if (localStorage.getItem('theme') === 'dark') { //darkmode
    checkbox.checked = true;
    document.body.classList.add('dark-theme');
}

checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
    }
    
    draw();
});



toolButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const parent = btn.parentElement;
        const value = btn.getAttribute('data-shape');

        parent.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        
        if (['solid', 'dashed', 'dotted'].includes(value)) {
            brushStyle.value = value; 
            shapeSelector.value = 'brush'; 
        } else {
            if (value === 'text box') shapeSelector.value = 'text';
            else if (value === 'image') shapeSelector.value = 'addImage';
            else shapeSelector.value = value;
            
            tempTriPoints = [];
        }
        draw(); 
    });
});

//hello

canvas.addEventListener('dblclick',(e) => {
        const pos = getMousePos(e);
        let mouseX = pos.x;
        let mouseY = pos.y;

    let clickedText = [...shapes].reverse().find (s => s.type === 'text' && isMouseInShape(s, mouseX, mouseY));
    //reverse shallow copy only!

    if (clickedText){
        shapes = shapes.filter(s => s !== clickedText);

        editText(clickedText);
        draw();
    }


});


if (saveBtn) {
    saveBtn.onclick = () => {
        localStorage.setItem('shapeshift_save_data', JSON.stringify(shapes));
        
        const originalText = saveBtn.innerText;
        saveBtn.innerText = "Saved!";
        saveBtn.style.background = "#ff5722"; 
        
        setTimeout(() => {
            saveBtn.innerText = originalText;
            saveBtn.style.background = "";
        }, 2000);
    };
}